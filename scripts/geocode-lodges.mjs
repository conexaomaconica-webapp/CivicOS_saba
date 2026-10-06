// Preenche latitude/longitude das lojas (organizations) para o mapa de /guia/lojas?view=map.
//
// Uso:
//   node scripts/geocode-lodges.mjs            (SIMULAÇÃO: só mostra o que encontraria)
//   node scripts/geocode-lodges.mjs --apply    (grava latitude/longitude)
//
// Ordem da busca: endereço (+cidade/estado) -> CEP -> cidade/estado (aproximado).
// Loja sem endereço, CEP e cidade não é localizada. Loja com "mostrar endereço" desligado só é localizada pela CIDADE,
// para não revelar no mapa um endereço que ela escolheu ocultar. Não sobrescreve coordenadas existentes.
// Nominatim (OpenStreetMap): 1 requisição por segundo, com identificação própria. Lê apps/web/.env.local (nada é impresso).
// Aborta se a URL não for a do projeto esperado.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const EXPECTED_REF = 'rwvztwsjcjljphqttiws';
const TENANT_ID = '00000000-0000-0000-0000-000000000000'; // tenant canônico da Conexão (não usar ...0010)
const apply = process.argv.includes('--apply');

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
const cache = new Map();

async function nominatim(params) {
  const key = JSON.stringify(params);
  if (cache.has(key)) return cache.get(key);
  const url = new URL('https://nominatim.openstreetmap.org/search');
  Object.entries({ format: 'jsonv2', limit: '1', countrycodes: 'br', ...params }).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'ConexaoMaconica-Geocoder/1.0 (+https://conexaomaconica.com.br)', 'Accept-Language': 'pt-BR' } });
  if (!res.ok) throw new Error(`Nominatim respondeu ${res.status}`);
  const data = await res.json();
  await sleep(1100);
  const hit = data[0] ? { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name } : null;
  cache.set(key, hit);
  return hit;
}

// O banco devolve no máximo 1000 linhas por consulta: lê todas as lojas sem coordenadas em blocos, por id.
const lodges = [];
for (let lastId = null; ;) {
  let query = supabase
    .from('organizations')
    .select('id, name, address, cep, city, state, show_address, latitude, longitude')
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
    .eq('is_published', true)
    .or('latitude.is.null,longitude.is.null')
    .order('id', { ascending: true })
    .limit(1000);
  if (lastId) query = query.gt('id', lastId);
  const { data, error } = await query;
  if (error) {
    console.error(`Falha ao ler organizations: ${error.message}`);
    process.exit(1);
  }
  lodges.push(...data);
  if (data.length < 1000) break;
  lastId = data[data.length - 1].id;
}

console.log(`${apply ? 'APLICANDO' : 'SIMULAÇÃO'} | ${lodges.length} loja(s) sem coordenadas`);

const validCep = (cep) => cep && !/^0{5}-?0{3}$/.test(String(cep).trim());
let found = 0;
const byPrecision = {};
for (const lodge of lodges) {
  const address = String(lodge.address ?? '').trim();
  const cep = String(lodge.cep ?? '').trim();
  const city = String(lodge.city ?? '').trim();
  const state = String(lodge.state ?? '').trim();
  if (!address && !validCep(cep) && !city) {
    console.log(`  – ${lodge.name}: sem endereço, CEP ou cidade (fica fora do mapa)`);
    continue;
  }
  const exact = lodge.show_address !== false;
  let hit = null;
  let precision = 'endereço';
  try {
    if (exact && address) hit = await nominatim({ q: [address, city, state, 'Brasil'].filter(Boolean).join(', ') });
    if (!hit && exact && validCep(cep)) {
      hit = await nominatim({ postalcode: cep, country: 'Brasil' });
      if (hit) precision = 'CEP (aproximado)';
    }
    if (!hit && city) {
      hit = await nominatim({ city, state, country: 'Brasil' });
      if (hit) precision = 'cidade (aproximado)';
    }
  } catch (err) {
    console.log(`  ✖ ${lodge.name}: ${err instanceof Error ? err.message : err}`);
    continue;
  }
  if (!hit) {
    console.log(`  – ${lodge.name}: não encontrada (${[address, cep, city, state].filter(Boolean).join(' | ')})`);
    continue;
  }
  found += 1;
  byPrecision[precision] = (byPrecision[precision] ?? 0) + 1;
  console.log(`  ✔ ${lodge.name}: ${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)} [${precision}]`);
  if (apply) {
    const { error: updateError } = await supabase.from('organizations').update({ latitude: hit.lat, longitude: hit.lng }).eq('id', lodge.id);
    if (updateError) console.log(`    ✖ não gravou: ${updateError.message}`);
  }
}

console.log(`${found} de ${lodges.length} localizadas${apply ? ' e gravadas' : ' (nada foi gravado; use --apply)'}.`, byPrecision);
