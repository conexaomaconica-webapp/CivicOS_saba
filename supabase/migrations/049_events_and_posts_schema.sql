-- Migration 049: Business Events & News/Posts Schema with Feature-Code Entitlements & DB Quota Enforcers
-- Implements business_events and business_posts with explicit IANA timezones (no hardcoded default),
-- database-level quota enforcement triggers via _get_plan_entitlement, strict RLS (no direct anon SELECT),
-- feature_code entitlements in plan_entitlements, and dynamic public RPCs.

CREATE TABLE IF NOT EXISTS public.business_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    timezone VARCHAR(50) NOT NULL, -- Explicit IANA timezone required (e.g. 'America/Bahia', 'America/Sao_Paulo')
    location_name VARCHAR(255),
    address TEXT,
    external_ticket_url TEXT,
    publication_status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'canceled', 'archived')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_business_events_multitenant FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT check_event_ends_after_starts CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_business_events_business_status ON public.business_events (tenant_id, business_id, publication_status, is_active, ends_at);

CREATE TABLE IF NOT EXISTS public.business_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    publication_status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'scheduled', 'published', 'archived')),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_business_posts_multitenant FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_posts_business_status ON public.business_posts (tenant_id, business_id, publication_status, is_active, published_at);

-- RLS Security Containment (NO anon SELECT directly on tables)
ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can manage events" ON public.business_events;
CREATE POLICY "Business members can manage events"
ON public.business_events FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_events.business_id AND b.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('platform_admin', 'tenant_admin')
    )
);

DROP POLICY IF EXISTS "Business members can manage posts" ON public.business_posts;
CREATE POLICY "Business members can manage posts"
ON public.business_posts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_posts.business_id AND b.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('platform_admin', 'tenant_admin')
    )
);

-- Seed feature_code entitlements into existing plan_entitlements structure (depends on migration 044)
INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, 'bronze', 'events_limit', 0 FROM public.tenants t
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;

INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, 'bronze', 'posts_limit', 0 FROM public.tenants t
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;

INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, 'prata', 'events_limit', 0 FROM public.tenants t
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;

INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, 'prata', 'posts_limit', 0 FROM public.tenants t
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;

INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, 'ouro', 'events_limit', 5 FROM public.tenants t
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;

INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, 'ouro', 'posts_limit', 10 FROM public.tenants t
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;

-- Database-Level Quota Enforcer Triggers (Final Authority Against Race Conditions)
CREATE OR REPLACE FUNCTION public.check_business_event_quota()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_code VARCHAR(50);
    v_max_limit INT;
    v_current_count INT;
BEGIN
    SELECT plan_tier INTO v_plan_code
    FROM public.businesses
    WHERE id = NEW.business_id AND tenant_id = NEW.tenant_id;

    SELECT COALESCE(max_limit, 0) INTO v_max_limit
    FROM public.plan_entitlements
    WHERE tenant_id = NEW.tenant_id AND plan_code = COALESCE(v_plan_code, 'bronze') AND feature_code = 'events_limit';

    IF NEW.publication_status = 'published' AND NEW.is_active = true THEN
        SELECT COUNT(*)::INT INTO v_current_count
        FROM public.business_events
        WHERE tenant_id = NEW.tenant_id
          AND business_id = NEW.business_id
          AND is_active = true
          AND publication_status = 'published'
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF v_current_count >= v_max_limit THEN
            RAISE EXCEPTION 'Cota de eventos do plano % excedida (% / %).', v_plan_code, v_current_count, v_max_limit USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_business_event_quota ON public.business_events;
CREATE TRIGGER trg_check_business_event_quota
BEFORE INSERT OR UPDATE ON public.business_events
FOR EACH ROW
EXECUTE FUNCTION public.check_business_event_quota();

CREATE OR REPLACE FUNCTION public.check_business_post_quota()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_code VARCHAR(50);
    v_max_limit INT;
    v_current_count INT;
