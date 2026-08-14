# Fase 1 — Contenção e contratos de autoridade

Status: proposta técnica para aprovação. Nenhuma migration deste documento foi aplicada ao Supabase remoto.

## Limites desta fase

Esta fase não implementa Home, Guia nem templates Bronze, Prata ou Ouro/Fundador. Ela fecha as fontes de autoridade, retira leitura anônima direta de tabelas com colunas privadas e define as projeções mínimas que essas páginas poderão consumir depois.

Na nova conferência do diretório `supabase/migrations`, a última migration anterior a este trabalho era `039_lgpd_retention_rhid_uploads.sql`. Não havia arquivo `040_*` nem conflito de numeração. As propostas são:

1. `040_authority_contracts_and_public_source_containment.sql`;
2. `041_public_read_contracts.sql`.

O `supabase/config.toml` declara PostgreSQL 15. Views com `security_invoker` seriam tecnicamente possíveis nessa versão, mas as projeções propostas usam RPCs `SECURITY DEFINER` com `search_path` fixo, saída tipada e grants explícitos. Isso permite resolver o tenant por host dentro do contrato e não expõe uma view que aceite filtragem arbitrária por `tenant_id`.

## Invariantes globais

- A entrada pública nunca é um UUID de tenant.
- O tenant público é resolvido somente por um registro em `tenant_domains` cujo domínio normalizado esteja verificado, com SSL ativo, e cujo tenant esteja explicitamente habilitado para acesso público.
- Host inválido, tenant desabilitado, slug inexistente e recurso não publicável retornam zero linhas; não retornam erros diferentes que confirmem a existência privada do objeto.
- Apenas empresas `is_active = true` e `publication_status = 'published'` entram nas projeções públicas.
- O papel `anon` perde `SELECT` direto nas tabelas-fonte. As RPCs públicas são os únicos grants anônimos novos.
- Toda paginação é limitada a no máximo 50 itens no banco.
- Rate limit, cache, WAF e controle volumétrico continuam obrigatórios no Edge/API. SQL não substitui proteção de abuso por IP, sessão ou dispositivo.
- Nenhuma função de 030–033 (`claim_founder_slot`, `ingest_payment_event` e rotinas correlatas) é alterada.
- O código de campanha `FUNDADOR599` continua preservado dentro do fluxo transacional real de 030–033; ele deixa de ser autoridade no frontend e nunca concede selo sem uma allocation `granted`.

## Contratos de autoridade

### Empresa Fundadora

Fonte exclusiva:

```text
founder_allocations.tenant_id = empresa.tenant_id
founder_allocations.business_id = empresa.id
founder_allocations.status = 'granted'
```

`reserved`, `expired`, `revoked` e `refund_required` não concedem selo. `founder_qualifications` permanece histórico/legado e não participa do cálculo. A migration 040 adiciona `founder_allocation` às origens de entitlement; origens legadas `founder_qualification` são toleradas para não quebrar dados antigos, mas são ignoradas pelo resolvedor efetivo.

Implementação interna proposta: `_business_is_founder(tenant_id, business_id)`. A função não possui grant para `anon` ou `authenticated`; somente as projeções públicas minimizadas podem consumir seu booleano.

### Empresa Verificada

Fonte exclusiva:

```text
credential_issuances.status = 'verified'
credential_issuances.tenant_id = empresa.tenant_id
credential_issuances.business_id = empresa.id
credential_types.tenant_id IS NULL
credential_types.code = 'business_registration_verification'
credential_issuances.expires_at IS NULL ou ainda vigente
```

A migration 040 semeia a definição global canônica `business_registration_verification`. Um tipo criado por tenant, uma credencial de pessoa/organização ou uma credencial comunitária não concede o selo cadastral.

`business_masonic_links` continua exclusivamente como autoridade do vínculo comunitário. A RPC antiga `get_verified_business_ids()` é removida porque misturava esse vínculo com o selo cadastral e não recebia contexto de tenant.

Implementação interna proposta: `_business_is_registration_verified(tenant_id, business_id)`.

### Plano comercial efetivo

`businesses.plan_tier` é legado/cache. A migration 040 instala um trigger que impede clientes `anon`/`authenticated` de inserir um tier diferente do padrão ou alterar o campo. Escrita futura desse cache exige `service_role` ou RPC auditada.

