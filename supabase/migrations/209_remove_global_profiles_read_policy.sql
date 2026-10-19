-- 209 - Remove policy legada que reabria leitura global de profiles.
-- Somente local/homologacao nesta etapa; nao aplicar remotamente sem revisao.

DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
