-- Migration 050: Business Analytics & RLS Hardening with Explicit SET search_path = ''
-- Implements business_analytics_events with composite multitenant FKs, HMAC visitor session tracking,
-- differentiated deduplication windows per event_type, and strictly qualified SECURITY DEFINER RPCs.

CREATE TABLE IF NOT EXISTS public.business_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('page_view', 'contact_whatsapp', 'contact_phone', 'social_link', 'directions', 'event_view', 'post_view')),
    visitor_hmac VARCHAR(64) NOT NULL,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_analytics_business_multitenant FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_analytics_dedup 
ON public.business_analytics_events (tenant_id, business_id, event_type, visitor_hmac, created_at DESC);

-- RLS Hardening on Analytics Events Table
ALTER TABLE public.business_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct public access to analytics raw table" ON public.business_analytics_events;
CREATE POLICY "No direct public access to analytics raw table"
ON public.business_analytics_events FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('platform_admin', 'tenant_admin')
    )
);

-- RPC: Record Business Analytics Event (Strict SECURITY DEFINER with SET search_path = '')
CREATE OR REPLACE FUNCTION public.record_business_analytics_event(
    p_tenant_id UUID,
    p_business_id UUID,
    p_event_type VARCHAR(50),
    p_visitor_hmac VARCHAR(64),
    p_referrer TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_valid BOOLEAN := false;
    v_dedup_window INTERVAL;
    v_recent_count INT := 0;
BEGIN
    -- 1. Server-side validation: Business must belong to Tenant, be published and active
    SELECT EXISTS (
        SELECT 1 
        FROM public.businesses b
        WHERE b.id = p_business_id 
          AND b.tenant_id = p_tenant_id 
          AND b.is_active = true 
          AND b.publication_status = 'published'
    ) INTO v_is_valid;

    IF NOT v_is_valid THEN
        RETURN false;
    END IF;

    -- 2. Determine deduplication window by event_type
    IF p_event_type = 'page_view' THEN
        v_dedup_window := INTERVAL '1 hour';
    ELSIF p_event_type IN ('event_view', 'post_view') THEN
        v_dedup_window := INTERVAL '30 minutes';
    ELSIF p_event_type IN ('contact_whatsapp', 'contact_phone', 'social_link', 'directions') THEN
        v_dedup_window := INTERVAL '5 minutes';
    ELSE
        v_dedup_window := INTERVAL '15 minutes';
    END IF;

    -- 3. Check for existing event in deduplication window
    SELECT COUNT(*)::INT INTO v_recent_count
    FROM public.business_analytics_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.business_id = p_business_id
      AND e.event_type = p_event_type
      AND e.visitor_hmac = p_visitor_hmac
      AND e.created_at >= (NOW() - v_dedup_window);

    IF v_recent_count > 0 THEN
        RETURN false; -- Event deduplicated (rate-limited/debounced)
    END IF;

    -- 4. Insert analytics event
    INSERT INTO public.business_analytics_events (
        tenant_id,
        business_id,
        event_type,
        visitor_hmac,
        referrer,
        created_at
    ) VALUES (
        p_tenant_id,
        p_business_id,
        p_event_type,
        p_visitor_hmac,
        p_referrer,
        NOW()
    );

    RETURN true;
END;
$$;

-- RPC: Get Business Analytics Summary (Strict SECURITY DEFINER with SET search_path = '')
CREATE OR REPLACE FUNCTION public.get_business_analytics_summary(
    p_tenant_id UUID,
    p_business_id UUID,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    event_type VARCHAR(50),
    total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.event_type,
        COUNT(*)::BIGINT AS total_count
    FROM public.business_analytics_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.business_id = p_business_id
      AND e.created_at >= (NOW() - (GREATEST(p_days, 1) || ' days')::INTERVAL)
    GROUP BY e.event_type;
END;
$$;
