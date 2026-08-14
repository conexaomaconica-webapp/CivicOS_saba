-- ============================================================================
-- 038 — LGPD Fase 3: Privacidade do titular (USR-007)
-- ============================================================================
-- 1. FKs auditáveis: evidência LGPD nunca em cascata (CRIT-TRN-015). Aceites,
--    consentimentos e credenciais passam a SET NULL em exclusão física futura.
-- 2. RPCs do titular (SECURITY DEFINER, padrão 036):
--    list_my_acceptances, list_my_consents, export_personal_data,
--    request_account_deletion — com eventos canônicos de privacidade no outbox.
-- 3. Soft-delete de conta (profiles.status/deleted_at) + seed privacy:delete_account.
--    Expurgo físico (admin.deleteUser + retention) fica na Fase 4.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. FKs auditáveis (SET NULL, nunca CASCADE em dados auditáveis)
-- ---------------------------------------------------------------------------

-- 1.1 acceptance_records.user_id: NOT NULL CASCADE → nullable SET NULL
ALTER TABLE public.acceptance_records
  DROP CONSTRAINT IF EXISTS acceptance_records_user_id_fkey;
ALTER TABLE public.acceptance_records
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.acceptance_records
  DROP CONSTRAINT IF EXISTS fk_acceptance_user_setnull;
ALTER TABLE public.acceptance_records
  ADD CONSTRAINT fk_acceptance_user_setnull
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 1.2 consent_records.user_id: NOT NULL CASCADE → nullable SET NULL
ALTER TABLE public.consent_records
  DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey;
ALTER TABLE public.consent_records
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.consent_records
  DROP CONSTRAINT IF EXISTS fk_consent_user_setnull;
ALTER TABLE public.consent_records
  ADD CONSTRAINT fk_consent_user_setnull
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 1.3 credential_issuances.user_id (alvo de credencial): CASCADE → SET NULL
ALTER TABLE public.credential_issuances
  DROP CONSTRAINT IF EXISTS credential_issuances_user_id_fkey;
ALTER TABLE public.credential_issuances
  DROP CONSTRAINT IF EXISTS fk_cred_issuance_user_setnull;
ALTER TABLE public.credential_issuances
  ADD CONSTRAINT fk_cred_issuance_user_setnull
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2. Soft-delete do perfil (profiles.status/deleted_at)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deleted')),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. RPC: list_my_acceptances
-- ---------------------------------------------------------------------------
-- Lista os aceites legais do próprio titular (CRIT-TRN-012): documento, versão,
-- data e hash SHA-256 da minuta aceita.

