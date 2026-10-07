-- 198 - Aviso operacional de melhoria do perfil (lembrete de SEO enviado pelo admin ao anunciante).
--
-- operational_notifications.event_type aceita apenas uma lista fixa (migrações 066, 068 e 164).
-- Esta migração recria a restrição com a lista atual mais 'profile_improvement'.

ALTER TABLE public.operational_notifications
  DROP CONSTRAINT IF EXISTS operational_notifications_event_type_check;

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
    'quota_reached',
    'survey_response_received',
    'profile_improvement'
  ));

NOTIFY pgrst, 'reload schema';
