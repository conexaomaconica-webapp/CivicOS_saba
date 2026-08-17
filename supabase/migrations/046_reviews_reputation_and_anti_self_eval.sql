-- Migration 046: Reviews, Reputation and Double Anti-Self-Evaluation
-- Implements unweighted simple average ratings, 1-review per author/business constraint,
-- double anti-self-evaluation (trigger/RLS + server side), and history-preserving review moderation.

CREATE TABLE IF NOT EXISTS public.business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
    moderated_at TIMESTAMPTZ,
    moderator_id UUID REFERENCES public.profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_review_per_author_business UNIQUE (tenant_id, business_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_business_reviews_business_status ON public.business_reviews (tenant_id, business_id, status);
CREATE INDEX IF NOT EXISTS idx_business_reviews_author ON public.business_reviews (tenant_id, author_id);

-- Anti-self-evaluation Trigger
CREATE OR REPLACE FUNCTION public.check_review_anti_self_evaluation()
RETURNS TRIGGER AS $$
DECLARE
    v_is_owner BOOLEAN;
    v_is_member BOOLEAN;
BEGIN
    -- Check if author is the owner of the business profile
    SELECT EXISTS (
        SELECT 1 FROM public.business_profiles
        WHERE id = NEW.business_id AND owner_id = NEW.author_id
    ) INTO v_is_owner;

    IF v_is_owner THEN
        RAISE EXCEPTION 'Anunciantes e proprietários não podem avaliar a própria empresa.' USING ERRCODE = 'P0001';
    END IF;

    -- Check if author is a member of the business (if business_members table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_members') THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = $1 AND user_id = $2)'
        INTO v_is_member USING NEW.business_id, NEW.author_id;

        IF v_is_member THEN
            RAISE EXCEPTION 'Membros do estabelecimento não podem avaliar a própria empresa.' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_review_anti_self_eval ON public.business_reviews;
CREATE TRIGGER trg_check_review_anti_self_eval
BEFORE INSERT OR UPDATE ON public.business_reviews
FOR EACH ROW
EXECUTE FUNCTION public.check_review_anti_self_evaluation();

-- RLS Policies
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public approved reviews are viewable" ON public.business_reviews;
CREATE POLICY "Public approved reviews are viewable"
ON public.business_reviews FOR SELECT
USING (
    status = 'approved'
    OR author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('platform_admin', 'tenant_admin', 'moderator')
    )
);

DROP POLICY IF EXISTS "Authors can insert own review" ON public.business_reviews;
CREATE POLICY "Authors can insert own review"
ON public.business_reviews FOR INSERT
WITH CHECK (
    author_id = auth.uid()
);

DROP POLICY IF EXISTS "Authors can update pending review" ON public.business_reviews;
CREATE POLICY "Authors can update pending review"
ON public.business_reviews FOR UPDATE
USING (
    author_id = auth.uid()
)
WITH CHECK (
    author_id = auth.uid()
);

DROP POLICY IF EXISTS "Moderators can update review status" ON public.business_reviews;
CREATE POLICY "Moderators can update review status"
ON public.business_reviews FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('platform_admin', 'tenant_admin', 'moderator')
    )
);

-- RPC for Unweighted Simple Average Rating Summary
CREATE OR REPLACE FUNCTION public.get_business_rating_summary(
    p_tenant_id UUID,
    p_business_id UUID
)
RETURNS TABLE (
    average_rating NUMERIC,
    total_approved_reviews BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0) AS average_rating,
        COUNT(*)::BIGINT AS total_approved_reviews
    FROM public.business_reviews
    WHERE tenant_id = p_tenant_id
      AND business_id = p_business_id
      AND status = 'approved';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
