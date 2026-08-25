-- Migration 068: Approval Dossier 360º RPCs and Operational Correction Events

-- 1. Add correction_requested to operational_notifications event_type constraint if constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'operational_notifications_event_type_check'
  ) THEN
    ALTER TABLE public.operational_notifications DROP CONSTRAINT operational_notifications_event_type_check;
  END IF;
END $$;

ALTER TABLE public.operational_notifications
  ADD CONSTRAINT operational_notifications_event_type_check
  CHECK (event_type IN (
    'registration_completed',
    'contract_signed',
    'payment_confirmed',
    'payment_pending',
    'payment_overdue',
    'company_approved',
    'company_rejected',
    'company_suspended',
    'correction_requested',
    'masonic_link_verified',
    'subscription_expiring',
    'quota_reached'
  ));

-- 2. Add correction_notes column to businesses table if not existing
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS correction_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_correction_requested_at TIMESTAMPTZ;

-- 3. RPC: Listagem do Diretório de Aprovações com Cálculo de Requisitos & Qualidade
CREATE OR REPLACE FUNCTION public.get_admin_approval_directory_list()
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  category TEXT,
  publication_status TEXT,
  owner_email TEXT,
  owner_name TEXT,
  plan_code TEXT,
  created_at TIMESTAMPTZ,
  is_founder BOOLEAN,
  is_pedra_fundamental BOOLEAN,
  is_coluna_honra BOOLEAN,
  has_responsible BOOLEAN,
  has_business_data BOOLEAN,
  has_masonic_link BOOLEAN,
  has_signed_contract BOOLEAN,
  has_valid_payment BOOLEAN,
  is_ready_for_approval BOOLEAN,
  completeness_percent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.tenant_id,
    b.name,
    b.category,
    b.publication_status::TEXT,
    p.email AS owner_email,
    p.full_name AS owner_name,
    b.plan_code,
    b.created_at,
    COALESCE(b.is_founder, false) AS is_founder,
    COALESCE(b.is_pedra_fundamental, false) AS is_pedra_fundamental,
    COALESCE(b.is_coluna_honra, false) AS is_coluna_honra,
    (b.owner_id IS NOT NULL) AS has_responsible,
    (b.name IS NOT NULL AND LENGTH(TRIM(b.name)) > 0) AS has_business_data,
    EXISTS (SELECT 1 FROM public.masonic_affiliations ma WHERE ma.user_id = b.owner_id AND ma.verification_status = 'verified') AS has_masonic_link,
    EXISTS (SELECT 1 FROM public.contract_snapshots cs WHERE cs.business_id = b.id AND cs.status = 'signed') AS has_signed_contract,
    EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.business_id = b.id AND s.status IN ('active', 'paid', 'trialing')) AS has_valid_payment,
    (
      b.owner_id IS NOT NULL AND
      (b.name IS NOT NULL AND LENGTH(TRIM(b.name)) > 0) AND
      EXISTS (SELECT 1 FROM public.contract_snapshots cs WHERE cs.business_id = b.id AND cs.status = 'signed')
    ) AS is_ready_for_approval,
    (
      (CASE WHEN b.owner_id IS NOT NULL THEN 15 ELSE 0 END) +
      (CASE WHEN b.name IS NOT NULL AND LENGTH(TRIM(b.name)) > 0 THEN 15 ELSE 0 END) +
      (CASE WHEN b.logo_url IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN b.banner_url IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN b.description IS NOT NULL AND LENGTH(TRIM(b.description)) > 10 THEN 10 ELSE 0 END) +
      (CASE WHEN b.whatsapp IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN b.address IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN EXISTS (SELECT 1 FROM public.contract_snapshots cs WHERE cs.business_id = b.id AND cs.status = 'signed') THEN 10 ELSE 0 END) +
      (CASE WHEN EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.business_id = b.id AND s.status IN ('active', 'paid', 'trialing')) THEN 10 ELSE 0 END)
    )::INTEGER AS completeness_percent
  FROM public.businesses b
  LEFT JOIN public.profiles p ON p.id = b.owner_id
  ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_approval_directory_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_approval_directory_list() TO service_role;