O resolvedor `_effective_business_plan(tenant_id, business_id)` exige exatamente uma assinatura elegível ligada a uma versão de plano e a um plano do mesmo tenant:

- `active`: dentro de `current_period_start` e `current_period_end`;
- `past_due`: somente até `grace_until` explícito;
- `canceled`: somente até `access_ends_at` explícito;
- `pending` e `expired`: nunca elegíveis.

A assinatura só entra no conjunto elegível se existir ao menos um entitlement ativo, vigente e cuja origem seja exatamente a `plan_version` contratada. Isso evita tratar um registro financeiro incompleto como autoridade de premium.

Se zero ou mais de uma assinatura forem elegíveis, o resolvedor retorna zero linhas. Ele não escolhe o maior tier e não converte a ausência de autoridade em Bronze.

Entitlements só entram quando o grant está ativo e vigente. Origens aceitas:

- a mesma `plan_version` da assinatura;
- `founder_allocation` cuja allocation esteja `granted` para a mesma empresa e tenant;
- campanha ou override manual rastreável.

Origem `founder_qualification` não entra. Overrides usam o registro mais recente. O resolvedor retorna um mapa tipado de entitlements internamente, mas as RPCs públicas desta fase expõem somente o `plan_code`; conteúdo premium futuro deve ser filtrado server-side por entitlement, nunca apenas estilizado no cliente.

As colunas novas `grace_until` e `access_ends_at` tornam carência e cancelamento explícitos. O processador de billing deverá preenchê-las; `NULL` falha fechado.

### Responsável público

A função `_public_business_responsible(tenant_id, business_id)` só retorna dados quando todos os vínculos abaixo existem ao mesmo tempo:

1. `business_members` ativo para a mesma pessoa, empresa e tenant;
2. `profiles.status = 'active'`;
3. `business_masonic_links` principal, ativo, vigente, com `verified_by` e `verified_at`;
4. `business_masonic_link_authorizations` ativa, vigente e com escopo `company_listing`;
5. `business_masonic_link_publication_consents` vigente, `public_all`, `granted`, não revogado e com `display_name = true`.

A saída é um JSON minimizado com nome, papel empresarial autorizado quando consentido, organização quando consentida e o booleano `community_verified`. Nunca retorna `user_id`, `owner_id`, perfil completo, CIMB, grau, contato, evidências ou dados de `masonic_affiliations`.

## Contratos públicos mínimos

### `public_tenant_branding`

| Item | Contrato |
|---|---|
| Entrada | `p_host text` |
| Saída | `tenant_slug`, `display_name`, `logo_url`, `favicon_url`, cores validadas, fonte, raio, densidade e modo de cor |
| Tenant | `_resolve_public_tenant_id(p_host)`; domínio verificado + SSL ativo + tenant habilitado |
| Autorização | `EXECUTE` para `anon` e `authenticated`; fontes sem `SELECT` anônimo |
| Filtros | Apenas chaves de branding em allowlist; nunca retorna `settings` inteiro |
| Enumeração | Host inválido/desconhecido retorna zero linhas; tamanho e alfabeto do host são validados |
| Índices | `uq_tenant_domains_domain_normalized`, `idx_tenant_domains_public_resolution` |
| RLS | RPC `SECURITY DEFINER`, `search_path` fixo, saída tipada, grants revogados por padrão |
| Testes | host verificado positivo; host desconhecido negativo; ausência de `settings` na forma pública |

### `public_home_content`

| Item | Contrato |
|---|---|
| Entrada | `p_host text` |
| Saída | campos editoriais explícitos da Home e array de banners institucionais |
| Tenant | Resolução comum por host |
| Autorização | leitura pública pela RPC; escrita de `tenant_public_home_content` somente para tenant admin/master |
| Filtros | conteúdo `published` com `published_at <= now`; banners ativos dentro de `start_at/end_at` |
| Enumeração | não recebe `tenant_id`; host inválido retorna zero linhas |
| Índices | unicidade de conteúdo por tenant; `idx_banners_active` existente |
| RLS | tabela editorial com RLS administrativa; `anon` sem acesso direto |
| Testes | Home publicada positiva; rascunho/tenant desabilitado negativos; banner expirado negativo |

O contrato usa `banners` para conteúdo institucional. `business_banners` permanece anúncio de empresa e não é inserido automaticamente por upgrade.

