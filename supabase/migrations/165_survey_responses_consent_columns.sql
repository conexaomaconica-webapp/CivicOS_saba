-- 165 - Garante as colunas de consentimento em survey_responses.
--
-- A migração 117 define consent_research e consent_commercial, mas usa
-- CREATE TABLE IF NOT EXISTS: onde a tabela já existia sem elas, as colunas nunca
-- foram criadas. submitSurveyResponseAction as envia no insert, e o PostgREST rejeitava
-- com "Could not find the 'consent_commercial' column", exibido ao usuário como
-- "Erro ao registrar resposta principal.".

ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS consent_research BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_commercial BOOLEAN NOT NULL DEFAULT false;

-- Recarrega o cache de schema do PostgREST.
NOTIFY pgrst, 'reload schema';
