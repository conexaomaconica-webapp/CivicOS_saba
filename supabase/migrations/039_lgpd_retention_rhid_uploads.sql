-- ============================================================================
-- 039 — LGPD Fase 4: RHID, retenção/expurgo, uploads ≤10MB
-- ============================================================================
-- 1. RHID (CRIT-TRN-013 — pseudonimização): pseudônimo por tenant em profiles,
--    gerado como SHA-256(tenant_id:user_id) — não reversível, único por conta.
--    Uso: alimentar analytics_events.pseudonymous_subject_id (nunca user_id/IP).
-- 2. FKs de expurgo físico: atores/entidades passam a SET NULL para permitir a
--    exclusão física futura (admin.deleteUser) SEM cascata em dados auditáveis
--    (CRIT-TRN-015) e SEM destruir dados de terceiros (reviews, favoritos).
-- 3. NFR-008: evidências de vínculo limitadas a 10MB (enforcement no banco).
-- 4. RPCs de retenção/expurgo (service_role ONLY, com guarda auth.role()):
--    - purge_stale_business_drafts   (XS-003: rascunhos inativos > p_days)
--    - list_accounts_pending_purge   (suporte a admin.deleteUser externo)
--    - purge_soft_deleted_accounts   (expurgo físico via auth.users)
--    Agendamento diário via pg_cron quando disponível (best-effort).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RHID — pseudonimização por tenant (CRIT-TRN-013)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rhid TEXT;

-- Backfill de contas existentes (SHA-256 não reversível de tenant:user).
UPDATE public.profiles
SET rhid = encode(sha256((COALESCE(tenant_id::text, '') || ':' || id::text)::bytea), 'hex')
WHERE rhid IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_rhid ON public.profiles(rhid);

-- Mantém o RHID sincronizado em novas contas e re-emite quando o tenant muda.
CREATE OR REPLACE FUNCTION public.assign_profile_rhid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rhid IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id) THEN
    NEW.rhid := encode(
      sha256((COALESCE(NEW.tenant_id::text, '') || ':' || NEW.id::text)::bytea),
      'hex'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_assign_rhid ON public.profiles;
CREATE TRIGGER trg_profiles_assign_rhid
  BEFORE INSERT OR UPDATE OF tenant_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_profile_rhid();

-- ---------------------------------------------------------------------------
-- 2. FKs de expurgo físico → SET NULL (sem cascata destrutiva)
-- ---------------------------------------------------------------------------

-- 2.1 businesses.owner_id: CASCADE → SET NULL (não destrói reviews/favoritos/
--     vínculos de terceiros ao expurgar a conta do proprietário)
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey;
ALTER TABLE public.businesses
  ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS fk_businesses_owner_setnull;
ALTER TABLE public.businesses
  ADD CONSTRAINT fk_businesses_owner_setnull
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2.2 credential_evidence.uploaded_by: RESTRICT → SET NULL (referência de ator)
ALTER TABLE public.credential_evidence
  DROP CONSTRAINT IF EXISTS credential_evidence_uploaded_by_fkey;
ALTER TABLE public.credential_evidence
  ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.credential_evidence
  DROP CONSTRAINT IF EXISTS fk_cred_evidence_uploader_setnull;
ALTER TABLE public.credential_evidence
  ADD CONSTRAINT fk_cred_evidence_uploader_setnull
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2.3 subscription_checkouts.user_id: RESTRICT → SET NULL (contrato financeiro
--     permanece auditável após expurgo; retenção fiscal segue na Fase 4.2)
ALTER TABLE public.subscription_checkouts
  DROP CONSTRAINT IF EXISTS subscription_checkouts_user_id_fkey;
ALTER TABLE public.subscription_checkouts
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.subscription_checkouts
  DROP CONSTRAINT IF EXISTS fk_checkouts_user_setnull;
ALTER TABLE public.subscription_checkouts
  ADD CONSTRAINT fk_checkouts_user_setnull
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2.4 founder_allocations.user_id: RESTRICT → SET NULL (mesma lógica)
ALTER TABLE public.founder_allocations
  DROP CONSTRAINT IF EXISTS founder_allocations_user_id_fkey;
ALTER TABLE public.founder_allocations
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.founder_allocations
  DROP CONSTRAINT IF EXISTS fk_allocations_user_setnull;
ALTER TABLE public.founder_allocations
  ADD CONSTRAINT fk_allocations_user_setnull
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 3. NFR-008 — uploads de evidência ≤ 10MB (enforcement no banco)
-- ---------------------------------------------------------------------------
-- NOT VALID: linhas históricas não bloqueiam a migration; novas gravações
-- passam a ser validadas. Validar dados antigos depois:
--   ALTER TABLE ... VALIDATE CONSTRAINT chk_bmle_file_size_max;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_bmle_file_size_max' AND conrelid = 'public.business_masonic_link_evidence'::regclass
  ) THEN
    ALTER TABLE public.business_masonic_link_evidence
      ADD CONSTRAINT chk_bmle_file_size_max
      CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760)
      NOT VALID;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPCs de retenção/expurgo (service_role only)