### `public_directory_search`

| Item | Contrato |
|---|---|
| Entrada | host, busca opcional (até 128 caracteres), categoria, cidade, UF, cursor público `(after_name, after_slug)` e limite |
| Saída | slug/nome/descrição curta/logo, categoria principal, cidade/UF, Fundadora, Verificada, plano efetivo e próximo cursor |
| Tenant | Resolução comum por host |
| Autorização | somente RPC; nenhuma consulta anônima direta a `businesses` |
| Filtros | empresa ativa, publicada, com slug; relações normalizadas de categoria e localização |
| Enumeração | limite 50; cursor incompleto retorna zero sequência; não aceita UUID de tenant |
| Índices | GIN de busca, cursor `(tenant_id, lower(name), slug)`, categorias e localização |
| RLS | `SECURITY DEFINER` com colunas fixas; fontes revogadas de `anon` |
| Testes | publicada positiva; draft negativa; tenant cruzado negativo; limite e cursor |

Fontes canônicas escolhidas: `business_categories/categories` para categoria e `business_locations` para cidade/UF. `businesses.category` e `businesses.address` não são fallback do contrato.

### `public_business_detail`

| Item | Contrato |
|---|---|
| Entrada | `p_host text`, `p_business_slug text` |
| Saída | identidade pública, categoria, locais, contatos marcados públicos, horários, mídia de imagem/vídeo, autoridades e agregado de reviews publicadas |
| Tenant | host resolvido antes de combinar slug |
| Autorização | somente RPC |
| Filtros | empresa ativa/publicada; contatos `is_public`; reviews `published`; mídia somente imagem/vídeo |
| Enumeração | inexistente, privada e de outro tenant retornam a mesma resposta vazia |
| Índices | slug existente; índices de relações públicas da 040 |
| RLS | projeção explícita; sem `owner_id`, CNPJ, razão social ou e-mail legado |
| Testes | shape sem chaves privadas; empresa draft negativa; plano inativo não libera tier; Fundador/Verificada positivos e negativos |

`business_contacts` é a fonte canônica de contatos. Os campos legados `businesses.phone/email/website` não são projetados. `business_media` é a fonte da galeria; `businesses.logo_url` permanece temporariamente a fonte da logomarca até o contrato de mídia ganhar um tipo específico.

### `public_business_reviews`

| Item | Contrato |
|---|---|
| Entrada | host, slug da empresa, cursor `(before_created_at, before_id)` e limite |
| Saída | id público da review, nota, comentário, data de publicação e resposta empresarial moderada |
| Tenant | host + empresa pertencente ao tenant resolvido |
| Autorização | somente RPC |
| Filtros | empresa ativa/publicada e `moderation_status = 'published'` |
| Enumeração | limite 50; sem `user_id`; cursor incompleto não avança |
| Índices | `idx_business_reviews_public_page` |
| RLS | `anon` sem `SELECT` na tabela; usuário vê a própria review; admin modera |
| Testes | pendente negativa, publicada positiva, autor privado ausente |

Novas reviews de usuário sempre entram como `pending`. Usuários só editam/excluem as próprias reviews pendentes. Campos de moderação e resposta são protegidos por trigger; resposta empresarial continuará indisponível até existir RPC específica e auditada para membros autorizados.

### `public_masonic_lodges`

| Item | Contrato |
|---|---|
| Entrada | host, busca, cidade, UF, cursor por nome/slug e limite |
| Saída | slug, nome, número, potência, rito, fundação, agenda textual e cidade/UF |
| Tenant | resolução comum por host |
| Autorização | somente RPC |
| Filtros | organização ativa, explicitamente publicada e com slug público |
| Enumeração | limite 50; nenhum UUID interno; rascunho e suspensa retornam zero linhas |
| Índices | diretório parcial e GIN de busca em organização |
| RLS | fonte sem `SELECT` anônimo; e-mail e pessoas não são projetados |
| Testes | loja publicada positiva; rascunho negativa; tenant cruzado negativo |

As colunas `public_slug`, `publication_status`, `city` e `state` são estruturais. Endereço completo e reuniões estruturadas continuam bloqueios para uma etapa posterior.

## Matriz RLS mínima

