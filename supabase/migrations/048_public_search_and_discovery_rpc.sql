-- Migration 048: Public Search & Discovery RPC
-- Implements strict eligibility filtering, textual relevance-first search with moderate commercial boost,
-- deterministic pagination (max limit 50), total count calculation, and masonic org filter with public consent check.

CREATE OR REPLACE FUNCTION public.search_public_businesses(
    p_tenant_id UUID,
    p_query TEXT DEFAULT NULL,
    p_category VARCHAR(100) DEFAULT NULL,
    p_city VARCHAR(100) DEFAULT NULL,
    p_state VARCHAR(50) DEFAULT NULL,
    p_masonic_org_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    name VARCHAR(255),
    slug VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    plan_code VARCHAR(50),
    is_founder BOOLEAN,
    publication_status VARCHAR(30),
    logo_url TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    average_rating NUMERIC,
    total_approved_reviews BIGINT,
    total_count BIGINT
) AS $$
DECLARE
    v_limit INT;
    v_offset INT;
    v_clean_query TEXT;
BEGIN
    -- Enforce deterministic server-side pagination boundaries (max 50)
    v_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
    v_offset := GREATEST(COALESCE(p_offset, 0), 0);
    v_clean_query := TRIM(COALESCE(p_query, ''));

    RETURN QUERY
    WITH base_eligible AS (
        SELECT 
            b.id,
            b.tenant_id,
            b.name,
            b.slug,
            b.description,
            b.category,
            b.plan_code,
            COALESCE(b.is_founder, false) AS is_founder,
            b.publication_status,
            b.logo_url,
            b.city,
            b.state,
            -- Textual Relevance Score
            CASE 
                WHEN v_clean_query = '' THEN 100.0
                WHEN b.name ILIKE '%' || v_clean_query || '%' THEN 80.0
                WHEN b.category ILIKE '%' || v_clean_query || '%' THEN 60.0
                WHEN b.description ILIKE '%' || v_clean_query || '%' THEN 40.0
                ELSE 0.0
            END AS text_relevance,
            -- Tier Boost (Moderate)
            CASE LOWER(COALESCE(b.plan_code, 'bronze'))
                WHEN 'ouro' THEN 30.0
                WHEN 'prata' THEN 20.0
                WHEN 'bronze' THEN 10.0
                ELSE 0.0
            END AS tier_boost,
            -- Founder Boost (Moderate)
            CASE WHEN COALESCE(b.is_founder, false) THEN 5.0 ELSE 0.0 END AS founder_boost
        FROM public.business_profiles b
        WHERE b.tenant_id = p_tenant_id
          AND b.is_active = true
          AND b.publication_status = 'published'
          AND (p_category IS NULL OR LOWER(b.category) = LOWER(p_category))
          AND (p_city IS NULL OR LOWER(b.city) = LOWER(p_city))
          AND (p_state IS NULL OR LOWER(b.state) = LOWER(p_state))
          -- Masonic Org Filter (Checks explicit public consent if masonic link table exists)
          AND (
            p_masonic_org_id IS NULL OR EXISTS (
                SELECT 1 FROM public.masonic_business_links mbl
                WHERE mbl.business_id = b.id 
                  AND mbl.masonic_org_id = p_masonic_org_id
                  AND mbl.is_publicly_visible = true
            )
          )
          -- Search term match requirement if query provided
          AND (
            v_clean_query = '' OR
            b.name ILIKE '%' || v_clean_query || '%' OR
            b.category ILIKE '%' || v_clean_query || '%' OR
            b.description ILIKE '%' || v_clean_query || '%'
          )
    ),
    counted AS (
        SELECT COUNT(*)::BIGINT AS full_count FROM base_eligible
    ),
    scored AS (
        SELECT 
            e.*,
            (e.text_relevance + e.tier_boost + e.founder_boost) AS total_score,
            c.full_count
        FROM base_eligible e
        CROSS JOIN counted c
    )
    SELECT
        s.id,
        s.tenant_id,
        s.name,
        s.slug,
        s.description,
        s.category,
        s.plan_code,
        s.is_founder,
        s.publication_status,
        s.logo_url,
        s.city,
        s.state,
        COALESCE(r.average_rating, 0.0) AS average_rating,
        COALESCE(r.total_approved_reviews, 0::BIGINT) AS total_approved_reviews,
        s.full_count AS total_count
    FROM scored s
    LEFT JOIN LATERAL (
        SELECT * FROM public.get_business_rating_summary(s.tenant_id, s.id)
    ) r ON true
    ORDER BY 
        s.total_score DESC,
        s.name ASC,
        s.id ASC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
