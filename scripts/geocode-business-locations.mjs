// Preenche latitude/longitude das localizações de empresas a partir do endereço (necessário para o mapa do Guia).
//
// Uso:
//   node scripts/geocode-business-locations.mjs            (SIMULAÇÃO: só mostra o que encontraria)
//   node scripts/geocode-business-locations.mjs --apply    (grava latitude/longitude)
//   Opção: --set="slug=latitude,longitude"  usa coordenadas informadas por você (repetível); têm prioridade sobre a busca
//
// Ordem da busca: endereço com número -> endereço livre -> rua -> CEP -> cidade/estado (o último é aproximado).
//
// Consulta o Nominatim (OpenStreetMap), com 1 requisição por segundo e identificação própria, conforme a política de uso.
// Só envia endereços de empresas publicadas (dados já públicos no perfil). Não sobrescreve coordenadas existentes.
// Lê apps/web/.env.local (nada é impresso). Aborta se a URL não for a do projeto esperado.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const EXPECTED_REF = 'rwvztwsjcjljphqttiws';
const TENANT_ID = '00000000-0000-0000-0000-000000000000'; // tenant canônico da Conexão (não usar ...0010)
const apply = process.argv.includes('--apply');
const manual = new Map(
  process.argv
    .filter((a) => a.startsWith('--set='))
    .map((a) => a.slice(6).split('='))
    .map(([slug, pair]) => [slug, (pair ?? '').split(',').map(Number)])
    .filter(([, c]) => c.length === 2 && c.every(Number.isFinite))
);

const root = path.resolve(import.meta.dirname, '..');
const env = {};
for (const line of fs.readFileSync(path.join(root, 'apps/web/.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(`${EXPECTED_REF}.supabase.co`) || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`Abortado: URL do Supabase diferente do projeto esperado (${EXPECTED_REF}) ou chave ausente.`);
  process.exit(1);
}
const require = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function nominatim(params) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  Object.entries({ format: 'jsonv2', limit: '1', countrycodes: 'br', addressdetails: '0', ...params }).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'ConexaoMaconica-Geocoder/1.0 (+https://conexaomaconica.com.br)', 'Accept-Language': 'pt-BR' } });
  if (!res.ok) throw new Error(`Nominatim respondeu ${res.status}`);
  const data = await res.json();
  await sleep(1100); // no máximo 1 requisição por segundo
  return data[0] ? { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name } : null;
}

const { data: locations, error } = await supabase
  .from('business_locations')
  .select('id, business_id, street, number, neighborhood, city, state, postal_code, latitude, longitude, businesses!inner(name, slug, tenant_id, publication_status, is_active)')
  .eq('businesses.tenant_id', TENANT_ID)
  .eq('businesses.publication_status', 'published')
  .eq('businesses.is_active', true)
  .or('latitude.is.null,longitude.is.null');
if (error) {
  console.error(`Falha ao ler business_locations: ${error.message}`);
  process.exit(1);
}

console.log(`${apply ? 'APLICANDO' : 'SIMULAÇÃO'} | ${locations.length} localização(ões) sem coordenadas${manual.size ? ` | ${manual.size} manual(is)` : ''}`);

let found = 0;
for (const loc of locations) {
  const name = loc.businesses?.name ?? loc.business_id;
  // Número só com dígitos ("1660, casa" -> "1660"): complementos atrapalham a busca.
  const digits = String(loc.number ?? '').match(/\d+/)?.[0] ?? '';
  const streetLine = [digits, loc.street].filter(Boolean).join(' ').trim();
  let hit = null;
  let precision = 'endereço';
  const slug = loc.businesses?.slug;
  try {
    if (slug && manual.has(slug)) {
      const [lat, lng] = manual.get(slug);
      hit = { lat, lng, label: 'coordenadas informadas manualmente' };
      precision = 'manual';
    }
    if (!hit && loc.street && digits) hit = await nominatim({ street: streetLine, city: loc.city, state: loc.state, country: 'Brasil', postalcode: loc.postal_code });
    if (!hit && loc.street) hit = await nominatim({ q: [loc.street, loc.neighborhood, loc.city, loc.state, 'Brasil'].filter(Boolean).join(', ') });
    if (!hit && loc.street) {
      hit = await nominatim({ street: loc.street, city: loc.city, state: loc.state, country: 'Brasil' });
      if (hit) precision = 'rua (sem número exato)';
    }
    if (!hit && loc.postal_code && !/^0{5}-?0{3}$/.test(loc.postal_code)) {
      hit = await nominatim({ postalcode: loc.postal_code, country: 'Brasil' });
      if (hit) precision = 'CEP (aproximado)';
    }
    if (!hit && loc.city) {
      hit = await nominatim({ city: loc.city, state: loc.state, country: 'Brasil' });
      if (hit) precision = 'cidade (aproximado)';
    }
  } catch (err) {
    console.log(`  ✖ ${name}: ${err instanceof Error ? err.message : err}`);
    continue;
  }

  if (!hit) {
    console.log(`  – ${name}: endereço não encontrado (${[loc.street, loc.city, loc.state].filter(Boolean).join(', ') || 'sem endereço'})`);
    continue;
  }
  found += 1;
  console.log(`  ✔ ${name}: ${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)} [${precision}] ${hit.label}`);
  if (apply) {
    const { error: updateError } = await supabase.from('business_locations').update({ latitude: hit.lat, longitude: hit.lng }).eq('id', loc.id);
    if (updateError) console.log(`    ✖ não gravou: ${updateError.message}`);
  }
}

console.log(`${found} de ${locations.length} com coordenadas${apply ? ' gravadas' : ' (nada foi gravado; use --apply)'}.`);
