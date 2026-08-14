-- ============================================================================
-- 036 — LGPD Containment & Consent (Revisão LGPD)
-- ============================================================================
-- Fase 1 (Containment — P0):
--   1. RLS de businesses exige publication_status = 'published' (rascunhos não
--      podem vazar para o diretório público).
--   2. Correção do schema drift de audit_logs (colunas resource/details usadas
--      por 28 INSERTs de 030–033 vs. schema entity_type/entity_id/changes).
--   3. Anti-self-approval e guarda de fluxo de aprovação em
--      business_masonic_links (equivalente a chk_cred_anti_self_approval).
--   4. Restrição da leitura pública de credential_issuances (sem enumeração de
--      selos de pessoas/lojas) e de organization_people (somente liderança).
--
-- Fase 2 (Consentimento — CRIT-TRN-012):
--   5. content_hash SHA-256 da minuta em legal_document_versions (trigger
--      mantém o hash sempre sincronizado com content_markdown).
--   6. Snapshot content_hash em acceptance_records (imutável por FK RESTRICT).
--   7. consent_records vinculado a document_version_id.
--   8. Publication consents: opt-in por atributo (display_* DEFAULT false) e
--      suporte a revogação (granted/revoked_at/revoked_reason).
--   9. RPCs SECURITY DEFINER: accept_legal_doc, grant_sensitive_consent,
--      revoke_consent — com eventos canônicos de LGPD no outbox.
--  10. Enforcement de consentimento ativo na leitura pública de vínculos e na
--      ativação; RPC get_verified_business_ids para o selo no guia.
--  11. Seed do catálogo de permissões LGPD/moderador.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- FASE 1 — 1.1 RLS de businesses: publicar apenas listings publicados
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can read active businesses" ON public.businesses;
CREATE POLICY "Public can read published businesses"
  ON public.businesses
  FOR SELECT
  USING (is_active = true AND publication_status = 'published');

-- Banners e reviews só acompanham listings publicados (mesma classe de
-- vazamento: rascunhos não podem expor conteúdo associado no diretório).

DROP POLICY IF EXISTS "Public can read active banners" ON public.business_banners;
CREATE POLICY "Public can read banners of published businesses"
  ON public.business_banners
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_banners.business_id
        AND b.tenant_id = business_banners.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "Public can read reviews" ON public.business_reviews;
CREATE POLICY "Public can read reviews of published businesses"
  ON public.business_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_reviews.business_id
        AND b.tenant_id = business_reviews.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- FASE 1 — 1.2 audit_logs: correção do schema drift
-- ---------------------------------------------------------------------------
-- Os INSERTs de auditoria de 030–033 usam (tenant_id, user_id, action,
-- resource, details). O schema original (018) declara entity_type/entity_id
-- NOT NULL sem default, o que fazia todos os INSERTs falharem em runtime e a
-- trilha nunca era gravada. Normaliza o schema sem reescrever migrations já
-- aplicadas.

ALTER TABLE public.audit_logs
  ALTER COLUMN entity_type DROP NOT NULL,
  ALTER COLUMN entity_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS resource TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);

-- ---------------------------------------------------------------------------
-- FASE 1 — 1.3 Anti-self-approval e guarda do fluxo de aprovação
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_links
  DROP CONSTRAINT IF EXISTS chk_bml_no_self_approval;
ALTER TABLE public.business_masonic_links
  ADD CONSTRAINT chk_bml_no_self_approval CHECK (
    status NOT IN ('approved', 'active')
    OR verified_by IS NULL
    OR declaring_user_id IS NULL
    OR verified_by <> declaring_user_id
  );

