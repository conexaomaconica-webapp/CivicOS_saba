// Verifica, contra um projeto Supabase REAL (staging/branch de teste), se o PostgREST resolve as funções do Mural de
// Conexões para as chamadas do APLICATIVO PUBLICADO (3 argumentos) e da WEB nova. Só faz LEITURAS com a chave anônima.
//
// Uso (depois de aplicar as migrations 244, 245 e 246 no projeto de teste):
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=... CONNECTIONS_HOST=dominio.do.ambiente node scripts/verify-connections-rpc.mjs
// NÃO rode contra produção antes de aplicar as migrations: sem elas, as chamadas novas falham (esperado).
const url = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const key = process.env.SUPABASE_ANON_KEY ?? '';
const host = process.env.CONNECTIONS_HOST ?? '';
if (!url || !key || !host) {
  console.error('Defina SUPABASE_URL, SUPABASE_ANON_KEY e CONNECTIONS_HOST (domínio do tenant).');
  process.exit(2);
}

const call = async (fn, body) => {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* corpo não-JSON */ }
  return { status: res.status, json, text: text.slice(0, 200) };
};

const checks = [
  {
    name: 'APP PUBLICADO: public_connections_feed com 3 argumentos (p_host, p_limit, p_only_with_photo)',
    run: () => call('public_connections_feed', { p_host: host, p_limit: 6, p_only_with_photo: false }),
    pass: (r) => r.status === 200 && Array.isArray(r.json),
  },
  {
    name: 'WEB: vitrine compacta (1 por empresa, mais recentes)',
    run: () => call('public_connections_feed', { p_host: host, p_limit: 3, p_only_with_photo: false, p_one_per_business: true, p_prefer_photo: false }),
    pass: (r) => r.status === 200 && Array.isArray(r.json) && new Set(r.json.map((i) => i.business_slug)).size === r.json.length,
  },
  {
    name: 'WEB: feed com 4 argumentos (assinatura intermediária não deve ser ambígua)',
    run: () => call('public_connections_feed', { p_host: host, p_limit: 3, p_only_with_photo: false, p_one_per_business: true }),
    pass: (r) => r.status === 200 && Array.isArray(r.json),
  },
  {
    name: 'WEB: public_connections_list (busca, tipo, ordem, paginação)',
    run: () => call('public_connections_list', { p_host: host, p_query: null, p_type: null, p_order: 'recent', p_page: 1, p_page_size: 12, p_business_slug: null }),
    pass: (r) => r.status === 200 && r.json && Array.isArray(r.json.items) && typeof r.json.total === 'number' && typeof r.json.total_pages === 'number',
  },
  {
    name: 'WEB (migration 247): listagem filtrada por empresa inexistente devolve total 0 (sem erro)',
    run: () => call('public_connections_list', { p_host: host, p_query: null, p_type: null, p_order: 'recent', p_page: 1, p_page_size: 2, p_business_slug: 'empresa-que-nao-existe' }),
    pass: (r) => r.status === 200 && r.json && r.json.total === 0 && Array.isArray(r.json.items) && r.json.items.length === 0,
  },
  {
    name: 'WEB: public_connection_detail com id inexistente devolve NULL (a página responde 404)',
    run: () => call('public_connection_detail', { p_host: host, p_connection_id: '00000000-0000-4000-8000-0000000000ff' }),
    pass: (r) => r.status === 200 && r.json === null,
  },
];

let failed = 0;
for (const check of checks) {
  const r = await check.run();
  const ok = check.pass(r);
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${check.name}\n    HTTP ${r.status} ${ok ? '' : r.text}`);
}

// Funções antigas/novas: o catálogo não é acessível com a chave anônima; o que importa é a resolução acima.
console.log(failed === 0 ? '\nOK: todas as chamadas foram resolvidas.' : `\n${failed} verificação(ões) falharam.`);
process.exit(failed === 0 ? 0 : 1);
