-- 235 - Módulo Comercial Nacional · Gate 1B · RLS por papel (SOMENTE LEITURA)
--
-- * 'authenticated' recebe apenas SELECT (nenhuma escrita direta): todas as escritas passam por serviços
--   de backend com chave de serviço, após autorização explícita (padrão do projeto).
-- * 'anon' continua sem nenhum acesso.
-- * Isolamento por (tenant, usuário): as funções da 234 verificam tenant da linha, módulo habilitado,
--   perfil ativo e vínculo do usuário; nada depende de claim de tenant no JWT.
-- * commercial_representatives: concessão por COLUNA — hash/cifrados do documento, chave PIX cifrada,
--   dados fiscais e autoria não são legíveis por 'authenticated' (somente pelo servidor).
-- Reversão: supabase/rollbacks/commercial/235_rollback.sql

-- ---------------------------------------------------------------------------
-- Concessões (SELECT) · tabelas completas
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commercial_settings', 'commercial_access_grants', 'commercial_representative_documents',
    'commercial_leads', 'commercial_lead_activities', 'commercial_referral_evidence', 'commercial_attributions',
    'commercial_commission_rules', 'commercial_financial_events', 'commercial_capture_failures',
    'commercial_closing_periods', 'commercial_payouts', 'commercial_ledger_entries',
    'commercial_commission_releases', 'commercial_payout_items'
  ]
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Representantes: colunas seguras apenas.
GRANT SELECT (
  id, tenant_id, user_id, person_type, legal_name, trade_name, email, phone,
  document_last4, pix_key_type, pix_key_hint, referral_code, status, status_changed_at,
  suspended_at, terminated_at, termination_reason, contract_version, contract_accepted_at,
  territory, created_at, updated_at
) ON public.commercial_representatives TO authenticated;

-- Saldo derivado (security_invoker: respeita a RLS do livro-razão).
GRANT SELECT ON public.commercial_representative_balances TO authenticated;

-- ---------------------------------------------------------------------------
-- Políticas
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS commercial_settings_select ON public.commercial_settings;
CREATE POLICY commercial_settings_select ON public.commercial_settings
  FOR SELECT TO authenticated
  USING (public.has_commercial_permission(tenant_id, 'settings.manage'));

DROP POLICY IF EXISTS commercial_access_grants_select ON public.commercial_access_grants;
CREATE POLICY commercial_access_grants_select ON public.commercial_access_grants
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND public.commercial_module_enabled(tenant_id))
    OR public.has_commercial_permission(tenant_id, 'settings.manage')
  );

DROP POLICY IF EXISTS commercial_representatives_select ON public.commercial_representatives;
CREATE POLICY commercial_representatives_select ON public.commercial_representatives
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, id, 'self')
    OR public.has_commercial_permission(tenant_id, 'representatives.read')
  );

DROP POLICY IF EXISTS commercial_representative_documents_select ON public.commercial_representative_documents;
CREATE POLICY commercial_representative_documents_select ON public.commercial_representative_documents
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, representative_id, 'operational')
    OR public.has_commercial_permission(tenant_id, 'documents.read')
  );

DROP POLICY IF EXISTS commercial_leads_select ON public.commercial_leads;
CREATE POLICY commercial_leads_select ON public.commercial_leads
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, representative_id, 'operational')
    OR public.has_commercial_permission(tenant_id, 'leads.manage')
  );

DROP POLICY IF EXISTS commercial_lead_activities_select ON public.commercial_lead_activities;
CREATE POLICY commercial_lead_activities_select ON public.commercial_lead_activities
  FOR SELECT TO authenticated
  USING (
    public.commercial_lead_rep_access(tenant_id, lead_id, 'operational')
    OR public.has_commercial_permission(tenant_id, 'leads.manage')
  );

DROP POLICY IF EXISTS commercial_referral_evidence_select ON public.commercial_referral_evidence;
CREATE POLICY commercial_referral_evidence_select ON public.commercial_referral_evidence
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, representative_id, 'operational')
    OR public.has_commercial_permission(tenant_id, 'leads.manage')
  );

-- Atribuição sustenta comissões: o histórico segue visível (leitura) mesmo suspenso/desligado.
DROP POLICY IF EXISTS commercial_attributions_select ON public.commercial_attributions;
CREATE POLICY commercial_attributions_select ON public.commercial_attributions
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, representative_id, 'financial')
    OR public.has_commercial_permission(tenant_id, 'attributions.manage')
  );

DROP POLICY IF EXISTS commercial_commission_rules_select ON public.commercial_commission_rules;
CREATE POLICY commercial_commission_rules_select ON public.commercial_commission_rules
  FOR SELECT TO authenticated
  USING (public.has_commercial_permission(tenant_id, 'rules.read'));

DROP POLICY IF EXISTS commercial_financial_events_select ON public.commercial_financial_events;
CREATE POLICY commercial_financial_events_select ON public.commercial_financial_events
  FOR SELECT TO authenticated
  USING (
    public.has_commercial_permission(tenant_id, 'commissions.read')
    OR public.has_commercial_permission(tenant_id, 'audit.read')
  );

DROP POLICY IF EXISTS commercial_capture_failures_select ON public.commercial_capture_failures;
CREATE POLICY commercial_capture_failures_select ON public.commercial_capture_failures
  FOR SELECT TO authenticated
  USING (public.has_commercial_permission(tenant_id, 'audit.read'));

DROP POLICY IF EXISTS commercial_closing_periods_select ON public.commercial_closing_periods;
CREATE POLICY commercial_closing_periods_select ON public.commercial_closing_periods
  FOR SELECT TO authenticated
  USING (public.has_commercial_permission(tenant_id, 'commissions.read'));

DROP POLICY IF EXISTS commercial_ledger_entries_select ON public.commercial_ledger_entries;
CREATE POLICY commercial_ledger_entries_select ON public.commercial_ledger_entries
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, representative_id, 'financial')
    OR public.has_commercial_permission(tenant_id, 'commissions.read')
  );

DROP POLICY IF EXISTS commercial_commission_releases_select ON public.commercial_commission_releases;
CREATE POLICY commercial_commission_releases_select ON public.commercial_commission_releases
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, representative_id, 'financial')
    OR public.has_commercial_permission(tenant_id, 'commissions.read')
  );

DROP POLICY IF EXISTS commercial_payouts_select ON public.commercial_payouts;
CREATE POLICY commercial_payouts_select ON public.commercial_payouts
  FOR SELECT TO authenticated
  USING (
    public.commercial_rep_access(tenant_id, representative_id, 'financial')
    OR public.has_commercial_permission(tenant_id, 'payouts.manage')
    OR public.has_commercial_permission(tenant_id, 'commissions.read')
  );

DROP POLICY IF EXISTS commercial_payout_items_select ON public.commercial_payout_items;
CREATE POLICY commercial_payout_items_select ON public.commercial_payout_items
  FOR SELECT TO authenticated
  USING (
    public.commercial_payout_rep_access(tenant_id, payout_id, 'financial')
    OR public.has_commercial_permission(tenant_id, 'payouts.manage')
    OR public.has_commercial_permission(tenant_id, 'commissions.read')
  );

NOTIFY pgrst, 'reload schema';
