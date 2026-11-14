-- Ligar a captura financeira em modo SHADOW (pré-requisito para commercial_settings.module_enabled = true).
-- NÃO executar sem conferir o Project Ref (Supabase oficial de produção). Rodar no SQL Editor.
-- Em 'shadow' a captura nunca bloqueia pagamento: falhas vão para commercial_capture_failures.
-- Só faturas com updated_at >= capture_starts_at geram eventos (nada retroativo).

-- 0) Conferir o tenant e o estado atual
SELECT t.id AS tenant_id, t.name, s.capture_mode, s.capture_starts_at, s.module_enabled
FROM public.tenants t
LEFT JOIN public.commercial_settings s ON s.tenant_id = t.id;

-- 1) Ligar (troque <TENANT_ID> pelo id conferido acima; a data de início = agora, sem retroativo)
INSERT INTO public.commercial_settings (tenant_id, capture_mode, capture_starts_at)
VALUES ('<TENANT_ID>', 'shadow', now())
ON CONFLICT (tenant_id) DO UPDATE
  SET capture_mode = 'shadow',
      capture_starts_at = COALESCE(public.commercial_settings.capture_starts_at, now()),
      updated_at = now();

-- 2) Verificar
SELECT tenant_id, capture_mode, capture_starts_at, module_enabled FROM public.commercial_settings;

-- Reverter (desliga a captura; só funciona com module_enabled = false):
-- UPDATE public.commercial_settings SET capture_mode = 'off', updated_at = now() WHERE tenant_id = '<TENANT_ID>';
