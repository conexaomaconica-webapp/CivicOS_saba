-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Content (012) + Import (013)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 012: banners
-- ---------------------------------------------------------------------------

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active banners in tenant" ON public.banners;
CREATE POLICY "Public can view active banners in tenant"
  ON public.banners
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
    AND start_at <= now()
    AND (end_at IS NULL OR end_at >= now())
  );

DROP POLICY IF EXISTS "tenant_admin can manage banners" ON public.banners;
CREATE POLICY "tenant_admin can manage banners"
  ON public.banners
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all banners" ON public.banners;
CREATE POLICY "master can manage all banners"
  ON public.banners
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: notification_templates
-- ---------------------------------------------------------------------------

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage notification_templates" ON public.notification_templates;
CREATE POLICY "tenant_admin can manage notification_templates"
  ON public.notification_templates
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all notification_templates" ON public.notification_templates;
CREATE POLICY "master can manage all notification_templates"
  ON public.notification_templates
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: notifications & notification_deliveries
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own notifications" ON public.notifications;
CREATE POLICY "User can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can manage own notifications" ON public.notifications;
CREATE POLICY "User can manage own notifications"
  ON public.notifications
  FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage tenant notifications" ON public.notifications;
CREATE POLICY "tenant_admin can manage tenant notifications"
  ON public.notifications
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all notifications" ON public.notifications;
CREATE POLICY "master can manage all notifications"
  ON public.notifications
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own notification_deliveries" ON public.notification_deliveries;
CREATE POLICY "User can view own notification_deliveries"
  ON public.notification_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_deliveries.notification_id
        AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage notification_deliveries" ON public.notification_deliveries;
CREATE POLICY "tenant_admin can manage notification_deliveries"
  ON public.notification_deliveries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_deliveries.notification_id
        AND public.has_tenant_admin_access(n.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all notification_deliveries" ON public.notification_deliveries;
CREATE POLICY "master can manage all notification_deliveries"
  ON public.notification_deliveries
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: coupons (anunciante) & coupon_redemptions
-- ---------------------------------------------------------------------------

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active coupons of published businesses" ON public.coupons;
CREATE POLICY "Public can view active coupons of published businesses"
  ON public.coupons
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until >= now())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.tenant_id = coupons.tenant_id
        AND b.id = coupons.business_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "Business marketing can manage own coupons" ON public.coupons;
CREATE POLICY "Business marketing can manage own coupons"
  ON public.coupons
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant coupons" ON public.coupons;
CREATE POLICY "tenant_admin can manage tenant coupons"
  ON public.coupons
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all coupons" ON public.coupons;
CREATE POLICY "master can manage all coupons"
  ON public.coupons
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "User can view own coupon_redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can redeem coupon" ON public.coupon_redemptions;
CREATE POLICY "User can redeem coupon"
  ON public.coupon_redemptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Business members can view own coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "Business members can view own coupon_redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_redemptions.coupon_id
        AND public.has_business_permission(c.tenant_id, c.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "tenant_admin can manage coupon_redemptions"
  ON public.coupon_redemptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_redemptions.coupon_id
        AND public.has_tenant_admin_access(c.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "master can manage all coupon_redemptions"
  ON public.coupon_redemptions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: articles, events & popups (conteúdo institucional)
-- ---------------------------------------------------------------------------

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published articles in tenant" ON public.articles;
CREATE POLICY "Public can view published articles in tenant"
  ON public.articles
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_published = true);

DROP POLICY IF EXISTS "tenant_admin can manage articles" ON public.articles;
CREATE POLICY "tenant_admin can manage articles"
  ON public.articles
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all articles" ON public.articles;
CREATE POLICY "master can manage all articles"
  ON public.articles
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published events in tenant" ON public.events;
CREATE POLICY "Public can view published events in tenant"
  ON public.events
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_published = true);

DROP POLICY IF EXISTS "tenant_admin can manage events" ON public.events;
CREATE POLICY "tenant_admin can manage events"
  ON public.events
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all events" ON public.events;
CREATE POLICY "master can manage all events"
  ON public.events
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active popups in tenant" ON public.popups;
CREATE POLICY "Public can view active popups in tenant"
  ON public.popups
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
    AND start_at <= now()
    AND (end_at IS NULL OR end_at >= now())
  );

DROP POLICY IF EXISTS "tenant_admin can manage popups" ON public.popups;
CREATE POLICY "tenant_admin can manage popups"
  ON public.popups
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all popups" ON public.popups;
CREATE POLICY "master can manage all popups"
  ON public.popups
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 013: import_jobs, import_files, import_rows, import_errors, import_execution_history
-- ---------------------------------------------------------------------------

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator can view own import_jobs" ON public.import_jobs;
CREATE POLICY "Creator can view own import_jobs"
  ON public.import_jobs
  FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage import_jobs" ON public.import_jobs;
CREATE POLICY "tenant_admin can manage import_jobs"
  ON public.import_jobs
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all import_jobs" ON public.import_jobs;
CREATE POLICY "master can manage all import_jobs"
  ON public.import_jobs
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_files" ON public.import_files;
CREATE POLICY "Users with access to job can view import_files"
  ON public.import_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_files.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_files" ON public.import_files;
CREATE POLICY "tenant_admin can manage import_files"
  ON public.import_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_files.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_files" ON public.import_files;
CREATE POLICY "master can manage all import_files"
  ON public.import_files
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_rows" ON public.import_rows;
CREATE POLICY "Users with access to job can view import_rows"
  ON public.import_rows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_rows.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_rows" ON public.import_rows;
CREATE POLICY "tenant_admin can manage import_rows"
  ON public.import_rows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_rows.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_rows" ON public.import_rows;
CREATE POLICY "master can manage all import_rows"
  ON public.import_rows
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_errors" ON public.import_errors;
CREATE POLICY "Users with access to job can view import_errors"
  ON public.import_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_errors.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_errors" ON public.import_errors;
CREATE POLICY "tenant_admin can manage import_errors"
  ON public.import_errors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_errors.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_errors" ON public.import_errors;
CREATE POLICY "master can manage all import_errors"
  ON public.import_errors
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_execution_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_execution_history" ON public.import_execution_history;
CREATE POLICY "Users with access to job can view import_execution_history"
  ON public.import_execution_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_execution_history.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_execution_history" ON public.import_execution_history;
CREATE POLICY "tenant_admin can manage import_execution_history"
  ON public.import_execution_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_execution_history.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_execution_history" ON public.import_execution_history;
CREATE POLICY "master can manage all import_execution_history"
  ON public.import_execution_history
  FOR ALL
  USING (public.has_global_platform_role('master'));