CREATE OR REPLACE FUNCTION public.bml_guard_approval_flow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_moderator BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('approved', 'active') THEN
      RAISE EXCEPTION 'Vínculos maçônicos são criados como rascunho';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_is_moderator := public.has_tenant_admin_access(NEW.tenant_id);

  -- Estados de aprovação/revisão exigem moderador (tenant_admin/master).
  IF NEW.status IN ('approved', 'active', 'under_review') AND NOT v_is_moderator THEN
    RAISE EXCEPTION 'Somente moderadores podem aprovar ou revisar vínculos maçônicos';
  END IF;

  -- Ativação exige consentimento de publicação ativo (CRIT-TRN-012).
  IF NEW.status = 'active' AND NOT EXISTS (
    SELECT 1 FROM public.business_masonic_link_publication_consents c
    WHERE c.tenant_id = NEW.tenant_id
      AND c.link_id = NEW.id
      AND c.granted = true
      AND c.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Vínculo não pode ser ativado sem consentimento de publicação vigente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bml_guard_approval_flow ON public.business_masonic_links;
CREATE TRIGGER trg_bml_guard_approval_flow
  BEFORE INSERT OR UPDATE OF status ON public.business_masonic_links
  FOR EACH ROW
  EXECUTE FUNCTION public.bml_guard_approval_flow();

-- ---------------------------------------------------------------------------
-- FASE 1 — 1.4 credential_issuances: sem enumeração de selos pessoais
-- ---------------------------------------------------------------------------
-- Remove os ramos `OR user_id IS NOT NULL OR organization_id IS NOT NULL`
-- que permitiam a qualquer membro autenticado do tenant enumerar selos de
-- verificação emitidos para qualquer pessoa/loja (dado sensível de vínculo).

DROP POLICY IF EXISTS "Public can view verified credentials" ON public.credential_issuances;
CREATE POLICY "Public can view verified credentials of published businesses"
  ON public.credential_issuances
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status = 'verified'
    AND business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = credential_issuances.business_id
        AND b.tenant_id = credential_issuances.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- FASE 1 — 1.5 organization_people: apenas cargos de liderança em leitura
-- pública (nome + CIMB + grau de membros comuns não é dado público).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view active organization people" ON public.organization_people;
CREATE POLICY "Public can view active organization leaders"
  ON public.organization_people
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status = 'active'
    AND role_in_org IN ('veneravel', 'presidente', 'grande_secretario')
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_people.organization_id
        AND o.tenant_id = organization_people.tenant_id
        AND o.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.1 content_hash SHA-256 da minuta (CRIT-TRN-012)
-- ---------------------------------------------------------------------------
-- Usa sha256(bytea) nativo do PostgreSQL (pg_catalog, PG 11+): disponível em
-- qualquer search_path e sem dependência da extensão pgcrypto (que no Supabase
-- vive no schema `extensions`, fora do search_path das funções).

ALTER TABLE public.legal_document_versions
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Backfill de versões existentes.
UPDATE public.legal_document_versions
SET content_hash = encode(sha256(content_markdown::bytea), 'hex')
WHERE content_hash IS NULL;

-- O trigger garante que o hash nunca diverge do conteúdo publicado.
CREATE OR REPLACE FUNCTION public.set_legal_doc_version_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.content_hash := encode(sha256(NEW.content_markdown::bytea), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_doc_version_hash ON public.legal_document_versions;
CREATE TRIGGER trg_legal_doc_version_hash
  BEFORE INSERT OR UPDATE OF content_markdown ON public.legal_document_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_legal_doc_version_hash();

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.2 acceptance_records: snapshot do hash da minuta aceita
-- ---------------------------------------------------------------------------

ALTER TABLE public.acceptance_records
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE OR REPLACE FUNCTION public.snapshot_acceptance_content_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT v.content_hash INTO v_hash
  FROM public.legal_document_versions v
  WHERE v.id = NEW.document_version_id;
  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'Versão de documento sem content_hash — revalide o documento';
  END IF;
  NEW.content_hash := v_hash;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acceptance_content_hash ON public.acceptance_records;
CREATE TRIGGER trg_acceptance_content_hash
  BEFORE INSERT ON public.acceptance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_acceptance_content_hash();

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.3 consent_records vinculado à minuta versionada
-- ---------------------------------------------------------------------------

ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS document_version_id UUID REFERENCES public.legal_document_versions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_consent_records_doc_version ON public.consent_records(document_version_id);

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.4 Publication consents: opt-in por atributo + revogação
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_publication_consents
  ALTER COLUMN display_name SET DEFAULT false,
  ALTER COLUMN display_business_role SET DEFAULT false,
  ALTER COLUMN display_masonic_role SET DEFAULT false,
  ALTER COLUMN display_organization SET DEFAULT false,
  ALTER COLUMN display_organization_unit SET DEFAULT false,
  ALTER COLUMN display_contact SET DEFAULT false,
  ALTER COLUMN display_profile_photo SET DEFAULT false,
  ALTER COLUMN display_masonic_degree SET DEFAULT false,
  ADD COLUMN IF NOT EXISTS granted BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.5 RPC: accept_legal_doc
-- ---------------------------------------------------------------------------
-- Registra o aceite de um documento versionado com hash da minuta (trigger
-- snapshots o content_hash) e emite o evento canônico legal_docs.accepted.v1.

CREATE OR REPLACE FUNCTION public.accept_legal_doc(p_code TEXT, p_version TEXT)
RETURNS public.acceptance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID := public.current_tenant_id();
  v_version_id UUID;
  v_content_hash TEXT;
  v_acceptance public.acceptance_records;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não resolvido — entre novamente';
  END IF;

  SELECT v.id, v.content_hash INTO v_version_id, v_content_hash
  FROM public.legal_document_versions v
  JOIN public.legal_documents d ON d.id = v.document_id
  WHERE d.code = p_code AND v.version = p_version
  LIMIT 1;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Versão % de % não encontrada', p_version, p_code;
  END IF;

  INSERT INTO public.acceptance_records
    (tenant_id, user_id, document_version_id, session_evidence_id, evidence_metadata, content_hash)
  VALUES
    (v_tenant_id, v_user_id, v_version_id,
     encode(sha256((p_code || p_version || v_user_id::text || now()::text)::bytea), 'hex'),
     jsonb_build_object('source', 'accept_legal_doc'),
     v_content_hash)
  RETURNING * INTO v_acceptance;

  INSERT INTO public.outbox_events
    (event_id, event_type, schema_version, event_version, tenant_id,
     aggregate_type, aggregate_id, aggregate_version, producer,
     actor_type, actor_id, payload)
  VALUES
    (gen_random_uuid()::text, 'legal_docs.accepted.v1', '1.0', '1.0', v_tenant_id,
     'legal_document_version', v_version_id::text, 1, 'lgpd-rpc',
     'user', v_user_id::text,
     jsonb_build_object('code', p_code, 'version', p_version,
                        'document_version_id', v_version_id::text,
                        'content_hash', v_content_hash));

  RETURN v_acceptance;
END;
$$;

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.6 RPC: grant_sensitive_consent
-- ---------------------------------------------------------------------------
-- Consentimento explícito e destacado para finalidade sensível (vínculo
-- maçônico). O propósito precisa estar na whitelist e referenciar uma minuta
-- versionada. Emite consent.granted.v1.

CREATE OR REPLACE FUNCTION public.grant_sensitive_consent(p_purpose TEXT, p_version TEXT)
RETURNS public.consent_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID := public.current_tenant_id();
  v_version_id UUID;
  v_consent public.consent_records;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não resolvido — entre novamente';
  END IF;

  IF p_purpose NOT IN ('masonic_affiliation_publication', 'masonic_link_publication') THEN
    RAISE EXCEPTION 'Finalidade sensível não reconhecida';
  END IF;

  SELECT v.id INTO v_version_id
  FROM public.legal_document_versions v
  JOIN public.legal_documents d ON d.id = v.document_id
  WHERE d.code = 'privacy_policy' AND v.version = p_version
  LIMIT 1;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Versão % da Política de Privacidade não encontrada', p_version;
  END IF;

  INSERT INTO public.consent_records
    (tenant_id, user_id, purpose, granted, document_version_id)
  VALUES
    (v_tenant_id, v_user_id, p_purpose, true, v_version_id)
  RETURNING * INTO v_consent;

  INSERT INTO public.outbox_events
    (event_id, event_type, schema_version, event_version, tenant_id,
     aggregate_type, aggregate_id, aggregate_version, producer,
     actor_type, actor_id, payload)
  VALUES
    (gen_random_uuid()::text, 'consent.granted.v1', '1.0', '1.0', v_tenant_id,
     'consent_record', v_consent.id::text, 1, 'lgpd-rpc',
     'user', v_user_id::text,
     jsonb_build_object('purpose', p_purpose, 'version', p_version,
                        'consent_id', v_consent.id::text));

  RETURN v_consent;
END;
$$;

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.7 RPC: revoke_consent
-- ---------------------------------------------------------------------------
-- Revoga um consentimento do próprio titular (append-only via
-- consent_withdrawals). Quando a finalidade é de vínculo maçônico, propaga a
-- revogação para os consentimentos de publicação dos vínculos do titular e
-- transiciona vínculos ativos/aprovados para 'revoked' (não exibível no guia).
-- Emite consent.withdrawn.v1.

CREATE OR REPLACE FUNCTION public.revoke_consent(p_consent_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS public.consent_records
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

  SELECT * INTO v_consent
  FROM public.consent_records
  WHERE id = p_consent_id AND user_id = v_user_id
  LIMIT 1;

  IF v_consent.id IS NULL THEN
    RAISE EXCEPTION 'Consentimento não encontrado';
  END IF;

  IF v_consent.granted THEN
    UPDATE public.consent_records
    SET granted = false
    WHERE id = v_consent.id;

    INSERT INTO public.consent_withdrawals (consent_id, reason)
    VALUES (v_consent.id, p_reason)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Propagação: consentimento de vínculo maçônico revogado tira o vínculo da
  -- vitrine pública (CRIT-TRN-014 / skill lgpd-revisao).
  IF v_consent.purpose IN ('masonic_affiliation_publication', 'masonic_link_publication') THEN
    UPDATE public.business_masonic_link_publication_consents c
    SET granted = false, revoked_at = now(), revoked_reason = p_reason
    FROM public.business_masonic_links bml
    WHERE bml.id = c.link_id
      AND bml.tenant_id = c.tenant_id
      AND bml.declaring_user_id = v_user_id
      AND c.granted = true;

    UPDATE public.business_masonic_links bml
    SET status = 'revoked',
        updated_at = now()
    FROM public.business_masonic_link_publication_consents c
    WHERE bml.id = c.link_id
      AND bml.tenant_id = c.tenant_id
      AND bml.declaring_user_id = v_user_id
      AND bml.status IN ('active', 'approved')
      AND c.granted = false;

    INSERT INTO public.business_masonic_link_history
      (tenant_id, link_id, action_type, previous_status, new_status,
       changed_fields, actor_id, action_reason, source)
    SELECT bml.tenant_id, bml.id, 'consent_revoked',
           CASE WHEN bml.status IN ('active', 'approved') THEN bml.status ELSE NULL END,
           CASE WHEN bml.status IN ('active', 'approved') THEN 'revoked' ELSE bml.status END,
           ARRAY['granted', 'status'], v_user_id, p_reason, 'lgpd_rpc'
    FROM public.business_masonic_links bml
    WHERE bml.declaring_user_id = v_user_id
      AND bml.status IN ('active', 'approved', 'pending_verification', 'under_review');
  END IF;

  SELECT * INTO v_consent
  FROM public.consent_records
  WHERE id = p_consent_id;

  INSERT INTO public.outbox_events
    (event_id, event_type, schema_version, event_version, tenant_id,
     aggregate_type, aggregate_id, aggregate_version, producer,
     actor_type, actor_id, payload)
  VALUES
    (gen_random_uuid()::text, 'consent.withdrawn.v1', '1.0', '1.0', v_tenant_id,
     'consent_record', v_consent.id::text, 1, 'lgpd-rpc',
     'user', v_user_id::text,
     jsonb_build_object('purpose', v_consent.purpose,
                        'consent_id', v_consent.id::text,
                        'reason', p_reason));

  RETURN v_consent;
END;
$$;

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.8 RPC: upsert_publication_consent (opt-in granular por vínculo)
-- ---------------------------------------------------------------------------
-- Escreve/atualiza o consentimento granular de publicação de um vínculo.
-- Todos os atributos são opt-in (padrão false no DDL); o RPC valida que o
-- chamador é o declarante. Usado pelo fluxo USR-002/community-links.

CREATE OR REPLACE FUNCTION public.upsert_publication_consent(
  p_link_id UUID,
  p_visibility_scope TEXT DEFAULT 'authenticated_members',
  p_display_name BOOLEAN DEFAULT false,
  p_display_business_role BOOLEAN DEFAULT false,
  p_display_masonic_role BOOLEAN DEFAULT false,
  p_display_organization BOOLEAN DEFAULT false,
  p_display_organization_unit BOOLEAN DEFAULT false,
  p_display_contact BOOLEAN DEFAULT false,
  p_display_profile_photo BOOLEAN DEFAULT false,
  p_display_masonic_degree BOOLEAN DEFAULT false
)
RETURNS public.business_masonic_link_publication_consents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_link public.business_masonic_links;
  v_consent public.business_masonic_link_publication_consents;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_link
  FROM public.business_masonic_links
  WHERE id = p_link_id
  LIMIT 1;

  IF v_link.id IS NULL OR v_link.declaring_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Vínculo não encontrado para o declarante atual';
  END IF;

  IF p_visibility_scope NOT IN ('public_all', 'authenticated_members', 'private_admin') THEN
    RAISE EXCEPTION 'Escopo de visibilidade inválido';
  END IF;

  INSERT INTO public.business_masonic_link_publication_consents AS c
    (tenant_id, link_id, visibility_scope,
     display_name, display_business_role, display_masonic_role,
     display_organization, display_organization_unit, display_contact,
     display_profile_photo, display_masonic_degree, granted)
  VALUES
    (v_link.tenant_id, p_link_id, p_visibility_scope,
     p_display_name, p_display_business_role, p_display_masonic_role,
     p_display_organization, p_display_organization_unit, p_display_contact,
     p_display_profile_photo, p_display_masonic_degree, true)
  ON CONFLICT (tenant_id, link_id)
  DO UPDATE SET
    visibility_scope = EXCLUDED.visibility_scope,
    display_name = EXCLUDED.display_name,
    display_business_role = EXCLUDED.display_business_role,
    display_masonic_role = EXCLUDED.display_masonic_role,
    display_organization = EXCLUDED.display_organization,
    display_organization_unit = EXCLUDED.display_organization_unit,
    display_contact = EXCLUDED.display_contact,
    display_profile_photo = EXCLUDED.display_profile_photo,
    display_masonic_degree = EXCLUDED.display_masonic_degree,
    granted = true,
    revoked_at = NULL,
    revoked_reason = NULL,
    consented_at = now()
  RETURNING * INTO v_consent;

  RETURN v_consent;
END;
$$;

-- Índice de apoio para o ON CONFLICT acima (a chave composta única não
-- existe no schema original — apenas UNIQUE (tenant_id, id) da tabela pai).
CREATE UNIQUE INDEX IF NOT EXISTS uq_bmlpc_link_consent
  ON public.business_masonic_link_publication_consents(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.9 Leitura pública de vínculos exige consentimento ativo
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view approved active links of published businesses" ON public.business_masonic_links;
CREATE POLICY "Public can view active consented links of published businesses"
  ON public.business_masonic_links
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > now())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.tenant_id = business_masonic_links.tenant_id
        AND b.id = business_masonic_links.business_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.business_masonic_link_publication_consents c
      WHERE c.tenant_id = business_masonic_links.tenant_id
        AND c.link_id = business_masonic_links.id
        AND c.granted = true
        AND c.revoked_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.10 RPC: get_verified_business_ids (selo no guia)
-- ---------------------------------------------------------------------------
-- Retorna os IDs de businesses com vínculo ativo, válido e consentimento de
-- publicação público vigente. Anônimo-safe (SECURITY DEFINER, sem RLS).

CREATE OR REPLACE FUNCTION public.get_verified_business_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT bml.business_id
  FROM public.business_masonic_links bml
  JOIN public.businesses b
    ON b.tenant_id = bml.tenant_id AND b.id = bml.business_id
  JOIN public.business_masonic_link_publication_consents c
    ON c.tenant_id = bml.tenant_id AND c.link_id = bml.id
  WHERE bml.status = 'active'
    AND (bml.valid_until IS NULL OR bml.valid_until > now())
    AND b.publication_status = 'published'
    AND b.is_active = true
    AND c.granted = true
    AND c.revoked_at IS NULL
    AND c.visibility_scope = 'public_all';
$$;

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.11 Catálogo de permissões LGPD e moderação
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (code, module, description) VALUES
  ('legal_docs:accept', 'lgpd', 'Registrar aceite de termos/políticas versionados'),
  ('legal_docs:manage', 'lgpd', 'Publicar versões de documentos legais'),
  ('privacy:export_own', 'lgpd', 'Exportar os próprios dados pessoais (portabilidade)'),
  ('privacy:revoke_consent', 'lgpd', 'Revogar consentimentos opcionais'),
  ('business:moderate', 'moderation', 'Moderar empresas na fila administrativa'),
  ('masonic_link:review', 'moderation', 'Revisar vínculos maçônicos na fila'),
  ('masonic_link:approve', 'moderation', 'Aprovar vínculos maçônicos'),
  ('masonic_link:reject', 'moderation', 'Rejeitar vínculos maçônicos'),
  ('masonic_link:suspend', 'moderation', 'Suspender vínculos maçônicos'),
  ('masonic_link:revoke', 'moderation', 'Revogar vínculos maçônicos'),
  ('masonic_link:evidence:view', 'moderation', 'Visualizar evidências de vínculos')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- FASE 2 — 2.12 Seed da Política de Privacidade (minuta v1.0)
-- ---------------------------------------------------------------------------
-- A minuta versionada é referenciada por grant_sensitive_consent e
-- accept_legal_doc; o hash SHA-256 é mantido pelo trigger 2.1. O texto abaixo
-- é a base legal vigente; alterações devem criar nova versão (nunca editar a
-- v1.0 publicada, para não invalidar aceites registrados).

INSERT INTO public.legal_documents (code, title)
VALUES ('privacy_policy', 'Política de Privacidade — Conexão Maçônica')
ON CONFLICT DO NOTHING;

INSERT INTO public.legal_document_versions (document_id, version, content_markdown, effective_date)
SELECT d.id, '1.0', $md$# Política de Privacidade — Conexão Maçônica (v1.0)

Esta Política de Privacidade rege o tratamento de dados pessoais no Guia
Comercial da Conexão Maçônica (CivicOS), em conformidade com a Lei Geral de
Proteção de Dados (LGPD — Lei nº 13.709/2018).

## 1. Dados tratados

- **Dados pessoais comuns**: nome, e-mail, telefone comercial, CNPJ e
  endereço comercial, necessários ao cadastro do anunciante e à operação do
  diretório.
- **Dados pessoais sensíveis** (art. 5º, II — convicção filosófica): vínculo
  maçônico declarado (loja, potência, rito, grau, CIMB e status de membro),
  tratado apenas com o seu consentimento livre, informado, inequívoco e
  destacado, para verificação fraterna e emissão do selo de vínculo.

## 2. Finalidades

- Operação do diretório comercial e moderação de vínculos.
- Verificação do vínculo maçônico declarado para emissão do selo.
- Publicação de dados do anúncio apenas dentro do escopo de visibilidade que
  você autorizar (público, membros autenticados ou administração).

## 3. Compartilhamento

Não compartilhamos dados sensíveis com terceiros. A publicação do vínculo na
vitrine pública depende de consentimento específico e destacado, revogável a
qualquer momento.

## 4. Direitos do titular

Você pode solicitar a exportação dos seus dados (portabilidade), revogar
consentimentos opcionais e exercer os demais direitos do art. 18 da LGPD por
meio da tela de Privacidade do seu perfil. A revogação do consentimento de
vínculo maçônico remove o vínculo da vitrine pública.

## 5. Retenção

Dados sensíveis de vínculo são mantidos apenas enquanto a finalidade exigir.
Aceites e registros de consentimento são mantidos como evidência legal com
hash imutável (SHA-256) da minuta aceita.

## 6. Contato

Para questões sobre privacidade, contate o Encarregado (DPO) pela tela de
Privacidade do perfil.
$md$, now()
FROM public.legal_documents d
WHERE d.code = 'privacy_policy'
  AND NOT EXISTS (
    SELECT 1 FROM public.legal_document_versions v
    WHERE v.document_id = d.id AND v.version = '1.0'
  );