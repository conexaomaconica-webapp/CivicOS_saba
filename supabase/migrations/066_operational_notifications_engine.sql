-- Migration 066: Operational Notifications Engine (Email + In-App)

CREATE TABLE IF NOT EXISTS public.operational_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  event_type VARCHAR(60) NOT NULL CHECK (
    event_type IN (
      'registration_completed',
      'contract_signed',
      'payment_confirmed',
      'payment_pending',
      'payment_overdue',
      'company_approved',
      'company_rejected',
      'company_suspended',
      'masonic_link_verified',
      'subscription_expiring',
      'quota_reached'
    )
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  channel VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (channel IN ('email', 'in_app', 'both')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user in-app queries & deduplication
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.operational_notifications (recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_dedup
  ON public.operational_notifications (recipient_email, event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.operational_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Recipients read their own in-app notifications
DROP POLICY IF EXISTS "Users read own notifications" ON public.operational_notifications;
CREATE POLICY "Users read own notifications"
  ON public.operational_notifications FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin'))
  );

-- RLS: Only admins/server role insert and update notifications
DROP POLICY IF EXISTS "Admins manage notifications" ON public.operational_notifications;
CREATE POLICY "Admins manage notifications"
  ON public.operational_notifications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin'))
  );

-- RPC: Trigger Operational Notification with Short Window Deduplication
CREATE OR REPLACE FUNCTION public.trigger_operational_notification(
  p_tenant_id UUID,
  p_recipient_id UUID,
  p_recipient_email TEXT,
  p_event_type VARCHAR(60),
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_channel VARCHAR(20) DEFAULT 'both'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INT := 0;
  v_notification_id UUID;
BEGIN
  -- Anti-duplication Check (janela de 10 minutos para evitar disparos repetidos)
  SELECT COUNT(*) INTO v_recent_count
  FROM public.operational_notifications
  WHERE recipient_email = p_recipient_email
    AND event_type = p_event_type
    AND created_at > (NOW() - INTERVAL '10 minutes');

  IF v_recent_count > 0 THEN
    RETURN jsonb_build_object('ok', true, 'deduplicated', true);
  END IF;

  INSERT INTO public.operational_notifications (
    tenant_id,
    recipient_id,
    recipient_email,
    event_type,
    title,
    body,
    action_url,
    channel,
    status,
    created_at,
    sent_at
  )
  VALUES (
    COALESCE(p_tenant_id, '00000000-0000-0000-0000-000000000010'::uuid),
    p_recipient_id,
    p_recipient_email,
    p_event_type,
    p_title,
    p_body,
    p_action_url,
    COALESCE(p_channel, 'both'),
    'sent',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_notification_id;

  RETURN jsonb_build_object('ok', true, 'notification_id', v_notification_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_operational_notification(UUID, UUID, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_operational_notification(UUID, UUID, TEXT, VARCHAR, TEXT, TEXT, TEXT, VARCHAR) TO service_role;
