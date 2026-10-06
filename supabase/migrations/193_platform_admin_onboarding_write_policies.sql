-- 193 - Admin de plataforma consegue gravar nas tabelas do onboarding (sem depender de ser master ou admin do tenant).
--
-- Problema: o app libera as telas de /admin para quem passa em has_platform_admin_access() (profiles.role em admin,
-- superadmin, platform_admin, master, socio_admin), mas as políticas de escrita só aceitam:
--   * businesses: dono da empresa ou role 'master' (get_current_user_role() = 'master');
--   * business_masonic_links e demais tabelas filhas: has_tenant_admin_access() (master, tenant_members/user_roles com
--     papel admin/tenant_admin/owner/socio_admin) ou o próprio declarante;
--   * admin_audit_logs: sem política de INSERT para usuários (só a chave de serviço grava).
-- Um usuário com profiles.role = 'admin' que é apenas "member" no tenant passa na tela e leva
-- "new row violates row-level security policy" ao criar o vínculo maçônico, publicar, etc.
--
-- Solução (aditiva, não remove nem altera política existente): políticas extras para quem passa em
-- has_platform_admin_access(), nas tabelas do fluxo de onboarding. Fora de propósito: contratos, aceites, snapshots,
-- faturas, pagamentos e assinaturas (evidência jurídica/financeira: continuam só pela chave de serviço no servidor).

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'businesses',
    'business_masonic_links',
    'business_responsibles',
    'business_contacts',
    'business_locations',
    'business_hours',
    'business_media',
    'business_categories',
    'business_recognitions',
    'organizations',
    'categories'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Platform admins manage %1$s" ON public.%1$I', v_table);
      EXECUTE format(
        'CREATE POLICY "Platform admins manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_platform_admin_access()) WITH CHECK (public.has_platform_admin_access())',
        v_table
      );
    END IF;
  END LOOP;
END
$$;

-- Trilha de auditoria: o admin registra as próprias ações (actor_id precisa ser ele mesmo) e as lê.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_logs') THEN
    DROP POLICY IF EXISTS "Platform admins insert own audit logs" ON public.admin_audit_logs;
    CREATE POLICY "Platform admins insert own audit logs"
      ON public.admin_audit_logs FOR INSERT TO authenticated
      WITH CHECK (public.has_platform_admin_access() AND actor_id = auth.uid());

    DROP POLICY IF EXISTS "Platform admins read audit logs by role" ON public.admin_audit_logs;
    CREATE POLICY "Platform admins read audit logs by role"
      ON public.admin_audit_logs FOR SELECT TO authenticated
      USING (public.has_platform_admin_access());
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
