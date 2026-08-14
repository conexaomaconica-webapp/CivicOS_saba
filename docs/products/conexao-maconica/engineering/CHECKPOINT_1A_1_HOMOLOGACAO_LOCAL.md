# Checkpoint 1A.1 — Homologação local e auditoria das migrations 040/041

Status: **verde em PostgreSQL 15 local; bloqueado para aplicação remota até autorização explícita**.

Data da homologação: 14 de agosto de 2026. Nenhum comando usou `--linked`, project ref, credencial remota ou endpoint Supabase remoto.

## 1. Ambiente e reset

Docker Desktop não pôde ser instalado porque o instalador exige aproximadamente 3,4 GiB livres no volume do Windows e havia menos de 1 GiB disponível. Docker, Podman e uma distribuição WSL funcional não estavam disponíveis.

Foi usada a alternativa local segura prevista no checkpoint:

- PostgreSQL 15.19 oficial para Windows, executado apenas em `127.0.0.1:55432`;
- banco descartável `saas_test`, autenticação local `trust` e sem listener externo;
- bootstrap mínimo de papéis/schemas Supabase em `supabase/tests/local/postgres_supabase_bootstrap.sql`;
- pgTAP 1.3.4 instalado apenas na instância descartável;
- seed versionado do projeto depois das migrations.

Resultado do último reset limpo:

```text
001_tenants.sql ... 039_lgpd_retention_rhid_uploads.sql
040_authority_contracts_and_public_source_containment.sql
041_public_read_contracts.sql
RESET_OK migrations=41 last=041_public_read_contracts.sql
```

As migrations 030–033 não foram alteradas. A ausência de `pg_cron` produziu apenas o `NOTICE` já previsto pela migration 039, que adia o agendamento para um runner externo.

Limite conhecido: esta rodada comprova PostgreSQL, SQL, catálogo, RLS, grants e funções reais, mas não substitui uma futura rodada de paridade com a stack Docker completa do Supabase (PostgREST/Auth/Storage). Isso não autoriza aplicação remota.

Depois da última repetição verde, a instância foi encerrada com `pg_ctl` e seus binários, banco descartável, fontes auxiliares e downloads foram removidos do workspace. Permaneceram somente o bootstrap, as migrations, a matriz pgTAP e os tipos gerados necessários à revisão e à reprodução.

## 2. Correções feitas em 040 e 041

### Migration 040

- recompilação dos helpers `SECURITY DEFINER` herdados com `SET search_path = ''` e nomes qualificados;
- owners explícitos e grants mínimos para helpers de tenant, RBAC e autoridade;
- autoridade exclusiva de Fundadora por allocation `granted`, escopada por tenant e empresa;
- credencial de verificação empresarial por definição/tipo correto, tenant, empresa, estado e validade;
- plano efetivo por assinatura, versão e entitlement vigentes, com falha fechada para ambiguidade;
- responsável público por relação autorizada, perfil, vínculo verificado e consentimento vigente;
- bloqueio da alteração direta de `businesses.plan_tier` fora do fluxo autorizado;
- remoção do `SELECT` anônimo das tabelas privadas e preservação das leituras autenticadas autorizadas;
- eliminação da recursão entre policies de `profiles` por helpers seguros;
- índices das autoridades e cursores públicos, inclusive `lower(name)` para o cursor de organizações.

### Migration 041

- normalização fechada de protocolo, caixa, `www`, ponto final e porta válida;
- rejeição de path, query, fragmento, user-info, whitespace, IPv6/host ambíguo e rótulos DNS inválidos;
- resolução somente por domínio verificado, SSL ativo e tenant publicável;
- seis RPCs com owner `postgres`, `SECURITY DEFINER`, `search_path` vazio, relações qualificadas e sem SQL dinâmico;
- `REVOKE` por assinatura completa para `PUBLIC`, `anon`, `authenticated` e `service_role`, seguido de grant apenas para `anon` e `authenticated`;
- bloqueio da migration caso exista overload de uma RPC pública;
- paginação máxima de 50, cursores completos e ordenação determinística;
- retorno mínimo, URLs públicas seguras e ausência de identificadores/campos privados.

