// Auditoria estática das migrations: funções SECURITY DEFINER chamáveis por anon/authenticated SEM checagem de quem chama.
// Uso: node scripts/audit-security-definer.cjs [--json]
// LIMITES (leia antes de confiar): análise de TEXTO das migrations (não consulta o banco). Usa a ÚLTIMA definição de cada função,
// supõe os privilégios padrão do Supabase (EXECUTE para anon/authenticated em funções novas do schema public, salvo REVOKE),
// e a "checagem de quem chama" é uma heurística (procura auth.uid(), has_*_permission etc.). Funções que chamam outra função
// que autoriza (ex.: wrappers) podem aparecer como falso positivo. Todo achado precisa de confirmação manual.
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const funcs = new Map(); // key -> { name, args, file, definer, body, params }
const grants = new Map(); // name -> Set(roles que PODEM executar)

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const argTypes = (args) => args.split(',').map((a) => norm(a).split(' ').slice(1, 2).join('').toLowerCase()).filter(Boolean).join(',');
const roleSet = (name) => { if (!grants.has(name)) grants.set(name, new Set(['PUBLIC', 'anon', 'authenticated', 'service_role'])); return grants.get(name); };

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');

  const createRe = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*(?:RETURNS[\s\S]*?)?(?=\bAS\s+\$)/gi;
  let m;
  while ((m = createRe.exec(text))) {
    const name = m[1];
    const header = m[0];
    const asIdx = text.indexOf('AS $', m.index);
    const tagMatch = /AS\s+(\$[a-zA-Z0-9_]*\$)/.exec(text.slice(asIdx));
    if (!tagMatch) continue;
    const tag = tagMatch[1];
    const bodyStart = asIdx + tagMatch[0].length;
    const bodyEnd = text.indexOf(tag, bodyStart);
    if (bodyEnd < 0) continue;
    const body = text.slice(bodyStart, bodyEnd);
    const tail = text.slice(bodyEnd, bodyEnd + 400);
    const allHeader = header + ' ' + text.slice(bodyStart - 0, bodyStart) + ' ' + tail + ' ' + text.slice(m.index, asIdx);
    const definer = /SECURITY\s+DEFINER/i.test(text.slice(m.index, bodyStart)) || /SECURITY\s+DEFINER/i.test(tail);
    const args = m[2];
    const key = `${name}(${argTypes(args)})`;
    funcs.set(key, { name, args: norm(args), file, definer, body, params: norm(args).toLowerCase() });
    // Uma função recriada volta aos privilégios padrão do Supabase apenas se for nova; CREATE OR REPLACE preserva. Mantém.
    void allHeader;
  }

  const dropRe = /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)/gi;
  while ((m = dropRe.exec(text))) funcs.delete(`${m[1]}(${argTypes(m[2])})`);

  // REVOKE/GRANT dinâmicos em blocos DO (EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM ...', f)): lê a lista ARRAY[...] mais próxima antes do comando.
  const dynRe = /format\(\s*'(REVOKE|GRANT)\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+public\.%[sI][^']*?\s+(FROM|TO)\s+([^']+)'/gi;
  while ((m = dynRe.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 6000), m.index);
    const arrays = [...before.matchAll(/ARRAY\s*\[([\s\S]*?)\]/g)];
    if (!arrays.length) continue;
    const names = [...arrays[arrays.length - 1][1].matchAll(/'([a-zA-Z0-9_]+)\s*\(/g)].map((x) => x[1]);
    const roles = m[3].split(',').map((x) => x.trim().replace(/"/g, '')).map((r) => (r.toLowerCase() === 'public' ? 'PUBLIC' : r));
    for (const n of names) {
      const set = roleSet(n);
      for (const r of roles) { if (m[1].toUpperCase() === 'REVOKE') set.delete(r); else set.add(r); }
    }
  }

  const revokeRe = /REVOKE\s+(?:ALL|EXECUTE)(?:\s+PRIVILEGES)?\s+ON\s+FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s+FROM\s+([^;]+);/gi;
  while ((m = revokeRe.exec(text))) {
    const set = roleSet(m[1]);
    for (const r of m[2].split(',').map((x) => x.trim().replace(/"/g, ''))) set.delete(r === 'public' ? 'PUBLIC' : r);
  }
  const grantRe = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s+TO\s+([^;]+);/gi;
  while ((m = grantRe.exec(text))) {
    const set = roleSet(m[1]);
    for (const r of m[2].split(',').map((x) => x.trim().replace(/"/g, ''))) set.add(r === 'public' ? 'PUBLIC' : r);
  }
}

const AUTH_CHECK = /auth\.uid\s*\(|has_business_permission|has_tenant_admin_access|has_global_platform_role|get_current_user_role|auth\.role\s*\(|current_tenant_id\s*\(|is_platform_admin|_assert_|assert_[a-z_]*access|current_setting\s*\(\s*'request\.jwt/i;
const ID_PARAM = /\bp_(business|tenant|user|member|company|org|connection|referral)[a-z_]*_id\b|\bp_user\b|\bp_member\b/i;

const rows = [];
for (const f of funcs.values()) {
  if (!f.definer) continue;
  const roles = roleSet(f.name);
  const reachable = roles.has('PUBLIC') || roles.has('anon') || roles.has('authenticated');
  if (!reachable) continue;
  const anonReach = roles.has('PUBLIC') || roles.has('anon');
  const hasCheck = AUTH_CHECK.test(f.body);
  const hasId = ID_PARAM.test(f.params);
  const intendedPublic = /^public_|^_/.test(f.name) || /^(get|list)_public_/.test(f.name);
  rows.push({ name: f.name, file: f.file, anon: anonReach, hasCheck, hasId, intendedPublic, args: f.args.slice(0, 90) });
}

const high = rows.filter((r) => !r.hasCheck && r.hasId && !r.intendedPublic);
const medium = rows.filter((r) => !r.hasCheck && !r.hasId && !r.intendedPublic);
const publicNoCheck = rows.filter((r) => !r.hasCheck && r.intendedPublic);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total: funcs.size, definer: rows.length, high, medium, publicNoCheck: publicNoCheck.length }, null, 2));
  process.exit(0);
}
console.log(`Funções (última definição): ${funcs.size} | SECURITY DEFINER alcançáveis por anon/authenticated: ${rows.length}`);
console.log(`\n== ALTO: recebem ID de empresa/tenant/usuário e NÃO checam quem chama (${high.length}) ==`);
for (const r of high) console.log(`  ${r.anon ? '[ANON] ' : ''}${r.name}  (${r.file})\n      ${r.args}`);
console.log(`\n== MÉDIO: sem checagem e sem ID de alvo, nome não parece público (${medium.length}) ==`);
for (const r of medium) console.log(`  ${r.anon ? '[ANON] ' : ''}${r.name}  (${r.file})`);
console.log(`\n(Funções public_*/_internas sem checagem, por desenho público ou interno: ${publicNoCheck.length}, não listadas.)`);
