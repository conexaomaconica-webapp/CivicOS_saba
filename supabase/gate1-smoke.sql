-- ============================================================================
-- CivicOS - Conexão Maçônica · Smoke do Gate 1 (INF-001/002/003)
-- ============================================================================
-- Verifica, após `db reset` + seed, que as pré-condições estruturais do
-- Sprint 0 existem. Qualquer falha levanta exceção (exit != 0).
-- ============================================================================

DO $$
DECLARE
  missing TEXT[] := '{}';
BEGIN
  -- 1. Tabelas-base esperadas após todas as migrations
  IF to_regclass('public.tenants') IS NULL THEN missing := missing || 'tenants'; END IF;
  IF to_regclass('public.profiles') IS NULL THEN missing := missing || 'profiles'; END IF;
  IF to_regclass('public.businesses') IS NULL THEN missing := missing || 'businesses'; END IF;
  IF to_regclass('public.tenant_plans') IS NULL THEN missing := missing || 'tenant_plans'; END IF;

  -- 2. Contexto do produto (Conexão Maçônica)
  IF to_regclass('public.roles') IS NULL THEN missing := missing || 'roles'; END IF;
  IF to_regclass('public.permissions') IS NULL THEN missing := missing || 'permissions'; END IF;
  IF to_regclass('public.user_roles') IS NULL THEN missing := missing || 'user_roles'; END IF;
  IF to_regclass('public.business_members') IS NULL THEN missing := missing || 'business_members'; END IF;
  IF to_regclass('public.categories') IS NULL THEN missing := missing || 'categories'; END IF;
  IF to_regclass('public.organizations') IS NULL THEN missing := missing || 'organizations'; END IF;
  IF to_regclass('public.credential_issuances') IS NULL THEN missing := missing || 'credential_issuances'; END IF;
  IF to_regclass('public.entitlement_grants') IS NULL THEN missing := missing || 'entitlement_grants'; END IF;
  IF to_regclass('public.consent_records') IS NULL THEN missing := missing || 'consent_records'; END IF;
  IF to_regclass('public.legal_documents') IS NULL THEN missing := missing || 'legal_documents'; END IF;
  IF to_regclass('public.subscriptions') IS NULL THEN missing := missing || 'subscriptions'; END IF;
  IF to_regclass('public.plans') IS NULL THEN missing := missing || 'plans'; END IF;
  IF to_regclass('public.leads') IS NULL THEN missing := missing || 'leads'; END IF;
  IF to_regclass('public.business_masonic_links') IS NULL THEN missing := missing || 'business_masonic_links'; END IF;
  IF to_regclass('public.import_jobs') IS NULL THEN missing := missing || 'import_jobs'; END IF;
  IF to_regclass('public.audit_logs') IS NULL THEN missing := missing || 'audit_logs'; END IF;

  -- 3. Mensageria/Outbox + DLQ (INF-003)
  IF to_regclass('public.outbox_events') IS NULL THEN missing := missing || 'outbox_events'; END IF;
  IF to_regclass('public.event_deliveries') IS NULL THEN missing := missing || 'event_deliveries'; END IF;
  IF to_regclass('public.failed_event_queue') IS NULL THEN missing := missing || 'failed_event_queue'; END IF;
  IF to_regclass('public.event_consumptions') IS NULL THEN missing := missing || 'event_consumptions'; END IF;

  -- 4. Funções de segurança (INF-004)
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_global_platform_role')
    THEN missing := missing || 'fn:has_global_platform_role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_tenant_admin_access')
    THEN missing := missing || 'fn:has_tenant_admin_access'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_business_permission')
    THEN missing := missing || 'fn:has_business_permission'; END IF;

  -- 5. Seed aplicado (fixtures determinísticas)
  IF (SELECT count(*) FROM public.tenants) < 3 THEN missing := missing || 'seed:tenants'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'master')
    THEN missing := missing || 'seed:master-user'; END IF;
  IF (SELECT count(*) FROM public.businesses) < 1 THEN missing := missing || 'seed:business'; END IF;
  IF (SELECT count(*) FROM public.tenant_plans WHERE tenant_id = '00000000-0000-0000-0000-000000000010') < 3
    THEN missing := missing || 'seed:tenant-plans'; END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'GATE1 SMOKE FAILED - ausentes: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'GATE1 SMOKE OK - schema, segurança, outbox e seed presentes';
END $$;