## 3. Auditoria das seis RPCs

| RPC | Owner / path | Grants | Limite e ordem | Projeção privada |
|---|---|---|---|---|
| `public_tenant_branding(text)` | `postgres`; vazio | `anon`, `authenticated` | uma linha por host único | não retorna `tenant_id` nem `settings` |
| `public_home_content(text)` | `postgres`; vazio | `anon`, `authenticated` | conteúdo publicado; banners ordenados por início/id | não retorna configuração interna |
| `public_directory_search(...)` | `postgres`; vazio | `anon`, `authenticated` | 1–50; `lower(name), slug` | não retorna CNPJ, razão social, owner ou e-mail |
| `public_business_detail(text,text)` | `postgres`; vazio | `anon`, `authenticated` | slug validado; no máximo uma linha | contatos apenas `is_public`; responsável minimizado |
| `public_business_reviews(...)` | `postgres`; vazio | `anon`, `authenticated` | 1–50; `created_at DESC, id DESC` | não retorna autor/reviewer |
| `public_masonic_lodges(...)` | `postgres`; vazio | `anon`, `authenticated` | 1–50; `lower(name), public_slug` | somente dados institucionais publicados |

O catálogo confirmou exatamente seis assinaturas, sem overloads, `prosecdef = true`, `proconfig = {search_path=""}` e ACL sem `PUBLIC`/`service_role`.

`EXPLAIN` confirmou uso de:

- `idx_tenant_domains_public_resolution` + `idx_tenants_public_access`;
- `idx_businesses_public_cursor`;
- `idx_business_reviews_public_page`;
- `idx_organizations_public_directory`;
- índices GIN de busca para empresas e organizações quando há consulta textual.

## 4. Resolução segura por host

Fluxo implementado:

```text
requisição ao Next.js
→ `headers().get('host')` no servidor
→ limite/forma básica no servidor
→ RPC recebe somente o host, nunca tenant_id
→ normalização canônica no PostgreSQL
→ `tenant_domains` verificado + SSL ativo
→ exatamente um tenant com acesso público habilitado
→ projeção pública mínima
→ tema/metadados/RPCs no SSR
```

`x-tenant-id`, cookie de tenant e `tenant_id` enviado pelo cliente não participam da autoridade anônima. Host desconhecido, inativo, de outro tenant ou ambíguo retorna zero linhas. Localhost e preview só resolvem se cadastrados e verificados explicitamente; caso contrário o shell usa o estado neutro/indisponível. Proteção volumétrica e rate limit permanecem responsabilidade da borda/API.

## 5. Matriz RLS

Arquivo: `supabase/tests/rls/040_public_contracts_rls.sql`.

Resultado final:

```text
PGTAP_SUMMARY ok=52 not_ok=0 plan=1..52 exit=0
```

Os 52 casos cobrem:

- host válido/normalizado, desconhecido, spoofed, de outro tenant, duplicado e tenant não publicável;
- empresa de outro tenant, rascunho, ativa não publicada, inativa e publicada;
- reviews pendente, rejeitada e publicada;
- Fundador reservado, granted e cruzamento de tenant;
- credencial correta, tipo incorreto e revogada;
- assinatura inativa, válida, ambígua e entitlement expirado;
- responsável consentido, sem consentimento vigente e revogado;
- bloqueio de CNPJ, `owner_id`, razão social, e-mail privado e `settings`;
- chamada direta sem grant, helper interno sem grant, limite 50, busca especial, query longa e cursor parcial;
- regressão autenticada para anunciante, Tenant Admin, perfil e favoritos;
- bloqueio de alteração direta do plano legado.

## 6. Três falhas de `masonic-affiliation.test.ts`

As três falhas eram os casos positivos abaixo:

| Teste | Esperado | Recebido | Causa e relação com a fase | Correção |
|---|---|---|---|---|
| irmão maçom com CIMB/atividade válidos | sem erros | erro de consentimento | fixture não acompanhou o contrato LGPD que exige consentimento destacado para vínculo declarado; relacionado à Fase 1 | incluir `masonicConsent: true` no caso positivo |
| cunhada com nome do marido | sem erros | erro de consentimento | mesma causa | incluir consentimento no caso positivo |
| DeMolay/Filha de Jó com capítulo | sem erros | erro de consentimento | mesma causa nos dois valores do loop | incluir consentimento no caso positivo |