CREATE OR REPLACE FUNCTION public.list_my_acceptances()
RETURNS TABLE (
  code TEXT,
  version TEXT,
  accepted_at TIMESTAMPTZ,
  content_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
    SELECT d.code, v.version, a.accepted_at, a.content_hash
    FROM public.acceptance_records a
    JOIN public.legal_document_versions v ON v.id = a.document_version_id
    JOIN public.legal_documents d ON d.id = v.document_id
    WHERE a.user_id = v_user_id
    ORDER BY a.accepted_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC: list_my_consents
-- ---------------------------------------------------------------------------
-- Lista os consentimentos do titular com status e revogação (append-only).

CREATE OR REPLACE FUNCTION public.list_my_consents()
RETURNS TABLE (
  consent_id UUID,
  purpose TEXT,
  granted BOOLEAN,
  created_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  doc_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
    SELECT c.id, c.purpose, c.granted, c.created_at,
           w.withdrawn_at, w.reason, v.version
    FROM public.consent_records c
    LEFT JOIN public.consent_withdrawals w ON w.consent_id = c.id
    LEFT JOIN public.legal_document_versions v ON v.id = c.document_version_id
    WHERE c.user_id = v_user_id
    ORDER BY c.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: export_personal_data (portabilidade — CRIT-TRN-014)
-- ---------------------------------------------------------------------------
-- Exporta em JSONB apenas dados do próprio titular: perfil, aceites,
-- consentimentos (com revogações), afiliação maçônica, vínculos e businesses
-- próprios. Nenhum dado de terceiros. Emite privacy.data_exported.v1 (payload
-- sem PII — apenas contagens e timestamp).

CREATE OR REPLACE FUNCTION public.export_personal_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID := public.current_tenant_id();
  v_exported JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não resolvido — entre novamente';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'profile', jsonb_build_object(
      'name', p.name, 'email', p.email, 'role', p.role,
      'created_at', p.created_at, 'tenant_id', p.tenant_id::text
    ),
    'acceptances', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'code', d.code, 'version', v.version,
        'accepted_at', a.accepted_at, 'content_hash', a.content_hash
      ))
      FROM public.acceptance_records a
      JOIN public.legal_document_versions v ON v.id = a.document_version_id
      JOIN public.legal_documents d ON d.id = v.document_id
      WHERE a.user_id = v_user_id
    ), '[]'::jsonb),
    'consents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'purpose', c.purpose, 'granted', c.granted,
        'created_at', c.created_at, 'withdrawn_at', w.withdrawn_at,
        'withdrawal_reason', w.reason, 'document_version', v.version
      ))
      FROM public.consent_records c
      LEFT JOIN public.consent_withdrawals w ON w.consent_id = c.id
      LEFT JOIN public.legal_document_versions v ON v.id = c.document_version_id
      WHERE c.user_id = v_user_id
    ), '[]'::jsonb),
    'masonic_affiliation', (
      SELECT to_jsonb(ma)
      FROM public.masonic_affiliations ma
      WHERE ma.user_id = v_user_id
    ),
    'masonic_links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'business_name', b.name, 'link_type', bml.link_type,
        'status', bml.status, 'created_at', bml.created_at,
        'verified_at', bml.verified_at, 'valid_until', bml.valid_until
      ))
      FROM public.business_masonic_links bml
      JOIN public.businesses b ON b.tenant_id = bml.tenant_id AND b.id = bml.business_id
      WHERE bml.declaring_user_id = v_user_id
    ), '[]'::jsonb),
    'businesses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', b.name, 'slug', b.slug, 'category', b.category,
        'plan_tier', b.plan_tier, 'publication_status', b.publication_status,
        'is_active', b.is_active, 'created_at', b.created_at
      ))
      FROM public.businesses b
      WHERE b.owner_id = v_user_id
    ), '[]'::jsonb)
  )
  INTO v_exported
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_exported IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  INSERT INTO public.outbox_events
    (event_id, event_type, schema_version, event_version, tenant_id,
     aggregate_type, aggregate_id, aggregate_version, producer,
     actor_type, actor_id, payload)
  VALUES
    (gen_random_uuid()::text, 'privacy.data_exported.v1', '1.0', '1.0', v_tenant_id,
     'profile', v_user_id::text, 1, 'lgpd-rpc',
     'user', v_user_id::text,
     jsonb_build_object(
       'exported_at', now(),
       'acceptance_count', (SELECT count(*)::int FROM public.acceptance_records WHERE user_id = v_user_id),
       'consent_count', (SELECT count(*)::int FROM public.consent_records WHERE user_id = v_user_id)
     ));

  RETURN v_exported;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: request_account_deletion
