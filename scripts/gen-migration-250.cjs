// Gera a migration 250 (endurecimento de funções SECURITY DEFINER) e o rollback, a partir do TEXTO ORIGINAL das funções.
// Cada função com checagem interna é copiada sem alteração e recebe apenas um bloco de autorização logo após o primeiro BEGIN.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const mig = (f) => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8').replace(/\r\n/g, '\n');

function extract(file, name) {
  const text = mig(file);
  const start = text.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  if (start < 0) throw new Error(`função não encontrada: ${name} em ${file}`);
  const asIdx = text.indexOf('AS $', start);
  const tag = /AS\s+(\$[a-zA-Z0-9_]*\$)/.exec(text.slice(asIdx))[1];
  const bodyStart = asIdx + text.slice(asIdx).indexOf(tag) + tag.length;
  const bodyEnd = text.indexOf(tag, bodyStart);
  const end = text.indexOf(';', bodyEnd + tag.length) + 1;
  return text.slice(start, end) + '\n';
}

function withCheck(sql, check) {
  const i = sql.indexOf('\nBEGIN\n');
  if (i < 0) throw new Error('BEGIN não encontrado');
  return sql.slice(0, i + 7) + check + sql.slice(i + 7);
}

const memberCheck = (roles, tenantExpr, label) => `  -- Autorização (migration 250): antes só o ID da empresa era exigido; agora quem chama precisa ter vínculo (dono por owner_id,
  -- equipe com permissão ou admin do tenant, via has_business_permission). O servidor (service_role) continua permitido.
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.has_business_permission(${tenantExpr}, p_business_id, ARRAY[${roles}]) THEN
    RAISE EXCEPTION 'FORBIDDEN: ${label}';
  END IF;

`;
const tenantOfBusiness = '(SELECT b.tenant_id FROM public.businesses b WHERE b.id = p_business_id)';

const items = [
  { file: '060_contracts_snapshot_enhancements.sql', name: 'get_signed_contract_snapshot', sig: 'UUID',
    check: memberCheck("'owner', 'co_owner', 'finance'", tenantOfBusiness, 'Sem permissão para ver o contrato desta empresa.') },
  { file: '043_business_management_rpc.sql', name: 'reorder_business_services', sig: 'UUID, UUID, TEXT',
    check: memberCheck("'owner', 'co_owner', 'manager', 'marketing'", tenantOfBusiness, 'Você não pode alterar esta empresa.') },
  { file: '043_business_management_rpc.sql', name: 'reorder_business_benefits', sig: 'UUID, UUID, TEXT',
    check: memberCheck("'owner', 'co_owner', 'manager', 'marketing'", tenantOfBusiness, 'Você não pode alterar esta empresa.') },
  { file: '050_analytics_and_hardening_schema.sql', name: 'get_business_analytics_summary', sig: 'UUID, UUID, INT',
    check: memberCheck("'owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'", 'p_tenant_id', 'Sem permissão para ver as métricas desta empresa.') },
];
// Trava interna extra (defesa em profundidade): mesmo que alguém conceda EXECUTE de novo no futuro, a função só roda para o servidor.
// trigger_operational_notification NÃO é redefinida aqui: a migration 164 a altera dinamicamente (pg_get_functiondef), então só os privilégios mudam.
const serverGuard = `  -- Trava interna (migration 250): função administrativa, somente para o servidor (service_role).
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN: Função restrita ao servidor.';
  END IF;

`;
const serverOnly = [
  { name: 'get_admin_dashboard_metrics', sig: '', file: '122_fix_admin_metrics_and_recognitions.sql' },
  { name: 'get_admin_lodges_list', sig: 'TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER', file: '065_admin_lodges_360_rpcs.sql' },
  { name: 'trigger_operational_notification', sig: 'UUID, UUID, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR' },
  // RPCs públicos ANTIGOS de rastreamento: nenhum código do site ou do app os usa (o rastreamento real grava pelo servidor em analytics_events).
  // Fechar o acesso direto elimina a via de inflar indicadores chamando a API com a chave pública. Só privilégios mudam.
  { name: 'record_business_analytics_event', sig: 'UUID, UUID, VARCHAR, VARCHAR, TEXT' },
  { name: 'record_directory_analytics_event', sig: 'UUID, VARCHAR, TEXT, TEXT, TEXT, VARCHAR' },
];