-- ---------------------------------------------------------------------------

-- 4.1 XS-003: expurga rascunhos de onboarding inativos (GAP-DOC07-001).
--     Rascunhos de businesses SEM vínculos maçônicos (preserva trilhas) e
--     criados há mais de p_days são removidos com auditoria prévia.
CREATE OR REPLACE FUNCTION public.purge_stale_business_drafts(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_batch RECORD;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso restrito a service_role';
  END IF;

  FOR v_batch IN
    SELECT b.id, b.tenant_id, b.slug, b.created_at
    FROM public.businesses b
    WHERE b.publication_status = 'draft'
      AND b.created_at < now() - make_interval(days => p_days)
      AND NOT EXISTS (
        SELECT 1 FROM public.business_masonic_links bml
        WHERE bml.tenant_id = b.tenant_id AND bml.business_id = b.id
      )
    ORDER BY b.created_at
    LIMIT 500
  LOOP
    INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
    VALUES (
      v_batch.tenant_id, NULL, 'retention.purged_draft', 'businesses',
      jsonb_build_object(
        'business_id', v_batch.id::text,
        'slug', v_batch.slug,
        'created_at', v_batch.created_at,
        'retention_days', p_days
      )
    );

    DELETE FROM public.businesses
    WHERE id = v_batch.id AND tenant_id = v_batch.tenant_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 4.2 Suporte ao expurgo físico externo (admin.deleteUser via runner/edge fn):
--     lista contas soft-deletadas elegíveis, já sem obrigações financeiras.
CREATE OR REPLACE FUNCTION public.list_accounts_pending_purge(p_days INTEGER DEFAULT 30)
RETURNS TABLE (user_id UUID, deleted_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso restrito a service_role';
  END IF;

  RETURN QUERY
    SELECT p.id, p.deleted_at
    FROM public.profiles p
    WHERE p.status = 'deleted'
      AND p.deleted_at <= now() - make_interval(days => p_days)
      AND NOT EXISTS (
        SELECT 1 FROM public.subscription_checkouts sc
        WHERE sc.user_id = p.id
          AND sc.payment_status NOT IN ('refunded', 'failed', 'refund_required')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.founder_allocations fa
        WHERE fa.user_id = p.id
          AND fa.status IN ('reserved', 'granted', 'refund_required')
      )
    ORDER BY p.deleted_at;
END;
$$;

-- 4.3 Expurgo físico: deleta contas soft-deletadas elegíveis (auth.users).
--     FKs auditáveis já foram migradas para SET NULL (seção 2); trilha de
--     auditoria é registrada ANTES do delete (user_id vira NULL via SET NULL
--     e o id fica preservado em details).
CREATE OR REPLACE FUNCTION public.purge_soft_deleted_accounts(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso restrito a service_role';
  END IF;

  FOR v_row IN
    SELECT user_id, deleted_at FROM public.list_accounts_pending_purge(p_days)
    LIMIT 200
  LOOP
    BEGIN
      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        (SELECT tenant_id FROM public.profiles WHERE id = v_row.user_id),
        v_row.user_id, 'account.purged_physical', 'profiles',
        jsonb_build_object('user_id', v_row.user_id::text, 'soft_deleted_at', v_row.deleted_at)
      );

      DELETE FROM auth.users WHERE id = v_row.user_id;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Referências residuais (ex: assigned_by sem ação de delete): mantém a
      -- conta para o próximo ciclo e segue sem interromper o lote.
      RAISE NOTICE 'Conta % mantida: %', v_row.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants (service_role only) + agendamento best-effort
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.purge_stale_business_drafts(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_stale_business_drafts(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.purge_stale_business_drafts(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_stale_business_drafts(INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.list_accounts_pending_purge(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_accounts_pending_purge(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.list_accounts_pending_purge(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.list_accounts_pending_purge(INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.purge_soft_deleted_accounts(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_soft_deleted_accounts(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.purge_soft_deleted_accounts(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_soft_deleted_accounts(INTEGER) TO service_role;

-- Agendamento diário (03:15 UTC) quando pg_cron existir; caso contrário,
-- o job é acionável manualmente ou por edge function/runner externo.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
    PERFORM cron.unschedule('purge-retention-daily');
    PERFORM cron.schedule(
      'purge-retention-daily',
      '15 3 * * *',
      $job$SELECT public.purge_stale_business_drafts(30); SELECT public.purge_soft_deleted_accounts(30);$job$
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron indisponível — agendamento de expurgo adiado (configure runner externo)';
  END;
END;
$$;