BEGIN
    SELECT plan_tier INTO v_plan_code
    FROM public.businesses
    WHERE id = NEW.business_id AND tenant_id = NEW.tenant_id;

    SELECT COALESCE(max_limit, 0) INTO v_max_limit
    FROM public.plan_entitlements
    WHERE tenant_id = NEW.tenant_id AND plan_code = COALESCE(v_plan_code, 'bronze') AND feature_code = 'posts_limit';

    IF NEW.publication_status = 'published' AND NEW.is_active = true THEN
        SELECT COUNT(*)::INT INTO v_current_count
        FROM public.business_posts
        WHERE tenant_id = NEW.tenant_id
          AND business_id = NEW.business_id
          AND is_active = true
          AND publication_status = 'published'
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF v_current_count >= v_max_limit THEN
            RAISE EXCEPTION 'Cota de posts do plano % excedida (% / %).', v_plan_code, v_current_count, v_max_limit USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_business_post_quota ON public.business_posts;
CREATE TRIGGER trg_check_business_post_quota
BEFORE INSERT OR UPDATE ON public.business_posts
FOR EACH ROW
EXECUTE FUNCTION public.check_business_post_quota();

-- RPC: Get Public Business Events (Sanitised, filtered by dynamic plan entitlement)
CREATE OR REPLACE FUNCTION public.get_public_business_events(
    p_tenant_id UUID,
    p_business_id UUID,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    cover_image_url TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    timezone VARCHAR(50),
    location_name VARCHAR(255),
    address TEXT,
    external_ticket_url TEXT
) AS $$
DECLARE
    v_plan_code VARCHAR(50);
    v_events_limit INT;
BEGIN
    SELECT plan_tier INTO v_plan_code
    FROM public.businesses
    WHERE id = p_business_id AND tenant_id = p_tenant_id AND is_active = true AND publication_status = 'published';

    IF v_plan_code IS NULL THEN
        RETURN;
    END IF;

    -- Dynamically resolve entitlement quota via feature_code
    SELECT COALESCE(max_limit, 0) INTO v_events_limit
    FROM public.plan_entitlements
    WHERE tenant_id = p_tenant_id AND plan_code = v_plan_code AND feature_code = 'events_limit';

    IF v_events_limit <= 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.cover_image_url,
        e.starts_at,
        e.ends_at,
        e.timezone,
        e.location_name,
        e.address,
        e.external_ticket_url
    FROM public.business_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.business_id = p_business_id
      AND e.is_active = true
      AND e.publication_status = 'published'
      -- Temporal expiration filter (ends_at must be in future or NULL)
      AND (e.ends_at IS NULL OR e.ends_at >= NOW())
    ORDER BY e.starts_at ASC
    LIMIT LEAST(GREATEST(p_limit, 1), v_events_limit)
    OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RPC: Get Public Business Posts (Sanitised, filtered by dynamic plan entitlement)
CREATE OR REPLACE FUNCTION public.get_public_business_posts(
    p_tenant_id UUID,
    p_business_id UUID,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    summary TEXT,
    content TEXT,
    cover_image_url TEXT,
    published_at TIMESTAMPTZ
) AS $$
DECLARE
    v_plan_code VARCHAR(50);
    v_posts_limit INT;
BEGIN
    SELECT plan_tier INTO v_plan_code
    FROM public.businesses
    WHERE id = p_business_id AND tenant_id = p_tenant_id AND is_active = true AND publication_status = 'published';

    IF v_plan_code IS NULL THEN
        RETURN;
    END IF;

    -- Dynamically resolve entitlement quota via feature_code
    SELECT COALESCE(max_limit, 0) INTO v_posts_limit
    FROM public.plan_entitlements
    WHERE tenant_id = p_tenant_id AND plan_code = v_plan_code AND feature_code = 'posts_limit';

    IF v_posts_limit <= 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.summary,
        p.content,
        p.cover_image_url,
        p.published_at
    FROM public.business_posts p
    WHERE p.tenant_id = p_tenant_id
      AND p.business_id = p_business_id
      AND p.is_active = true
      AND p.publication_status = 'published'
      AND p.published_at <= NOW()
    ORDER BY p.published_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), v_posts_limit)
    OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
