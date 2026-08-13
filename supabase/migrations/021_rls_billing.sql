-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Billing & Subscriptions (007)
-- ============================================================================
-- Isolamento multi-tenant por tenant_id + acesso de business members via
-- has_business_permission. FKs compostas (tenant_id, ...) nas policies de SELECT
-- para reforçar o isolamento entre tenants.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- plans & plan_versions
-- ---------------------------------------------------------------------------

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active plans in tenant" ON public.plans;
CREATE POLICY "Public can view active plans in tenant"
  ON public.plans
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_active = true);

DROP POLICY IF EXISTS "tenant_admin can manage plans" ON public.plans;
CREATE POLICY "tenant_admin can manage plans"
  ON public.plans
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all plans" ON public.plans;
CREATE POLICY "master can manage all plans"
  ON public.plans
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view plan_versions of active plans" ON public.plan_versions;
CREATE POLICY "Public can view plan_versions of active plans"
  ON public.plan_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_versions.plan_id
        AND p.tenant_id = public.current_tenant_id()
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage plan_versions" ON public.plan_versions;
CREATE POLICY "tenant_admin can manage plan_versions"
  ON public.plan_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_versions.plan_id
        AND public.has_tenant_admin_access(p.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all plan_versions" ON public.plan_versions;
CREATE POLICY "master can manage all plan_versions"
  ON public.plan_versions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- subscriptions & subscription_periods
-- ---------------------------------------------------------------------------

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Business members can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Business owners can manage own subscriptions" ON public.subscriptions;
CREATE POLICY "Business owners can manage own subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'finance'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant subscriptions" ON public.subscriptions;
CREATE POLICY "tenant_admin can manage tenant subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "master can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.subscription_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own subscription_periods" ON public.subscription_periods;
CREATE POLICY "Business members can view own subscription_periods"
  ON public.subscription_periods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.tenant_id = subscription_periods.tenant_id
        AND s.id = subscription_periods.subscription_id
        AND public.has_business_permission(s.tenant_id, s.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "Business owners can manage own subscription_periods" ON public.subscription_periods;
CREATE POLICY "Business owners can manage own subscription_periods"
  ON public.subscription_periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.tenant_id = subscription_periods.tenant_id
        AND s.id = subscription_periods.subscription_id
        AND public.has_business_permission(s.tenant_id, s.business_id, ARRAY['owner', 'co_owner', 'finance'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage subscription_periods" ON public.subscription_periods;
CREATE POLICY "tenant_admin can manage subscription_periods"
  ON public.subscription_periods
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all subscription_periods" ON public.subscription_periods;
CREATE POLICY "master can manage all subscription_periods"
  ON public.subscription_periods
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- invoices & invoice_items & invoice_status_history
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own invoices" ON public.invoices;
CREATE POLICY "Business members can view own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Business owners and finance can manage own invoices" ON public.invoices;
CREATE POLICY "Business owners and finance can manage own invoices"
  ON public.invoices
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'finance'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant invoices" ON public.invoices;
CREATE POLICY "tenant_admin can manage tenant invoices"
  ON public.invoices
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all invoices" ON public.invoices;
CREATE POLICY "master can manage all invoices"
  ON public.invoices
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own invoice_items" ON public.invoice_items;
CREATE POLICY "Business members can view own invoice_items"
  ON public.invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "Business owners and finance can manage own invoice_items" ON public.invoice_items;
CREATE POLICY "Business owners and finance can manage own invoice_items"
  ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'finance'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage invoice_items" ON public.invoice_items;
CREATE POLICY "tenant_admin can manage invoice_items"
  ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all invoice_items" ON public.invoice_items;
CREATE POLICY "master can manage all invoice_items"
  ON public.invoice_items
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.invoice_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own invoice_status_history" ON public.invoice_status_history;
CREATE POLICY "Business members can view own invoice_status_history"
  ON public.invoice_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_status_history.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage invoice_status_history" ON public.invoice_status_history;
CREATE POLICY "tenant_admin can manage invoice_status_history"
  ON public.invoice_status_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_status_history.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all invoice_status_history" ON public.invoice_status_history;
CREATE POLICY "master can manage all invoice_status_history"
  ON public.invoice_status_history
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- payments & payment_refunds & payment_attempts
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own payments" ON public.payments;
CREATE POLICY "Business members can view own payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage payments" ON public.payments;
CREATE POLICY "tenant_admin can manage payments"
  ON public.payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all payments" ON public.payments;
CREATE POLICY "master can manage all payments"
  ON public.payments
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business finance can view own payment_refunds" ON public.payment_refunds;
CREATE POLICY "Business finance can view own payment_refunds"
  ON public.payment_refunds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments pay
      JOIN public.invoices i ON i.id = pay.invoice_id
      WHERE pay.id = payment_refunds.payment_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'finance'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage payment_refunds" ON public.payment_refunds;
CREATE POLICY "tenant_admin can manage payment_refunds"
  ON public.payment_refunds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.payments pay
      JOIN public.invoices i ON i.id = pay.invoice_id
      WHERE pay.id = payment_refunds.payment_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all payment_refunds" ON public.payment_refunds;
CREATE POLICY "master can manage all payment_refunds"
  ON public.payment_refunds
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own payment_attempts" ON public.payment_attempts;
CREATE POLICY "Business members can view own payment_attempts"
  ON public.payment_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payment_attempts.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage payment_attempts" ON public.payment_attempts;
CREATE POLICY "tenant_admin can manage payment_attempts"
  ON public.payment_attempts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payment_attempts.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all payment_attempts" ON public.payment_attempts;
CREATE POLICY "master can manage all payment_attempts"
  ON public.payment_attempts
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- financial_adjustments & payment_provider_events
-- ---------------------------------------------------------------------------

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business finance can view own financial_adjustments" ON public.financial_adjustments;
CREATE POLICY "Business finance can view own financial_adjustments"
  ON public.financial_adjustments
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'finance'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage financial_adjustments" ON public.financial_adjustments;
CREATE POLICY "tenant_admin can manage financial_adjustments"
  ON public.financial_adjustments
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all financial_adjustments" ON public.financial_adjustments;
CREATE POLICY "master can manage all financial_adjustments"
  ON public.financial_adjustments
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;

-- Webhooks/eventos do provedor: acesso restrito a service_role e operadores da plataforma
-- Tabela sem tenant_id: restrita a service_role e operadores master da plataforma
-- para evitar vazamento cross-tenant via webhooks de provedores.
DROP POLICY IF EXISTS "master can manage payment_provider_events" ON public.payment_provider_events;
CREATE POLICY "master can manage payment_provider_events"
  ON public.payment_provider_events
  FOR ALL
  USING (public.has_global_platform_role('master'));
