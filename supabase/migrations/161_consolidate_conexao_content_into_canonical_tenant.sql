-- 161 - Consolida o conteúdo da Conexão Maçônica no tenant canônico 00000000-0000-0000-0000-000000000000,
-- cadastra o domínio conexaomaconica.com.br a esse tenant e habilita o acesso público.
--
-- Situação verificada:
--   * tenant ...0000 (Conexão): 2 empresas, 2 organizações;
--   * tenant ...0010 (teste): 1 empresa (Comandos), 1 organização, 1 banner;
--   * tenant_domains não possui o domínio conexaomaconica.com.br, então o site
--     caía no fallback de _resolve_public_tenant_id para ...0010.
--
-- Atomicidade: tudo acontece dentro de um único bloco DO. Qualquer exceção desfaz
-- todas as alterações. Colisões de unique constraint abortam antes de qualquer escrita.
-- Pré-requisito: migration 157 (_resolve_verified_tenant_domain) já aplicada.

DO $$
DECLARE
  v_src constant uuid := '00000000-0000-0000-0000-000000000010';
  v_dst constant uuid := '00000000-0000-0000-0000-000000000000';
  v_domain constant text := 'conexaomaconica.com.br';
  v_n bigint;
  v_fk record;
  v_t record;
BEGIN
  -- 0. Pré-condições
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_dst) THEN
    RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: tenant de destino % não existe', v_dst;
  END IF;

  -- 1. Domínio canônico: sem mapeamento para outro tenant.
  IF EXISTS (
    SELECT 1 FROM public.tenant_domains d
    WHERE lower(regexp_replace(rtrim(btrim(d.domain), '.'), '^www\.', '', 'i')) = v_domain
      AND d.tenant_id <> v_dst
  ) THEN
    RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: % já está mapeado a outro tenant', v_domain;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_domains d
    WHERE lower(regexp_replace(rtrim(btrim(d.domain), '.'), '^www\.', '', 'i')) = v_domain
  ) THEN
    INSERT INTO public.tenant_domains (tenant_id, domain, is_primary, is_verified, ssl_status)
    VALUES (v_dst, v_domain, true, true, 'active');
  ELSE
    UPDATE public.tenant_domains d
    SET is_verified = true, ssl_status = 'active'
    WHERE lower(regexp_replace(rtrim(btrim(d.domain), '.'), '^www\.', '', 'i')) = v_domain
      AND d.tenant_id = v_dst;
  END IF;

  UPDATE public.tenants SET public_access_status = 'enabled' WHERE id = v_dst;

  -- 2. Colisões de unique constraint: aborta antes de qualquer movimentação.
  SELECT count(*) INTO v_n
  FROM public.businesses s
  JOIN public.businesses d ON d.tenant_id = v_dst AND d.cnpj = s.cnpj
  WHERE s.tenant_id = v_src AND s.cnpj IS NOT NULL;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: CNPJ duplicado entre tenants (% empresa(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.businesses s
  JOIN public.businesses d ON d.slug = s.slug AND d.id <> s.id
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: slug de empresa duplicado (% registro(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.organizations s
  JOIN public.organizations d ON d.tenant_id = v_dst
    AND (
      (d.potency = s.potency AND d.code_number = s.code_number)
      OR (d.public_slug IS NOT NULL AND d.public_slug = s.public_slug)
      OR (lower(d.slug) = lower(s.slug) AND btrim(s.slug) <> '')
    )
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: organização duplicada entre tenants (% registro(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.masonic_potencies s
  JOIN public.masonic_potencies d ON d.tenant_id = v_dst AND lower(d.slug) = lower(s.slug)
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: potência com slug duplicado (% registro(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.masonic_rites s
  JOIN public.masonic_rites d ON d.tenant_id = v_dst AND lower(d.slug) = lower(s.slug)
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: rito com slug duplicado (% registro(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.directory_featured_categories s
  JOIN public.directory_featured_categories d ON d.tenant_id = v_dst AND d.category_id = s.category_id
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: categoria em destaque duplicada (% registro(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.directory_sponsored_businesses s
  JOIN public.directory_sponsored_businesses d ON d.tenant_id = v_dst AND d.business_id = s.business_id
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: empresa patrocinada duplicada (% registro(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.payment_provider_settings s
  JOIN public.payment_provider_settings d ON d.tenant_id = v_dst
    AND d.provider = s.provider AND d.environment = s.environment
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: configuração de pagamento duplicada (% registro(s))', v_n; END IF;

  SELECT count(*) INTO v_n
  FROM public.platform_events s
  JOIN public.platform_events d ON d.tenant_id = v_dst AND d.slug = s.slug
  WHERE s.tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: evento com slug duplicado (% registro(s))', v_n; END IF;

  -- 3. Remove temporariamente as FKs compostas que referenciam pais movidos.
  CREATE TEMP TABLE _consolidation_fk ON COMMIT DROP AS
  SELECT c.conrelid::regclass::text AS table_name,
         c.conname AS constraint_name,
         pg_get_constraintdef(c.oid) AS definition
  FROM pg_constraint c
  WHERE c.contype = 'f'
    AND c.confrelid IN (
      'public.businesses'::regclass,
      'public.organizations'::regclass,
      'public.masonic_potencies'::regclass,
      'public.masonic_rites'::regclass,
      'public.platform_events'::regclass
    )
    AND pg_get_constraintdef(c.oid) LIKE '%tenant_id%';

  FOR v_fk IN SELECT * FROM _consolidation_fk LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_fk.table_name, v_fk.constraint_name);
  END LOOP;

  -- 3b. Resgate de teste da Comandos, autorizado pelo responsável. Único registro removido.
  --      O trigger de imutabilidade é desativado somente nesta operação e reativado em seguida.
  ALTER TABLE public.business_benefit_redemptions
    DISABLE TRIGGER trg_protect_business_benefit_redemption_immutability;

  DELETE FROM public.business_benefit_redemptions
  WHERE id = 'e2efa9c8-d53f-4641-8361-ed7a0e06b4de'
    AND tenant_id = v_src
    AND business_id = '00000000-0000-0000-0000-000000000201'
    AND status = 'redeemed';
  GET DIAGNOSTICS v_n = ROW_COUNT;

  ALTER TABLE public.business_benefit_redemptions
    ENABLE TRIGGER trg_protect_business_benefit_redemption_immutability;

  IF v_n > 1 THEN
    RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: exclusão de resgate afetou % registros (esperado: 0 ou 1)', v_n;
  END IF;
  RAISE NOTICE 'Resgate de teste removido: % registro(s)', v_n;

  -- 3c. Responsáveis pelas empresas movidas mantêm acesso ao tenant de destino com o mesmo
  --      papel (cópia de vínculo existente, sem elevar permissões).
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  SELECT DISTINCT v_dst, tm.user_id, tm.role
  FROM public.tenant_members tm
  JOIN public.businesses b ON b.owner_id = tm.user_id AND b.tenant_id = v_src
  WHERE tm.tenant_id = v_src
  ON CONFLICT DO NOTHING;

  -- 4. Pais: empresas, organizações, catálogos, eventos e configurações.
  UPDATE public.businesses SET tenant_id = v_dst WHERE tenant_id = v_src;
  UPDATE public.organizations SET tenant_id = v_dst WHERE tenant_id = v_src;
  UPDATE public.masonic_potencies SET tenant_id = v_dst WHERE tenant_id = v_src;
  UPDATE public.masonic_rites SET tenant_id = v_dst WHERE tenant_id = v_src;
  UPDATE public.platform_events SET tenant_id = v_dst WHERE tenant_id = v_src;
  UPDATE public.payment_provider_settings SET tenant_id = v_dst WHERE tenant_id = v_src;
  -- Configuração do guia: se o tenant canônico já tem uma, ela é mantida e a do tenant
  -- de teste permanece intacta (não é apagada). Sem configuração no destino, ela é movida.
  UPDATE public.directory_home_settings SET tenant_id = v_dst
  WHERE tenant_id = v_src
    AND NOT EXISTS (SELECT 1 FROM public.directory_home_settings WHERE tenant_id = v_dst);
  UPDATE public.directory_banners SET tenant_id = v_dst WHERE tenant_id = v_src;
  UPDATE public.directory_featured_categories SET tenant_id = v_dst WHERE tenant_id = v_src;
  UPDATE public.directory_sponsored_businesses SET tenant_id = v_dst WHERE tenant_id = v_src;

  -- 5. Filhos de empresas, organizações e eventos acompanham o pai.
  --    Triggers de cota (benefícios, serviços etc.) verificam NOVAS alocações no plano do tenant.
  --    Trocar o tenant de um registro existente não cria nada: os triggers de usuário são
  --    suspensos somente durante a troca de cada tabela e reativados logo em seguida.
  FOR v_t IN
    SELECT DISTINCT c.table_name, p.column_name AS fk_column, p.parent_table
    FROM (VALUES
      ('business_id', 'businesses'),
      ('organization_id', 'organizations'),
      ('event_id', 'platform_events')
    ) AS p(column_name, parent_table)
    JOIN information_schema.columns c
      ON c.table_schema = 'public' AND c.column_name = p.column_name
    JOIN information_schema.columns t
      ON t.table_schema = 'public' AND t.table_name = c.table_name AND t.column_name = 'tenant_id'
    JOIN information_schema.tables bt
      ON bt.table_schema = 'public' AND bt.table_name = c.table_name AND bt.table_type = 'BASE TABLE'
    WHERE c.table_name NOT IN ('businesses', 'organizations', 'platform_events')
      AND c.table_name NOT LIKE '%audit%'
  LOOP
    -- Os tenant_id podem ser uuid ou text conforme a tabela; literais %L se adaptam ao tipo da coluna.
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', v_t.table_name);
    EXECUTE format(
      'UPDATE public.%I child SET tenant_id = %L
         FROM public.%I parent
        WHERE child.%I::text = parent.id::text
          AND parent.tenant_id = %L
          AND child.tenant_id = %L',
      v_t.table_name, v_dst, v_t.parent_table, v_t.fk_column, v_dst, v_src
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', v_t.table_name);
  END LOOP;

  -- 6. Recria as FKs. O PostgreSQL revalida; qualquer inconsistência desfaz tudo.
  FOR v_fk IN SELECT * FROM _consolidation_fk LOOP
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', v_fk.table_name, v_fk.constraint_name, v_fk.definition);
  END LOOP;

  -- 7. Verificação final: nada de conteúdo da Conexão restou no tenant de teste.
  SELECT count(*) INTO v_n FROM public.businesses WHERE tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: % empresa(s) ainda no tenant de origem', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.organizations WHERE tenant_id = v_src;
  IF v_n > 0 THEN RAISE EXCEPTION 'CONSOLIDACAO_ABORTADA: % organização(ões) ainda no tenant de origem', v_n; END IF;

  RAISE NOTICE 'Consolidação concluída: conteúdo de % movido para %', v_src, v_dst;
END;
$$;
