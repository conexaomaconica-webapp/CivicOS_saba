-- 190 - O dono da empresa (businesses.owner_id) e a equipe com permissão podem gerir o conteúdo da própria empresa.
--
-- Problema: várias políticas de escrita/leitura só reconheciam quem tem uma linha em business_members (ex.: business_services
-- exigia role owner/admin ali) ou comparavam com o tenant da sessão. Donos cadastrados apenas por owner_id (como Óptica Circulô e
-- Melissa Saba, que não têm membros) eram bloqueados ao salvar serviços, contatos, horário, mídias e ao enviar arquivos.
--
-- Esta migration é ADITIVA: cria uma política permissiva extra por tabela (políticas permissivas se somam por OU) e não remove
-- nenhuma existente. Escopo sempre limitado à própria empresa (business_id).

DO $do$
DECLARE
  t TEXT;
  pol TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_services', 'business_benefits', 'business_events', 'business_posts',
    'business_contacts', 'business_hours', 'business_locations', 'business_media', 'business_responsibles'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    pol := 'p_' || t || '_owner_team_manage';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = %I.business_id AND b.owner_id = auth.uid())
          OR public.has_business_permission(%I.tenant_id, %I.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = %I.business_id AND b.owner_id = auth.uid())
          OR public.has_business_permission(%I.tenant_id, %I.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
        )
    $f$, pol, t, t, t, t, t, t, t, t);
  END LOOP;
END
$do$;

-- Armazenamento: envio, troca e remoção de arquivos em business-assets/{tenant_id}/{business_id}/... pelo dono ou equipe.
DROP POLICY IF EXISTS "business_assets_owner_team_manage" ON storage.objects;
CREATE POLICY "business_assets_owner_team_manage"
  ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[2]
        AND b.tenant_id::text = (storage.foldername(name))[1]
        AND (
          b.owner_id = auth.uid()
          OR public.has_business_permission(b.tenant_id, b.id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
        )
    )
  )
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[2]
        AND b.tenant_id::text = (storage.foldername(name))[1]
        AND (
          b.owner_id = auth.uid()
          OR public.has_business_permission(b.tenant_id, b.id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
        )
    )
  );

NOTIFY pgrst, 'reload schema';