Foi adicionado também um teste negativo explícito para vínculo declarado sem consentimento. Não houve relaxamento da regra de domínio.

Resultado final: `12/12` testes maçônicos verdes dentro dos `111/111` testes do web.

## 7. Tipos gerados

`apps/web/src/types/database.types.ts` foi gerado mecanicamente do schema `public` do banco local verde. Não houve preenchimento manual.

A CLI Supabase 2.111.0 conectou ao banco, mas exige Docker para iniciar `postgres-meta` mesmo com `--db-url`. O artefato foi então produzido pelo gerador oficial `supabase/postgres-meta` v0.97.0, executado localmente contra:

```powershell
$env:PG_META_DB_URL = 'postgresql://postgres@127.0.0.1:55432/saas_test'
$env:PG_META_GENERATE_TYPES = 'typescript'
$env:PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS = 'public'
node .local-postgres-meta/lib/server/app.js > .database.types.generated.ts
```

O resultado foi movido integralmente para `apps/web/src/types/database.types.ts`, sem completar ou corrigir declarações à mão. O checkout temporário do gerador e o arquivo intermediário foram removidos depois da validação.

As seis RPCs constam no tipo gerado. Os casts temporários de `SupabaseClient` foram removidos e os consumidores agora usam diretamente os tipos de `Database['public']['Functions']`.

## 8. Validação da aplicação

Resultados finais:

- `pnpm lint`: 11/11 tarefas verdes;
- `pnpm typecheck`: 15/15 tarefas verdes;
- `pnpm test`: 14/14 tarefas verdes, testes arquiteturais verdes;
- Core: 122 passados, 2 deliberadamente ignorados;
- Infrastructure: 87 passados;
- Web: 111 passados;
- tema Conexão Maçônica: 3 passados;
- `pnpm build`: 12/12 tarefas verdes; Next gerou 40/40 páginas.

O runner web recebeu um bootstrap restrito ao Windows porque o `tsx` chamava `os.userInfo()` e o token restrito do processo devolvia `ENOMEM`. O bootstrap apenas fornece um identificador estável para a pasta temporária. O teste raiz foi serializado para uso previsível de memória.

O shell deixou de importar `Inter` por `next/font/google`: esse caminho exigia acesso à rede durante um build limpo. O token `platform-sans` agora usa a pilha local/sistema aprovada e continua substituível pelo contrato de tema, tornando o build reprodutível sem baixar fonte remota.

Os componentes auxiliares foram movidos de um diretório chamado `aux`, reservado pelo Windows, para `ui-states`; a amostra equivalente passou a `/design-lab/states`. Isso eliminou o aviso de metadados do Turbo sem mudar os estados AUX-001–006 nem as superfícies do produto.

## 9. Arquivos centrais alterados neste checkpoint

- `supabase/migrations/040_authority_contracts_and_public_source_containment.sql`;
- `supabase/migrations/041_public_read_contracts.sql`;
- `supabase/tests/rls/040_public_contracts_rls.sql`;
- `supabase/tests/local/postgres_supabase_bootstrap.sql`;
- `scripts/run-rls-tests.cjs`;
- `apps/web/src/types/database.types.ts`;
- resolvedor de tenant/SEO/middleware e consumidores públicos do Guia;
- `apps/web/test/masonic-affiliation.test.ts`;
- runners de teste/lint e fronteira SDK do tema white label.

## 10. Bloqueios e próxima decisão

- 040/041 **não foram aplicadas remotamente**;
- a stack Docker completa do Supabase ainda depende de liberar espaço no volume do Windows e atualizar/configurar WSL ou disponibilizar Docker/Podman;
- aplicação remota exige identificação inequívoca do projeto/ambiente, conferência de 001–039, backup recuperável e uma autorização final separada;
- as cinco páginas visuais continuam fora do escopo desta etapa.
