-- ============================================================================
-- Migration 112: Platform Events & RSVP Module
-- ============================================================================
-- Módulo institucional de eventos da plataforma Conexão Maçônica.
-- SEPARADO de business_events (Migration 049) que é para anunciantes com quota.
-- Este módulo é para eventos institucionais com confirmação de presença (RSVP).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SEQUENCE GLOBAL DE CÓDIGO DE CONFIRMAÇÃO
-- ---------------------------------------------------------------------------
-- Sequence global — uma única para toda a plataforma.
-- O prefixo (CM-YYYY-) é determinado em runtime pela função geradora.
CREATE SEQUENCE IF NOT EXISTS public.event_registration_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- ---------------------------------------------------------------------------
-- 2. TABELA platform_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_events (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    slug                 VARCHAR(120) NOT NULL,
    title                VARCHAR(255) NOT NULL,
    subtitle             TEXT,
    description          TEXT,
    event_date           DATE        NOT NULL,
    start_time           TIME        NOT NULL,
    end_time             TIME,
    timezone             VARCHAR(50) NOT NULL DEFAULT 'America/Bahia',
    venue_name           VARCHAR(255),
    venue_address        TEXT,
    city                 VARCHAR(100),
    cover_image_url      TEXT,
    -- Controle de inscrições
    status               VARCHAR(30) NOT NULL DEFAULT 'published'
                           CHECK (status IN ('draft', 'published', 'canceled', 'archived')),
    registration_enabled BOOLEAN     NOT NULL DEFAULT true,
    capacity             INT,        -- NULL = sem limite
    -- Timestamps
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unicidade de slug por tenant
    CONSTRAINT uq_platform_events_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_platform_events_slug
    ON public.platform_events (slug, status);

CREATE INDEX IF NOT EXISTS idx_platform_events_tenant_status
    ON public.platform_events (tenant_id, status, event_date);

-- ---------------------------------------------------------------------------
-- 3. TABELA event_registrations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              UUID        NOT NULL REFERENCES public.platform_events(id) ON DELETE CASCADE,
    tenant_id             UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    -- Dados do participante
    full_name             VARCHAR(255) NOT NULL,
    whatsapp              VARCHAR(20)  NOT NULL,  -- Apenas dígitos, normalizado
    email                 VARCHAR(255),
    attendee_type         VARCHAR(30)  NOT NULL DEFAULT 'convidado'
                            CHECK (attendee_type IN ('macom', 'cunhada', 'familiar', 'convidado')),
    masonic_organization  VARCHAR(255),
    company_name          VARCHAR(255),
    city                  VARCHAR(100),
    -- Confirmação de presença
    attendance_status     VARCHAR(20)  NOT NULL DEFAULT 'confirmed'
                            CHECK (attendance_status IN ('confirmed', 'declined')),
    -- Código de confirmação legível: CM-2026-0001
    confirmation_code     VARCHAR(30)  NOT NULL,
    -- Rastreamento de origem
    source                VARCHAR(100),
    utm_source            VARCHAR(100),
    utm_medium            VARCHAR(100),
    utm_campaign          VARCHAR(100),
    -- Check-in
    checked_in_at         TIMESTAMPTZ,
    -- Timestamps
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unicidade: mesmo evento + mesmo WhatsApp = upsert (não duplicata)
    CONSTRAINT uq_event_registrations_event_whatsapp UNIQUE (event_id, whatsapp)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event
    ON public.event_registrations (event_id, attendance_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_registrations_whatsapp
    ON public.event_registrations (event_id, whatsapp);

CREATE INDEX IF NOT EXISTS idx_event_registrations_code
    ON public.event_registrations (confirmation_code);

CREATE INDEX IF NOT EXISTS idx_event_registrations_checkin
    ON public.event_registrations (event_id, checked_in_at);

CREATE INDEX IF NOT EXISTS idx_event_registrations_tenant
    ON public.event_registrations (tenant_id, event_id);

-- ---------------------------------------------------------------------------
-- 4. UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at_platform_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_events_updated_at ON public.platform_events;
CREATE TRIGGER trg_platform_events_updated_at
    BEFORE UPDATE ON public.platform_events
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_platform_events();

CREATE OR REPLACE FUNCTION public.touch_updated_at_event_registrations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER trg_event_registrations_updated_at
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_event_registrations();

-- ---------------------------------------------------------------------------
-- 5. FUNÇÃO: Geração de Código de Confirmação Legível
-- ---------------------------------------------------------------------------
-- Formato: CM-{YEAR}-{NNNN com padding de 4 dígitos}
-- Exemplo: CM-2026-0001, CM-2026-0002
-- O prefixo 'CM' é parametrizado para facilitar mudanças futuras sem refatoração.
-- A sequence é global (não por evento) — simplificação aprovada.
CREATE OR REPLACE FUNCTION public.generate_event_confirmation_code(
    p_event_date DATE,
    p_prefix     TEXT DEFAULT 'CM'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_year    INT;
    v_seq_val BIGINT;
    v_code    TEXT;
BEGIN
    v_year    := EXTRACT(YEAR FROM p_event_date)::INT;
    v_seq_val := nextval('public.event_registration_seq');
    v_code    := p_prefix || '-' || v_year || '-' || LPAD(v_seq_val::TEXT, 4, '0');
    RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS — Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations    ENABLE ROW LEVEL SECURITY;

-- ---- platform_events -------------------------------------------------------

-- Anônimo: pode ler apenas eventos publicados (para a landing page)
DROP POLICY IF EXISTS "Public can read published events" ON public.platform_events;
CREATE POLICY "Public can read published events"
    ON public.platform_events
    FOR SELECT
    USING (status = 'published');

-- Admin: acesso total
DROP POLICY IF EXISTS "Admin full access on platform_events" ON public.platform_events;
CREATE POLICY "Admin full access on platform_events"
    ON public.platform_events
    FOR ALL
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

-- ---- event_registrations ---------------------------------------------------

-- Anônimo: NUNCA pode SELECT diretamente (dados protegidos por LGPD)
-- Anônimo: NÃO pode INSERT direto — apenas via RPC SECURITY DEFINER (upsert_event_registration)
-- Admin: acesso total via service_role nas RPCs administrativas

DROP POLICY IF EXISTS "Admin full access on event_registrations" ON public.event_registrations;
CREATE POLICY "Admin full access on event_registrations"
    ON public.event_registrations
    FOR ALL
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

-- ---------------------------------------------------------------------------
-- 7. RPC: Buscar Evento Público por Slug (anon-safe)
-- ---------------------------------------------------------------------------
-- Retorna apenas dados públicos. Sem dados de inscrições.
-- Usado pela landing page /eventos/[slug].
DROP FUNCTION IF EXISTS public.get_platform_event_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_platform_event_by_slug(p_slug TEXT)
RETURNS TABLE (
    id                   UUID,
    slug                 VARCHAR(120),
    title                VARCHAR(255),
    subtitle             TEXT,
    description          TEXT,
    event_date           DATE,
    start_time           TIME,
    end_time             TIME,
    timezone             VARCHAR(50),
    venue_name           VARCHAR(255),
    venue_address        TEXT,
    city                 VARCHAR(100),
    cover_image_url      TEXT,
    registration_enabled BOOLEAN,
    capacity             INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.slug,
        e.title,
        e.subtitle,
        e.description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.timezone,
        e.venue_name,
        e.venue_address,
        e.city,
        e.cover_image_url,
        e.registration_enabled,
        e.capacity
    FROM public.platform_events e
    WHERE e.slug = p_slug
      AND e.status = 'published'
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_event_by_slug(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. RPC: Upsert de Inscrição RSVP (anon-safe, SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- Único ponto de entrada público para criação/atualização de inscrição.
-- Impede enumeração de dados de outros participantes.
-- Normaliza WhatsApp antes de comparar (apenas dígitos).
-- Em caso de duplicata (event_id + whatsapp), atualiza o registro existente.
DROP FUNCTION IF EXISTS public.upsert_event_registration(UUID, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.upsert_event_registration(
    p_event_id            UUID,
    p_full_name           TEXT,
    p_whatsapp            TEXT,
    p_email               TEXT        DEFAULT NULL,
    p_attendee_type       VARCHAR(30) DEFAULT 'convidado',
    p_masonic_organization TEXT       DEFAULT NULL,
    p_company_name        TEXT        DEFAULT NULL,
    p_city                TEXT        DEFAULT NULL,
    p_attendance_status   VARCHAR(20) DEFAULT 'confirmed',
    p_source              TEXT        DEFAULT NULL,
    p_utm_source          TEXT        DEFAULT NULL,
    p_utm_medium          TEXT        DEFAULT NULL,
    p_utm_campaign        TEXT        DEFAULT NULL
)
RETURNS TABLE (
    registration_id   UUID,
    confirmation_code TEXT,
    is_new            BOOLEAN,
    full_name         TEXT,
    attendance_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_tenant_id        UUID;
    v_event_date       DATE;
    v_reg_enabled      BOOLEAN;
    v_capacity         INT;
    v_current_count    INT;
    v_whatsapp_clean   TEXT;
    v_existing_id      UUID;
    v_existing_code    TEXT;
    v_new_code         TEXT;
    v_result_id        UUID;
    v_result_code      TEXT;
    v_is_new           BOOLEAN;
BEGIN
    -- Normalizar WhatsApp: apenas dígitos
    v_whatsapp_clean := regexp_replace(p_whatsapp, '[^0-9]', '', 'g');

    IF length(v_whatsapp_clean) < 10 THEN
        RAISE EXCEPTION 'WhatsApp inválido: mínimo 10 dígitos.' USING ERRCODE = 'P0001';
    END IF;

    IF length(trim(p_full_name)) < 3 THEN
        RAISE EXCEPTION 'Nome completo deve ter pelo menos 3 caracteres.' USING ERRCODE = 'P0001';
    END IF;

    IF p_attendee_type NOT IN ('macom', 'cunhada', 'familiar', 'convidado') THEN
        RAISE EXCEPTION 'Tipo de participante inválido.' USING ERRCODE = 'P0001';
    END IF;

    IF p_attendance_status NOT IN ('confirmed', 'declined') THEN
        RAISE EXCEPTION 'Status de presença inválido.' USING ERRCODE = 'P0001';
    END IF;

    -- Buscar dados do evento
    SELECT e.tenant_id, e.event_date, e.registration_enabled, e.capacity
    INTO v_tenant_id, v_event_date, v_reg_enabled, v_capacity
    FROM public.platform_events e
    WHERE e.id = p_event_id AND e.status = 'published';

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Evento não encontrado ou não está disponível.' USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_reg_enabled THEN
        RAISE EXCEPTION 'As inscrições para este evento estão encerradas.' USING ERRCODE = 'P0003';
    END IF;

    -- Verificar capacidade (apenas para novos registros confirmados)
    IF v_capacity IS NOT NULL AND p_attendance_status = 'confirmed' THEN
        SELECT COUNT(*)::INT INTO v_current_count
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id
          AND r.attendance_status = 'confirmed';

        -- Verificar se já existe registro para este WhatsApp
        SELECT r.id INTO v_existing_id
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id AND r.whatsapp = v_whatsapp_clean;

        IF v_existing_id IS NULL AND v_current_count >= v_capacity THEN
            RAISE EXCEPTION 'Capacidade máxima do evento atingida.' USING ERRCODE = 'P0004';
        END IF;
    END IF;

    -- Verificar se já existe registro para este WhatsApp (se ainda não verificamos)
    IF v_existing_id IS NULL THEN
        SELECT r.id, r.confirmation_code INTO v_existing_id, v_existing_code
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id AND r.whatsapp = v_whatsapp_clean;
    ELSE
        SELECT r.confirmation_code INTO v_existing_code
        FROM public.event_registrations r
        WHERE r.id = v_existing_id;
    END IF;

    IF v_existing_id IS NOT NULL THEN
        -- ATUALIZAR registro existente
        UPDATE public.event_registrations
        SET
            full_name            = trim(p_full_name),
            email                = lower(trim(p_email)),
            attendee_type        = p_attendee_type,
            masonic_organization = trim(p_masonic_organization),
            company_name         = trim(p_company_name),
            city                 = trim(p_city),
            attendance_status    = p_attendance_status,
            -- Manter código original; atualizar UTM apenas se fornecido
            source               = COALESCE(p_source, source),
            utm_source           = COALESCE(p_utm_source, utm_source),
            utm_medium           = COALESCE(p_utm_medium, utm_medium),
            utm_campaign         = COALESCE(p_utm_campaign, utm_campaign),
            updated_at           = NOW()
        WHERE id = v_existing_id;

        v_result_id   := v_existing_id;
        v_result_code := v_existing_code;
        v_is_new      := false;
    ELSE
        -- GERAR código de confirmação
        v_new_code := public.generate_event_confirmation_code(v_event_date, 'CM');

        -- INSERIR novo registro
        INSERT INTO public.event_registrations (
            event_id, tenant_id,
            full_name, whatsapp, email,
            attendee_type, masonic_organization, company_name, city,
            attendance_status, confirmation_code,
            source, utm_source, utm_medium, utm_campaign
        ) VALUES (
            p_event_id, v_tenant_id,
            trim(p_full_name), v_whatsapp_clean, lower(trim(p_email)),
            p_attendee_type, trim(p_masonic_organization), trim(p_company_name), trim(p_city),
            p_attendance_status, v_new_code,
            p_source, p_utm_source, p_utm_medium, p_utm_campaign
        )
        RETURNING id INTO v_result_id;

        v_result_code := v_new_code;
        v_is_new      := true;
    END IF;

    RETURN QUERY SELECT
        v_result_id,
        v_result_code,
        v_is_new,
        trim(p_full_name)::TEXT,
        p_attendance_status::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_event_registration(UUID, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. RPC: Dashboard Administrativo — Métricas do Evento
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_get_event_dashboard(UUID);
CREATE OR REPLACE FUNCTION public.admin_get_event_dashboard(p_event_id UUID)
RETURNS TABLE (
    total_registrations  BIGINT,
    total_confirmed      BIGINT,
    total_declined       BIGINT,
    total_checkins       BIGINT,
    by_attendee_type     JSONB,
    by_source            JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Guard: apenas admins
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)                                          AS total_registrations,
        COUNT(*) FILTER (WHERE r.attendance_status = 'confirmed')  AS total_confirmed,
        COUNT(*) FILTER (WHERE r.attendance_status = 'declined')   AS total_declined,
        COUNT(*) FILTER (WHERE r.checked_in_at IS NOT NULL)        AS total_checkins,
        -- Por tipo de participante
        jsonb_object_agg(
            agg_type.attendee_type,
            agg_type.cnt
        ) FILTER (WHERE agg_type.attendee_type IS NOT NULL)        AS by_attendee_type,
        -- Por origem
        jsonb_object_agg(
            COALESCE(agg_src.source, 'direto'),
            agg_src.cnt
        ) FILTER (WHERE agg_src.source IS NOT NULL OR agg_src.cnt > 0) AS by_source
    FROM public.event_registrations r
    -- Subquery para agrupamento por tipo
    LEFT JOIN LATERAL (
        SELECT attendee_type, COUNT(*)::BIGINT AS cnt
        FROM public.event_registrations
        WHERE event_id = p_event_id
        GROUP BY attendee_type
    ) agg_type ON true
    -- Subquery para agrupamento por origem
    LEFT JOIN LATERAL (
        SELECT COALESCE(source, 'direto') AS source, COUNT(*)::BIGINT AS cnt
        FROM public.event_registrations
        WHERE event_id = p_event_id
        GROUP BY COALESCE(source, 'direto')
    ) agg_src ON true
    WHERE r.event_id = p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_event_dashboard(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10. RPC: Listar Inscrições (Admin) com filtros
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_event_registrations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.admin_list_event_registrations(
    p_event_id         UUID,
    p_search           TEXT    DEFAULT NULL,
    p_attendance_status TEXT   DEFAULT NULL,
    p_attendee_type    TEXT    DEFAULT NULL,
    p_city             TEXT    DEFAULT NULL,
    p_source           TEXT    DEFAULT NULL,
    p_limit            INT     DEFAULT 50,
    p_offset           INT     DEFAULT 0
)
RETURNS TABLE (
    id                   UUID,
    full_name            VARCHAR(255),
    whatsapp             VARCHAR(20),
    email                VARCHAR(255),
    attendee_type        VARCHAR(30),
    masonic_organization VARCHAR(255),
    company_name         VARCHAR(255),
    city                 VARCHAR(100),
    attendance_status    VARCHAR(20),
    confirmation_code    VARCHAR(30),
    source               VARCHAR(100),
    utm_source           VARCHAR(100),
    utm_campaign         VARCHAR(100),
    checked_in_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ,
    total_count          BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Guard: apenas admins
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        r.id,
        r.full_name,
        r.whatsapp,
        r.email,
        r.attendee_type,
        r.masonic_organization,
        r.company_name,
        r.city,
        r.attendance_status,
        r.confirmation_code,
        r.source,
        r.utm_source,
        r.utm_campaign,
        r.checked_in_at,
        r.created_at,
        COUNT(*) OVER ()::BIGINT AS total_count
    FROM public.event_registrations r
    WHERE r.event_id = p_event_id
      AND (p_search IS NULL OR (
            r.full_name ILIKE '%' || p_search || '%'
            OR r.whatsapp ILIKE '%' || regexp_replace(p_search, '[^0-9]', '', 'g') || '%'
            OR r.confirmation_code ILIKE '%' || p_search || '%'
          ))
      AND (p_attendance_status IS NULL OR r.attendance_status = p_attendance_status)
      AND (p_attendee_type    IS NULL OR r.attendee_type     = p_attendee_type)
      AND (p_city             IS NULL OR r.city ILIKE '%' || p_city || '%')
      AND (p_source           IS NULL OR COALESCE(r.source, 'direto') = p_source)
    ORDER BY r.created_at DESC
    LIMIT  LEAST(GREATEST(p_limit, 1), 200)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_event_registrations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. RPC: Realizar Check-in (Admin)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_checkin_registration(UUID);
CREATE OR REPLACE FUNCTION public.admin_checkin_registration(p_registration_id UUID)
RETURNS TABLE (
    registration_id   UUID,
    full_name         VARCHAR(255),
    confirmation_code VARCHAR(30),
    checked_in_at     TIMESTAMPTZ,
    already_checked   BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_existing_checkin TIMESTAMPTZ;
    v_full_name        VARCHAR(255);
    v_code             VARCHAR(30);
    v_checkin_time     TIMESTAMPTZ;
BEGIN
    -- Guard: apenas admins
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    SELECT r.checked_in_at, r.full_name, r.confirmation_code
    INTO v_existing_checkin, v_full_name, v_code
    FROM public.event_registrations r
    WHERE r.id = p_registration_id;

    IF v_full_name IS NULL THEN
        RAISE EXCEPTION 'Inscrição não encontrada.' USING ERRCODE = 'P0002';
    END IF;

    IF v_existing_checkin IS NOT NULL THEN
        -- Já realizou check-in — retornar estado atual sem sobrescrever
        RETURN QUERY SELECT
            p_registration_id,
            v_full_name,
            v_code,
            v_existing_checkin,
            true;
        RETURN;
    END IF;

    -- Realizar check-in
    v_checkin_time := NOW();
    UPDATE public.event_registrations
    SET checked_in_at = v_checkin_time
    WHERE id = p_registration_id;

    RETURN QUERY SELECT
        p_registration_id,
        v_full_name,
        v_code,
        v_checkin_time,
        false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_checkin_registration(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 12. RPC: Listar Eventos para o Admin
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_platform_events();
CREATE OR REPLACE FUNCTION public.admin_list_platform_events()
RETURNS TABLE (
    id                   UUID,
    slug                 VARCHAR(120),
    title                VARCHAR(255),
    event_date           DATE,
    start_time           TIME,
    venue_name           VARCHAR(255),
    city                 VARCHAR(100),
    status               VARCHAR(30),
    registration_enabled BOOLEAN,
    capacity             INT,
    total_registrations  BIGINT,
    total_confirmed      BIGINT,
    total_checkins       BIGINT,
    created_at           TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Guard: apenas admins
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('master', 'socio_admin', 'platform_admin', 'admin', 'superadmin')
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.slug,
        e.title,
        e.event_date,
        e.start_time,
        e.venue_name,
        e.city,
        e.status,
        e.registration_enabled,
        e.capacity,
        COUNT(r.id)::BIGINT                                                 AS total_registrations,
        COUNT(r.id) FILTER (WHERE r.attendance_status = 'confirmed')::BIGINT AS total_confirmed,
        COUNT(r.id) FILTER (WHERE r.checked_in_at IS NOT NULL)::BIGINT       AS total_checkins,
        e.created_at
    FROM public.platform_events e
    LEFT JOIN public.event_registrations r ON r.event_id = e.id
    GROUP BY e.id, e.slug, e.title, e.event_date, e.start_time,
             e.venue_name, e.city, e.status, e.registration_enabled,
             e.capacity, e.created_at
    ORDER BY e.event_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_platform_events() TO authenticated;

-- ---------------------------------------------------------------------------
-- 13. SEED: Evento Inicial — Conexão Empresarial da Família Maçônica
-- ---------------------------------------------------------------------------
-- Inserir apenas se não existir (idempotente)
INSERT INTO public.platform_events (
    tenant_id,
    slug,
    title,
    subtitle,
    description,
    event_date,
    start_time,
    timezone,
    venue_name,
    venue_address,
    city,
    status,
    registration_enabled,
    capacity
)
SELECT
    t.id,
    'conexao-empresarial-2026',
    'Conexão Empresarial da Família Maçônica',
    'Relacionamentos que aproximam! Negócios que fortalecem!',
    'Uma noite exclusiva para maçons, familiares e convidados se conectarem através de relacionamentos genuínos e oportunidades de negócios. O Conexão Maçônica reúne a família maçônica para fortalecer os laços entre irmãos e seus círculos de negócios.',
    '2026-11-24',
    '19:00:00',
    'America/Bahia',
    'Centro de Convenções de Feira de Santana',
    'Centro de Convenções de Feira de Santana, Feira de Santana – BA',
    'Feira de Santana',
    'published',
    true,
    NULL  -- Sem limite de capacidade por ora
FROM public.tenants t
LIMIT 1
ON CONFLICT (tenant_id, slug) DO NOTHING;
