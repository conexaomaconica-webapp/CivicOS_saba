-- Migration 218: Mobile Device Push Tokens
-- Armazena os tokens FCM dos dispositivos Android/iOS para envio de notificações push via Firebase.

CREATE TABLE IF NOT EXISTS public.mobile_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  member_email TEXT,
  member_id TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobile_device_tokens_token ON public.mobile_device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mobile_device_tokens_platform ON public.mobile_device_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_mobile_device_tokens_member_email ON public.mobile_device_tokens(member_email);

ALTER TABLE public.mobile_device_tokens ENABLE ROW LEVEL SECURITY;

-- Service role tem acesso irrestrito para leitura e envio
DROP POLICY IF EXISTS "Service role full access mobile_device_tokens" ON public.mobile_device_tokens;
CREATE POLICY "Service role full access mobile_device_tokens"
  ON public.mobile_device_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RPC segura para cadastro e atualização de token do celular
CREATE OR REPLACE FUNCTION public.register_mobile_device_token(
  p_token TEXT,
  p_platform TEXT DEFAULT 'android',
  p_member_email TEXT DEFAULT NULL,
  p_member_id TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token cannot be empty');
  END IF;

  INSERT INTO public.mobile_device_tokens (
    token, platform, member_email, member_id, device_info, is_active, last_seen_at, updated_at
  )
  VALUES (
    trim(p_token),
    COALESCE(p_platform, 'android'),
    NULLIF(trim(p_member_email), ''),
    NULLIF(trim(p_member_id), ''),
    COALESCE(p_device_info, '{}'::jsonb),
    true,
    now(),
    now()
  )
  ON CONFLICT (token) DO UPDATE SET
    platform = EXCLUDED.platform,
    member_email = COALESCE(EXCLUDED.member_email, mobile_device_tokens.member_email),
    member_id = COALESCE(EXCLUDED.member_id, mobile_device_tokens.member_id),
    device_info = COALESCE(EXCLUDED.device_info, mobile_device_tokens.device_info),
    is_active = true,
    last_seen_at = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_mobile_device_token(TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