| Cenário | Tabela-fonte direta | RPC pública esperada |
|---|---|---|
| Visitante anônimo | `SELECT` negado | somente linhas públicas do host |
| Usuário autenticado | próprios tenants/empresas/reviews conforme relação | mesma projeção pública quando usar RPC |
| Tenant A consultando host A | sem acesso direto por mera publicação | dados públicos de A |
| Tenant A consultando host B | somente se o host B for público; nunca por UUID | dados públicos de B, sem dados privados/autorizados |
| Empresa ativa em draft | membro autorizado pode gerenciar | zero linhas públicas |
| Empresa ativa publicada | membro autorizado pode gerenciar | uma linha pública |
| Review pending | autor/admin | zero linhas públicas |
| Review published | autor/admin | uma linha pública sem autor |
| Fundador reserved | membros/admin | `is_founder = false` |
| Fundador granted | membros/admin | `is_founder = true` |
| Assinatura inativa + `plan_tier=ouro` | membros financeiros/admin | `effective_plan_code = null` |
| Campo privado de empresa | somente papel autorizado | chave inexistente na saída pública |

## Testes automatizados

Arquivo: `supabase/tests/rls/040_public_contracts_rls.sql`.

O teste é transacional, cria fixtures determinísticas, alterna explicitamente para os papéis `anon` e `authenticated` e executa `ROLLBACK` ao final. Ele cobre os cenários da matriz, diferencia credencial cadastral de credencial comunitária e verifica que `businesses.plan_tier` não pode ser alterado pelo anunciante.

Runner local: `scripts/run-rls-tests.cjs`.

```powershell
pnpm test:rls
```

O runner só usa `supabase start`, `supabase db reset` local e `supabase db query --local`; ele não possui caminho de execução remota. Nesta revisão, a execução foi bloqueada antes do SQL porque Docker/Podman não está instalado ou disponível no `PATH`. Portanto, os testes estão criados, mas não há resultado verde alegado.

## Geração correta de tipos Supabase

`apps/web/src/types/database.types.ts` não deve ser preenchido manualmente. Como 040/041 ainda aguardam aprovação e não puderam ser aplicadas ao stack local, regenerar agora produziria um contrato diferente das propostas.

Procedimento após aprovação:

1. iniciar o stack local com Docker;
2. executar `pnpm db:migrate:test` ou `pnpm test:rls` e exigir reset/migrations/testes verdes;
3. gerar para arquivo temporário com `supabase gen types typescript --local --schema public`;
4. substituir `database.types.ts` somente se o comando terminar com código zero;
5. executar typecheck, testes e build;
6. comparar o hash/schema local com a revisão de migration aprovada antes de qualquer geração a partir do remoto.

Até essas condições serem satisfeitas, o arquivo de tipos permanece um bloqueio explícito, não uma sincronização simulada.

## Pré-flight antes de aprovar/aplicar

- Verificar duplicidades case-insensitive em `tenant_domains`; o índice normalizado falha fechado se houver colisão.
- Auditar múltiplas assinaturas `active/past_due` por empresa antes de criar o índice único.
- Definir quais tenants e domínios serão habilitados. O padrão `public_access_status = 'disabled'` desliga tudo com segurança.
- Popular `grace_until` e `access_ends_at` no processador de billing antes de depender de carência/cancelamento.
- Validar e depois marcar como `VALID` os checks adicionados inicialmente como `NOT VALID`.
- Confirmar quem pode emitir a credencial global de verificação cadastral e manter anti-self-approval.
- Criar endpoint/Edge Function com rate limit para as RPCs antes de tráfego público relevante.
- Atualizar consumidores existentes de `get_verified_business_ids` para o novo contrato antes da aplicação da 040.

## Bloqueios restantes

- Docker/Podman indisponível impediu `db reset`, parse real e execução da suíte RLS.
- As migrations são propostas e precisam de revisão SQL independente antes de aplicação.
- Não há painel para habilitar tenant, publicar Home, moderar reviews ou publicar lojas.
- O backend transacional ainda precisa preencher janelas de carência/cancelamento e grants de entitlement.
- A resposta empresarial de review não tem RPC de escrita autorizada.
- Rate limiting/telemetria de abuso não existe na camada de entrada pública.
- Tipos Supabase só podem ser regenerados após schema aprovado e validado.
- Referências visuais continuam fora do repositório e não fazem parte desta fase.
