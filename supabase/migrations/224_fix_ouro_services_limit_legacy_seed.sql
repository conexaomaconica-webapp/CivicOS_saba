-- Corrige a cota de serviços do Plano Acácia (plan_code 'ouro') que ficou em 25.
-- As migrations 044/073 semearam 25; a 102 definiu 10 mas com ON CONFLICT DO NOTHING,
-- então as linhas já existentes nunca foram atualizadas.
-- Só altera linhas ainda iguais ao valor legado (25); cotas ajustadas manualmente em
-- /admin/planos para outro valor são preservadas.

DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.plan_entitlements
     SET max_limit = 10
   WHERE plan_code IN ('ouro', 'ouro_founder')
     AND feature_code = 'services_limit'
     AND max_limit = 25;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'plan_entitlements services_limit (ouro): % linha(s) atualizada(s) de 25 para 10', v_updated;
END $$;

-- Conferência (opcional):
-- SELECT tenant_id, plan_code, max_limit FROM public.plan_entitlements
--  WHERE plan_code IN ('ouro', 'ouro_founder') AND feature_code = 'services_limit';
