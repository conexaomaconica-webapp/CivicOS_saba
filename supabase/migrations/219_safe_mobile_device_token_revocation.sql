-- ============================================================================
-- Migration 219: Revogação Segura de Tokens Push e Integração com Exclusão de Conta
-- Conexão Maçônica (CivicOS SABA)
--
-- ATENÇÃO: Preparação para homologação do Gate iOS 02B.1.
-- Não aplicar diretamente em produção sem autorização prévia.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RPC: unregister_my_mobile_device_token
-- ---------------------------------------------------------------------------
-- Permite que um usuário autenticado desvincule um token push específico
-- APENAS se o token pertencer comprovadamente à sua conta (member_id ou email).
-- Previne estritamente que usuários desvinculem tokens de terceiros.

CREATE OR REPLACE FUNCTION public.unregister_my_mobile_device_token(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_deleted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token obrigatório');
  END IF;

  -- Obter e-mail associado à conta do usuário autenticado
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Exclui o token SOMENTE se pertencer à identidade autenticada
  DELETE FROM public.mobile_device_tokens
  WHERE token = trim(p_token)
    AND (
      member_id = v_user_id::text
      OR (v_email IS NOT NULL AND lower(member_email) = lower(v_email))
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'revoked', true);
  ELSE
    -- Idempotente: se não encontrou vínculo com esse usuário, não altera outros
    RETURN jsonb_build_object(
      'success', true,
      'revoked', false,
      'message', 'Token não localizado ou não pertence ao usuário autenticado'
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. RPC: revoke_all_my_mobile_device_tokens
-- ---------------------------------------------------------------------------
-- Revoga todos os tokens push de todos os aparelhos vinculados ao titular autenticado.

CREATE OR REPLACE FUNCTION public.revoke_all_my_mobile_device_tokens()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_deleted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  DELETE FROM public.mobile_device_tokens
  WHERE member_id = v_user_id::text
     OR (v_email IS NOT NULL AND lower(member_email) = lower(v_email));

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'revoked_count', v_deleted_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Atualização de public.request_account_deletion()
-- ---------------------------------------------------------------------------
-- Integra o expurgo de tokens push ao processo de exclusão canônica de contas.

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_tenant_id UUID := public.current_tenant_id();
  v_consent public.consent_records;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não resolvido — entre novamente';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

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

  -- 4. Revogar e expurgar todos os tokens de notificações push em todos os dispositivos
  DELETE FROM public.mobile_device_tokens
  WHERE member_id = v_user_id::text
     OR (v_user_email IS NOT NULL AND lower(member_email) = lower(v_user_email));

  -- 5. Vínculos remanescentes (drafts etc.) → revoked com history auditável
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

  -- 6. Businesses do titular saem da vitrine
  UPDATE public.businesses
  SET is_active = false,
      publication_status = 'suspended',
      updated_at = now()
  WHERE owner_id = v_user_id;

  -- 7. Soft-delete do perfil
  UPDATE public.profiles
  SET status = 'deleted', deleted_at = now()
  WHERE id = v_user_id;

  -- 8. Trilha de auditoria
  INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
  VALUES (
    v_tenant_id, v_user_id, 'account.deletion_requested', 'profiles',
    jsonb_build_object('profile_id', v_user_id::text, 'deleted_at', now())
  );

  -- 9. Evento canônico outbox
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
-- 4. Permissões de Execução Estritas
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.unregister_my_mobile_device_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unregister_my_mobile_device_token(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.unregister_my_mobile_device_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_my_mobile_device_token(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.revoke_all_my_mobile_device_tokens() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_all_my_mobile_device_tokens() FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_all_my_mobile_device_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_my_mobile_device_tokens() TO service_role;

REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_account_deletion() FROM anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
