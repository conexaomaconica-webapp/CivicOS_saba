-- 212 - Restringe o search_path das triggers de quota privilegiadas.
-- Todas as relacoes usadas pelas funcoes 205 ja sao qualificadas com public.
-- Somente local/homologacao nesta etapa.

ALTER FUNCTION public._trg_enforce_business_service_quota()
  SET search_path = '';
ALTER FUNCTION public._trg_enforce_business_benefit_quota()
  SET search_path = '';
