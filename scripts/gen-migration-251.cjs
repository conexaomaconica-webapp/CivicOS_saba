// Gera a migration 251 (e o rollback) a partir do TEXTO ORIGINAL de register_business_connection (migration 184).
// Só a condição de bloqueio muda: administrador/master SEM vínculo com a empresa passa a poder registrar conexão.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'supabase/migrations/184_mural_share_consent.sql'), 'utf8').replace(/\r\n/g, '\n');

const start = src.indexOf('CREATE OR REPLACE FUNCTION public.register_business_connection(');
if (start < 0) throw new Error('função não encontrada');
const asIdx = src.indexOf('AS $$', start);
const bodyEnd = src.indexOf('$$;', asIdx + 5);
const original = src.slice(start, bodyEnd + 3) + '\n';

const oldCondition = `  IF v_biz.owner_id = v_user_id OR public.has_business_permission(
       v_biz.tenant_id, v_biz.id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Você faz parte desta empresa e não pode registrar uma conexão com ela.';
  END IF;
`;
if (!original.includes(oldCondition)) throw new Error('condição original não encontrada');

const newCondition = `  -- Dono (owner_id) e equipe ATIVA da própria empresa não registram conexão com ela: o Mural mostra "confirmada pela empresa",
  -- e quem registra e confirma a si mesmo fabricaria prova social. Administrador/master da plataforma SEM vínculo com a empresa
  -- pode registrar (testes e suporte). Antes, has_business_permission também era verdadeira para qualquer admin do tenant,
  -- o que bloqueava todos os masters em todas as empresas (efeito colateral, não intenção).
  IF v_biz.owner_id = v_user_id OR EXISTS (
       SELECT 1 FROM public.business_members bm
       WHERE bm.tenant_id = v_biz.tenant_id
         AND bm.business_id = v_biz.id
         AND bm.user_id = v_user_id
         AND bm.status = 'active'
         AND bm.role = ANY (ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Você faz parte desta empresa e não pode registrar uma conexão com ela.';
  END IF;
`;
const patched = original.replace(oldCondition, newCondition);

const grants = `
REVOKE ALL ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
`;

const header = `-- 251 - Administrador/master sem vínculo com a empresa pode registrar conexão (testes e suporte)
--
-- Problema: register_business_connection bloqueava quem "faz parte da empresa" usando has_business_permission, que também é
-- verdadeira para qualquer admin do tenant. Resultado: todo master era impedido de registrar conexão em QUALQUER empresa.
-- Correção: o bloqueio vale para o DONO (businesses.owner_id) e para a EQUIPE ATIVA (business_members) da própria empresa.
-- Admin/master sem vínculo com aquela empresa passa a poder registrar. Quem é dono ou equipe continua bloqueado, mesmo sendo master.
-- O resto da função (limites, duplicidade, foto, consentimento) é IDÊNTICO ao da migration 184.
-- Reversão: supabase/rollbacks/connections/251_rollback.sql
-- Observação: o registro continua PENDENTE até a empresa confirmar; o admin não confirma a própria conexão por esta migration.

`;
fs.writeFileSync(path.join(root, 'supabase/migrations/251_connection_register_admin_without_link.sql'), header + patched + grants);
fs.writeFileSync(
  path.join(root, 'supabase/rollbacks/connections/251_rollback.sql'),
  '-- ROLLBACK da migration 251: volta à função da migration 184 (admin/master volta a ser bloqueado em todas as empresas).\n' + original + grants,
);
console.log('ok: 251 e rollback gerados');
