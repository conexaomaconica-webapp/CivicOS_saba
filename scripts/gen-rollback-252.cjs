// Gera o rollback da migration 252: a função get_admin_lodges_list EXATAMENTE como ficou na migration 250 (com trava interna).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'supabase/migrations/250_security_definer_hardening.sql'), 'utf8').replace(/\r\n/g, '\n');
const start = text.indexOf('CREATE OR REPLACE FUNCTION public.get_admin_lodges_list(');
if (start < 0) throw new Error('função não encontrada na 250');
const asIdx = text.indexOf('AS $$', start);
const end = text.indexOf('$$;', asIdx + 5) + 3;
const fn = text.slice(start, end) + '\n';
const out = `-- ROLLBACK da migration 252: volta get_admin_lodges_list à versão da migration 250 (continua com o defeito de o.phone/o.email).
${fn}
REVOKE ALL ON FUNCTION public.get_admin_lodges_list(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_lodges_list(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
`;
fs.writeFileSync(path.join(root, 'supabase/rollbacks/connections/252_rollback.sql'), out);
console.log('ok: rollback 252 gerado');
