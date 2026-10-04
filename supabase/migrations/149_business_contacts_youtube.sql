-- Permite cadastrar o canal oficial do YouTube como contato público da empresa.
ALTER TABLE public.business_contacts
  DROP CONSTRAINT IF EXISTS business_contacts_type_check;

ALTER TABLE public.business_contacts
  ADD CONSTRAINT business_contacts_type_check
  CHECK (type IN ('whatsapp', 'phone', 'email', 'instagram', 'linkedin', 'facebook', 'youtube', 'website'));
