// Gera a migration 249 (e o rollback) a partir do texto da função original da migration 215, sem reescrevê-la à mão.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'supabase/migrations/215_aggregate_business_analytics_metrics.sql'), 'utf8').replace(/\r\n/g, '\n');

const start = src.indexOf('CREATE OR REPLACE FUNCTION public.get_business_analytics_aggregate_metrics');
const endMarker = '$$;\n';
const end = src.indexOf(endMarker, src.indexOf('AS $$', start)) + endMarker.length;
const original = src.slice(start, end);

const anchor = "  IF v_tenant_id IS NULL THEN\n    RAISE EXCEPTION 'FORBIDDEN: Empresa não localizada ou inativa.';\n  END IF;\n";
if (!original.includes(anchor)) throw new Error('âncora não encontrada na função da 215');

const check = anchor + `
  -- 1b. Autorização: dono (businesses.owner_id), equipe com permissão ou admin do tenant (via has_business_permission).
  -- O servidor (service_role) continua permitido. Antes desta migration a função só conferia se a empresa estava ativa,
  -- e qualquer usuário autenticado que soubesse o ID da empresa podia ler as métricas dela.
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.has_business_permission(
       v_tenant_id, p_business_id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver as métricas desta empresa.';
  END IF;
`;
const patched = original.replace(anchor, check);

const header = `-- 249 - Autorização na função de métricas do anunciante (get_business_analytics_aggregate_metrics)
--
-- Problema (migration 215): a função é SECURITY DEFINER, executável por qualquer usuário autenticado, e só conferia se a
-- empresa estava ativa. Quem soubesse o ID de uma empresa podia ler visitas, cliques, origens e cidades dela.
-- Correção: exige dono (owner_id), equipe com permissão ou admin do tenant (has_business_permission, ver 248) ou service_role.
-- O corpo da função é IDÊNTICO ao da 215, com apenas o bloco de autorização acrescentado. Também remove o EXECUTE de
-- PUBLIC/anon (o padrão do Postgres concede EXECUTE a PUBLIC ao criar a função).
-- Depende da migration 248 (dono por owner_id) para que donos sem linha em business_members continuem vendo os resultados.
-- Reversão: supabase/rollbacks/connections/249_rollback.sql

`;
const grants = `
REVOKE ALL ON FUNCTION public.get_business_analytics_aggregate_metrics(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_analytics_aggregate_metrics(UUID, INTEGER) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;
fs.writeFileSync(path.join(root, 'supabase/migrations/249_analytics_metrics_authorization.sql'), header + patched + grants);

const rbHeader = `-- ROLLBACK da migration 249: volta à função da migration 215 (sem a checagem de autorização).
-- ATENÇÃO: isto reabre a leitura de métricas de qualquer empresa por qualquer usuário autenticado.
`;
const rbGrants = `
GRANT EXECUTE ON FUNCTION public.get_business_analytics_aggregate_metrics(UUID, INTEGER) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
`;
fs.writeFileSync(path.join(root, 'supabase/rollbacks/connections/249_rollback.sql'), rbHeader + original + rbGrants);
console.log('ok: 249 e rollback gerados');
