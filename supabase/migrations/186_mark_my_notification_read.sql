-- 186 - Marcar aviso in-app como lido (portal do anunciante).
--
-- operational_notifications só permite UPDATE a administradores (066). O destinatário precisa de um caminho
-- seguro para marcar o PRÓPRIO aviso como lido: esta função só altera linhas em que recipient_id = auth.uid().

CREATE OR REPLACE FUNCTION public.mark_my_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  UPDATE public.operational_notifications
  SET is_read = true
  WHERE id = p_notification_id AND recipient_id = auth.uid();
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_my_notification_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_my_notification_read(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