-- ---------------------------------------------------------------------------
-- Soft-delete da conta com preservação de trilha (CRIT-TRN-015):
--   1. Bloqueia se houver obrigação financeira pendente (checkouts/allocations).
--   2. Revoga todos os consentimentos ativos (reusa revoke_consent, que propaga
--      para consents de publicação e transiciona vínculos para revoked).
--   3. Remove a afiliação maçônica (dado mais sensível) e revoga vínculos
--      remanescentes com history account_deleted.
--   4. Businesses do titular saem da vitrine (is_active=false, suspended).
--   5. profiles.status='deleted' + deleted_at; auditoria + evento outbox.
-- O expurgo físico (admin.deleteUser + retention) acontece na Fase 4.

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID := public.current_tenant_id();
  v_consent public.consent_records;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não resolvido — entre novamente';
  END IF;

  -- 1. Bloqueio por obrigação financeira pendente
  IF EXISTS (
    SELECT 1 FROM public.subscription_checkouts
    WHERE user_id = v_user_id
      AND payment_status NOT IN ('refunded', 'failed', 'refund_required')
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_BLOCKED_FINANCIAL'
      USING HINT = 'Existem pagamentos pendentes — finalize antes de excluir a conta';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.founder_allocations
    WHERE user_id = v_user_id
      AND status IN ('reserved', 'granted', 'refund_required')
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_BLOCKED_FINANCIAL'
      USING HINT = 'Existem reservas ou concessões pendentes — finalize antes de excluir a conta';
  END IF;

  -- 2. Revogar todos os consentimentos ativos (propaga para a vitrine)
  FOR v_consent IN
    SELECT * FROM public.consent_records
    WHERE user_id = v_user_id AND granted = true
  LOOP
    PERFORM public.revoke_consent(v_consent.id, 'exclusão de conta');
  END LOOP;

  -- 3. Remover afiliação maçônica (dado mais sensível)
  DELETE FROM public.masonic_affiliations
  WHERE user_id = v_user_id;

  -- 4. Vínculos remanescentes (drafts etc.) → revoked com history auditável
  UPDATE public.business_masonic_links
  SET status = 'revoked', updated_at = now()
  WHERE declaring_user_id = v_user_id
    AND status NOT IN ('revoked');

  INSERT INTO public.business_masonic_link_history
    (tenant_id, link_id, action_type, previous_status, new_status,
     changed_fields, actor_id, action_reason, source)
  SELECT bml.tenant_id, bml.id, 'account_deleted',
         bml.status, 'revoked',
         ARRAY['status'], v_user_id, 'exclusão de conta', 'lgpd_rpc'
  FROM public.business_masonic_links bml
  WHERE bml.declaring_user_id = v_user_id
    AND bml.status NOT IN ('revoked');

  -- 5. Businesses do titular saem da vitrine
  UPDATE public.businesses
  SET is_active = false,
      publication_status = 'suspended',
      updated_at = now()
  WHERE owner_id = v_user_id;

  -- 6. Soft-delete do perfil
  UPDATE public.profiles
  SET status = 'deleted', deleted_at = now()
  WHERE id = v_user_id;

  -- 7. Trilha de auditoria
  INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
  VALUES (
    v_tenant_id, v_user_id, 'account.deletion_requested', 'profiles',
    jsonb_build_object('profile_id', v_user_id::text, 'deleted_at', now())
  );

  -- 8. Evento canônico
  INSERT INTO public.outbox_events
    (event_id, event_type, schema_version, event_version, tenant_id,
     aggregate_type, aggregate_id, aggregate_version, producer,
     actor_type, actor_id, payload)
  VALUES
    (gen_random_uuid()::text, 'privacy.account_deletion_requested.v1', '1.0', '1.0', v_tenant_id,
     'profile', v_user_id::text, 1, 'lgpd-rpc',
     'user', v_user_id::text,
     jsonb_build_object('deleted_at', now()));
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Permissões e grants
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (code, module, description) VALUES
  ('privacy:delete_account', 'lgpd', 'Solicitar exclusão da própria conta (soft-delete)')
ON CONFLICT (code) DO NOTHING;

REVOKE ALL ON FUNCTION public.list_my_acceptances() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_acceptances() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_my_acceptances() TO authenticated;

REVOKE ALL ON FUNCTION public.list_my_consents() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_consents() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_my_consents() TO authenticated;

REVOKE ALL ON FUNCTION public.export_personal_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_personal_data() FROM anon;
GRANT EXECUTE ON FUNCTION public.export_personal_data() TO authenticated;

REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_account_deletion() FROM anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;