let up = `-- 250 - Endurecimento de funções SECURITY DEFINER abertas a anon/authenticated (auditoria do Gate de Segurança)
--
-- Confirmado no banco oficial (has_function_privilege): as funções abaixo eram executáveis por anon e authenticated, e o corpo
-- delas não conferia quem chamava. Como a chave anônima é pública, qualquer pessoa podia chamá-las direto pela API.
--
--  Apenas servidor (service_role) - o código só as chama com a chave de serviço:
--    get_admin_dashboard_metrics, get_admin_lodges_list (com trava interna extra), trigger_operational_notification,
--    record_business_analytics_event, record_directory_analytics_event
--  Com checagem interna de vínculo (has_business_permission, ver 248) e sem acesso anônimo:
--    get_signed_contract_snapshot (IP/navegador do aceite do contrato), reorder_business_services, reorder_business_benefits,
--    get_business_analytics_summary
--
-- O corpo de cada função é IDÊNTICO ao original; só se acrescenta o bloco de autorização após o primeiro BEGIN.
-- record_business_analytics_event e record_directory_analytics_event (RPCs públicos antigos de rastreamento): só privilégios,
--   apenas servidor. Nenhum código do site/app os chama; o rastreamento real grava pelo servidor. Impede inflar números por chamada direta.
-- Depende da migration 248. Reversão: supabase/rollbacks/connections/250_rollback.sql
--
-- ATENÇÃO ao aplicar: as funções "apenas servidor" falham para sessões de usuário comum. O código do site as chama com a chave
-- de serviço (SUPABASE_SERVICE_ROLE_KEY); confirme que ela está definida no ambiente antes de aplicar.

`;
let down = `-- ROLLBACK da migration 250: restaura as funções originais e os privilégios abertos (PUBLIC/anon/authenticated).
-- ATENÇÃO: isto REABRE a exposição corrigida pela 250.

`;

for (const it of items) {
  const original = extract(it.file, it.name);
  up += `-- ${it.name}\n` + withCheck(original, it.check) + '\n';
  up += `REVOKE ALL ON FUNCTION public.${it.name}(${it.sig}) FROM PUBLIC, anon;\n`;
  up += `GRANT EXECUTE ON FUNCTION public.${it.name}(${it.sig}) TO authenticated, service_role;\n\n`;
  down += original + '\n';
  down += `GRANT EXECUTE ON FUNCTION public.${it.name}(${it.sig}) TO PUBLIC, anon, authenticated, service_role;\n\n`;
}
up += '-- Funções que só o servidor deve chamar\n';
for (const s of serverOnly) {
  if (s.file) {
    const original = extract(s.file, s.name);
    up += `-- ${s.name}\n` + withCheck(original, serverGuard) + '\n';
    down += original + '\n';
  }
  up += `REVOKE ALL ON FUNCTION public.${s.name}(${s.sig}) FROM PUBLIC, anon, authenticated;\n`;
  up += `GRANT EXECUTE ON FUNCTION public.${s.name}(${s.sig}) TO service_role;\n`;
  down += `GRANT EXECUTE ON FUNCTION public.${s.name}(${s.sig}) TO PUBLIC, anon, authenticated, service_role;\n`;
}
up += "\nNOTIFY pgrst, 'reload schema';\n";
down += "\nNOTIFY pgrst, 'reload schema';\n";

fs.writeFileSync(path.join(root, 'supabase/migrations/250_security_definer_hardening.sql'), up);
fs.writeFileSync(path.join(root, 'supabase/rollbacks/connections/250_rollback.sql'), down);
console.log('ok: 250 e rollback gerados');
