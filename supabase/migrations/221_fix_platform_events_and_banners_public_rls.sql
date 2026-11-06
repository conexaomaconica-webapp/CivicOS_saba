-- ============================================================================
-- Migration 221: Fix Public RLS for platform_events and directory_banners
-- ============================================================================
-- Corrige a restrição de políticas RLS para leitura pública anônima nas tabelas:
-- 1. platform_events: garante que a política administrativa seja TO authenticated,
--    evitando que a consulta pública avalie a tabela profiles (erro 42501).
-- 2. directory_banners: garante que a política administrativa seja TO authenticated,
--    evitando que a consulta pública avalie has_tenant_admin_access (erro 42501).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. platform_events
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published events" ON public.platform_events;
CREATE POLICY "Public can read published events"
    ON public.platform_events
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

DROP POLICY IF EXISTS "Admin full access on platform_events" ON public.platform_events;
CREATE POLICY "Admin full access on platform_events"
    ON public.platform_events
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
        )
    );

GRANT SELECT ON public.platform_events TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. directory_banners
-- ---------------------------------------------------------------------------
ALTER TABLE public.directory_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read directory_banners" ON public.directory_banners;
CREATE POLICY "Public read directory_banners"
    ON public.directory_banners
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Tenant admin manage directory_banners" ON public.directory_banners;
CREATE POLICY "Tenant admin manage directory_banners"
    ON public.directory_banners
    FOR ALL
    TO authenticated
    USING (public.has_tenant_admin_access(tenant_id))
    WITH CHECK (public.has_tenant_admin_access(tenant_id));

GRANT SELECT ON public.directory_banners TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Notificação para reload do schema PostgREST
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
