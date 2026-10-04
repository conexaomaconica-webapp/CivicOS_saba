'use server';

import { lookup } from 'node:dns/promises';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';

export type LodgeUrlRow = {
  name: string; code_number: number | null; potency: string; rite: string; city: string; state: string;
  cep: string; address: string; meeting_day: string; meeting_time: string; website: string; logo_url: string;
  latitude: number | null; longitude: number | null;
};

function privateIp(ip: string) {
  return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:') ||
    /^(127|10|0)\./.test(ip) || /^192\.168\./.test(ip) || /^169\.254\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

async function publicUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Informe uma URL pública iniciada por https://.');
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((item) => privateIp(item.address))) throw new Error('Endereços internos ou privados não são permitidos.');
  return url;
}

async function load(url: URL, referer?: string) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json,text/html;q=0.9', Referer: referer || url.origin, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36' },
    redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  if (response.status >= 300 && response.status < 400) throw new Error('O link redirecionou. Informe a URL final exibida no navegador.');
  if (!response.ok) throw new Error(`O site recusou a consulta (${response.status}).`);
  return response;
}

function recordsOf(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  if (!payload || typeof payload !== 'object') return [];
  const object = payload as Record<string, unknown>;
  for (const key of ['organizacoes', 'lojas', 'lodges', 'data', 'results', 'items']) if (Array.isArray(object[key])) return recordsOf(object[key]);
  return [];
}

function get(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return String(record[key]).trim();
  return '';
}

function normalize(records: Record<string, unknown>[], potency: string): LodgeUrlRow[] {
  return records.map((record) => {
    const session = get(record, 'sessao', 'reuniao', 'meeting', 'meeting_schedule').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const day = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].find((item) => session.includes(item)) || '';
    const time = session.match(/(\d{1,2})\s*(?:h|:)(\d{2})/);
    const code = Number(get(record, 'codigoCadastral', 'numeroLoja', 'code_number'));
    const lat = Number(get(record, 'latitude', 'lat'));
    const lng = Number(get(record, 'longitude', 'lng', 'lon'));
    return {
      name: get(record, 'nomeLoja', 'nome', 'name', 'title'), code_number: code > 0 ? code : null, potency,
      rite: get(record, 'rito', 'ritual', 'rite'), city: get(record, 'cidade', 'city'), state: get(record, 'uf', 'estado', 'state').toUpperCase(),
      cep: get(record, 'cep', 'postal_code', 'zipcode'),
      address: [get(record, 'endereco', 'address', 'logradouro'), get(record, 'numeroEndereco', 'numero'), get(record, 'complementoEndereco', 'complemento'), get(record, 'bairro', 'district')].filter(Boolean).join(', '),
      meeting_day: day, meeting_time: time?.[1] && time[2] ? `${time[1].padStart(2, '0')}:${time[2]}` : '',
      website: get(record, 'site', 'website', 'url'), logo_url: get(record, 'logoTipoLoja', 'logo', 'logo_url', 'image'),
      latitude: Number.isFinite(lat) && lat !== 0 ? lat : null, longitude: Number.isFinite(lng) && lng !== 0 ? lng : null,
    };
  }).filter((row) => row.name);
}

export async function extractLodgesFromUrlAction(input: { url: string; potency: string }) {
  try {
    await assertPlatformAdminAccess();
    const potency = input.potency.trim().toUpperCase();
    if (!potency) return { success: false, error: 'Informe a potência da fonte.' };
    const pageUrl = await publicUrl(input.url.trim());
    const response = await load(pageUrl);
    let payload: unknown;
    if ((response.headers.get('content-type') || '').includes('json')) payload = await response.json();
    else {
      const html = await response.text();
      const endpoint = html.match(/["']([^"']*(?:API|api)\/[^"']+(?:consultarorganizacao|organizacoes|lojas)[^"']*)["']/i)?.[1];
      if (!endpoint) return { success: false, error: 'Não encontrei dados estruturados nessa página. Informe o link JSON da fonte ou use uma planilha.' };
      const apiUrl = await publicUrl(new URL(endpoint, pageUrl).toString());
      payload = await (await load(apiUrl, pageUrl.toString())).json();
    }
    const rows = normalize(recordsOf(payload), potency);
    return rows.length ? { success: true, data: rows } : { success: false, error: 'Nenhuma loja reconhecível foi encontrada na fonte.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao extrair os dados.' };
  }
}
