# P0-B — Plano Executivo de Autenticação, Sessão e Isolamento Mobile

> **Status:** P0-B — em revisão técnica; implementação não autorizada.  
> **Data da auditoria:** 14/10/2026.  
> **Escopo:** somente leitura, diagnóstico e planejamento.  
> **Não autoriza:** dependências, código funcional, migrations, grants, policies, configuração Auth, credenciais, deploy ou testes contra produção.

## 1. Resultado executivo

O repositório contém uma base web funcional de Supabase Auth, helpers de autorização e RPCs úteis para membros, favoritos, indicações e conexões. O aplicativo ainda não possui cliente Supabase, telas de autenticação, listener de deep link nem armazenamento seguro de sessão.

O P0-B **não está autorizado para implementação**. A Fase 1 de contenção de leitura entre linhas foi aplicada e aguarda testes; a minimização de colunas e a migração dos consumidores continuam pendentes. Quatro bloqueadores precisam de correção, comprovação ou decisão formal:

1. a policy global de `profiles` foi removida na homologação, mas o grant de `SELECT` de tabela permanece para `authenticated`, mantendo exposição de todas as colunas nos escopos autorizados;
2. existem 155 funções `SECURITY DEFINER`, muitas com `search_path = public`, e 101 grants de execução para `PUBLIC`;
3. RPCs candidatas ao mobile aceitam `p_host` informado pelo cliente e usam `_resolve_public_tenant_id`, que contém fallback de tenant;
4. `current_tenant_id()` espera `tenant_id` no JWT, mas não existe custom access token hook ativo no repositório.

O Project Ref lido de `.env.local` é `rwvztwsjcjljphqttiws`. Isso confirma apenas a configuração local encontrada, não que Preview, Production, dispositivos ou o Supabase CLI estejam apontando para o mesmo projeto. Nenhum acesso remoto foi executado.

### 1.1 Decisão arquitetural — banco multi-tenant, aplicativo single-tenant

O Supabase da Conexão Maçônica é compartilhado e multi-tenant. Android e iOS são aplicativos exclusivos da Conexão Maçônica e operam somente no tenant canônico da plataforma. O cliente mobile não terá descoberta, seleção ou alternância de tenant, nem uma tabela de usuários paralela: o login usa o Supabase Auth e os perfis existentes em `public.profiles`.

O identificador efetivo do tenant será obtido de configuração confiável no servidor e o acesso privado dependerá de vínculo efetivo com a Conexão Maçônica, conta ativa e privilégio compatível. `tenant_id`, host, claim customizado ou header enviado pelo aplicativo nunca será prova de autorização. O backend continuará validando `auth.uid()`, memberships, vínculos empresariais, papéis, escopo do recurso e regras administrativas; `master` não implica acesso irrestrito sem vínculo ou escopo válido. RLS permanece obrigatória onde o cliente autenticado acessar o Supabase.

Um segundo tenant continuará presente apenas nos testes adversariais de isolamento. Isso comprova que uma versão manipulada do cliente, um JWT inadequado ou um identificador cruzado não consegue sair do contexto fixo da Conexão Maçônica. Alterações em `profiles`, Auth, RLS, grants ou triggers são globais ao banco compartilhado e exigem análise de impacto sobre os demais tenants e aplicações.

## 2. Referências normativas

- `docs/mobile/MOBILE_ARCHITECTURE_P0A.md`;
- `docs/mobile/MOBILE_ROADMAP.md`;
- `docs/mobile/MOBILE_ARCHITECTURE_AUDIT.md`;
- `docs/rls-audit-matrix.md`;
- `docs/security/ENV_SECURITY.md`.

Decisões preservadas:

- Web em Next.js; mobile em React + Vite + Capacitor;
- Supabase como fonte canônica;
- `@saas/core/contracts/mobile/v1` como destino futuro dos schemas/DTOs, ainda não implementado;
- planos, contratos, pagamentos e renovações exclusivamente na web;
- nenhuma chave `service_role` no aplicativo;
- Pedra Fundamental, Fundadora e Coluna de Honra fora dos entitlements comerciais.

## 3. Inventário técnico atual

### 3.1 Web e autenticação

| Evidência | Estado observado | Consequência para o P0-B |
| --- | --- | --- |
| `apps/web/src/lib/supabase/client.ts` | browser usa `createBrowserClient` com URL e anon key públicas | padrão web não pode ser copiado sem storage/lifecycle nativos |
| `apps/web/src/lib/supabase/server.ts` | SSR usa cookies por `@supabase/ssr` | permanece exclusivo da web |
| `apps/web/src/lib/supabase/middleware.ts` | middleware atualiza cookies de sessão | não atende ao ciclo de vida Capacitor |
| `apps/web/src/middleware.ts` | valida usuário com `auth.getUser()` e lê papel/tenant de `profiles` | boa referência de validação remota, mas não é contrato mobile |
| `apps/web/src/lib/auth/auth-service.ts` | password login, signup, recovery, exchange, update e sign-out | funções puras podem inspirar portas, não ser importadas pelo app |
| `apps/web/src/app/auth/callback/route.ts` | troca `code` por sessão | callback web não trata callback nativo |
| `apps/web/src/lib/auth/internal-redirect.ts` | sanitiza redirects internos | sanitizador deve ser compartilhado/adaptado ao mobile |
| `apps/web/src/lib/admin/admin-auth-helper.ts` | `getUser()` + RPC/papel protegido | administração continua fora do mobile |

### 3.2 Mobile

| Evidência | Estado observado | Lacuna |
| --- | --- | --- |
| `apps/mobile/package.json` | Capacitor 7, sem `@supabase/supabase-js` e sem `@capacitor/app` | não existe cliente Auth nem lifecycle/deep link |
| `apps/mobile/src/adapters.ts` | `CapacitorStorageAdapter` usa `@capacitor/preferences` | aceitável apenas para preferências não sensíveis |
| `apps/mobile/capacitor.config.ts` | `appId` é `com.conexaomaconica.app`; sem configuração de links | Universal/App Links e fallback ainda não desenhados no nativo |
| `packages/core/src/contracts/auth.contract.ts` | contrato genérico contém access/refresh token e `tenantId` | `tenantId` não pode ser autoridade; tokens não devem circular pela UI |
| `packages/core/src/contracts/mobile/v1` | inexistente | definido pelo P0-A, ainda sem implementação |

### 3.3 Supabase e autorização

| Recurso | Evidência local | Leitura preliminar |
| --- | --- | --- |
| `profiles` | migrations `002`, `040`, `062`, `108`, `204` | RLS habilitada; autoridade de role/tenant protegida por trigger posterior, mas leitura demanda revisão crítica |
| `tenant_members` | migrations `001`, `040`, `204` | vínculo persistido e provisionamento `service_role` exclusivo |
| `business_members` | migration `007` e helpers de autoridade | vínculo empresarial separado do perfil global |
| `business_favorites` | migrations `003`, `187` | RPCs autenticadas usam `auth.uid()`; `p_host` e `search_path` precisam revisão |
| `business_connections` | migrations `168`–`184` | RLS e RPCs por usuário/empresa; últimas assinaturas devem ser confirmadas no remoto |
| `business_referrals` | migration `174` | tabela fechada ao cliente; parte das operações passa por RPC ou `service_role` |
| exclusão de conta | migration `038` | RPC autenticada existe, mas depende de `current_tenant_id()` |
| resolução pública | migrations `070`, `157` | existem resolvedores com semânticas diferentes: fallback versus domínio estrito |

## 4. Achados de segurança e decisões requeridas

### B01 — Minimização de colunas em perfis — bloqueador crítico

O export pós-homologação confirma `profiles` com RLS habilitada, sem a policy global `Allow authenticated read profiles`, mas ainda com grant de `SELECT` para `authenticated`. A view `user_profiles` não tem grant de `SELECT` para `anon`/`authenticated` no export recebido.

**Decisão:** considerar a contenção de linhas um avanço não suficiente para fechar o risco. Migrar consumidores para DTO/RPC/serviço allowlist antes de revogar `SELECT` de tabela ou conceder colunas específicas. Qualquer correção deve considerar todos os tenants e aplicações.

### B02 — Funções privilegiadas e superfície de execução — bloqueador alto

O catálogo remoto confirma 155 funções `SECURITY DEFINER`, muitas configuradas com `search_path = public`, e 101 grants de `EXECUTE` para `PUBLIC`. O metadata não contém os corpos das funções, portanto não comprova autorização interna, mas a superfície exige revisão priorizada.

**Gate:** nenhuma integração mobile será conectada enquanto funções sensíveis, especialmente as que tratam perfis, tenant, favoritos, conexões e exclusão de conta, não tiverem owner, grants, `search_path` e autorização interna revisados.

### B03 — Tenant baseado em host fornecido pelo cliente — bloqueador

Favoritos e conexões por slug recebem `p_host`. `_resolve_public_tenant_id`, na migration `070`, retorna um tenant de fallback quando o host não é verificado. No app nativo não existe um `Host` de página confiável; qualquer string enviada pelo app é controlável pelo cliente.

**Decisão aprovada para o planejamento:** operações autenticadas dependentes de host passam pelo BFF mobile. O BFF associa a rota/identidade do aplicativo ao tenant canônico da Conexão Maçônica por configuração server-side, confirma os vínculos persistidos, ignora `tenant_id` e `host` do payload e chama uma operação interna com escopo já validado. Isso exige uma emenda ao canal direto de favoritos/conexões previsto no P0-A antes da implementação.

Para conteúdo público, o app usa o mesmo contexto canônico configurado no servidor. White-label, descoberta e troca de tenant ficam fora do escopo do aplicativo.

### B04 — Claim `tenant_id` sem emissor comprovado — bloqueador

`current_tenant_id()` lê `(auth.jwt() ->> 'tenant_id')`, mas `supabase/config.toml` mantém o custom access token hook comentado e não foi encontrado outro emissor do claim. O provisionamento `204` atualiza `profiles` e `tenant_members`, não o JWT.

**Decisão recomendada:** autorização consulta vínculos persistidos por `auth.uid()`; não depende de claim customizado para decidir tenant. Se futuramente houver claim, ele será apenas otimização, emitido por hook versionado e confrontado com o banco nas operações sensíveis.

`request_account_deletion()` deverá ser revisada porque usa `current_tenant_id()` e pode falhar para membros sem esse claim.

### B05 — `SECURITY DEFINER` com `search_path = public` — alto

RPCs recentes de favoritos e conexões usam `SECURITY DEFINER SET search_path = public`. Embora várias referências estejam qualificadas, o padrão aprovado é `search_path = ''` com objetos totalmente qualificados. Cada função deverá ser revista, inclusive funções chamadas indiretamente, owner e grants.

### B06 — Sign-out e revogação — alto

O comentário de `signOut` no serviço web fala em tokens locais, mas `supabase.auth.signOut()` usa escopo global por padrão. O produto precisa oferecer semântica explícita:

- **Sair deste aparelho:** `scope: 'local'`, limpar cofre e cache privado;
- **Sair de todos os aparelhos:** `scope: 'global'`, ação confirmada;
- **Revogar outros aparelhos:** `scope: 'others'`, se exposto futuramente.

Refresh tokens são revogados conforme o escopo, mas um access token já emitido permanece utilizável até `exp`. Operações sensíveis no BFF devem chamar `auth.getUser(token)` e, quando a ameaça justificar revogação imediata, validar também `session_id` contra sessão ativa. O JWT expiry efetivo ainda precisa ser lido do projeto oficial.

### B07 — Callback web permite `next` não sanitizado — alto

`apps/web/src/app/auth/callback/route.ts` usa diretamente `next` em `new URL(next, request.url)`, enquanto o login já possui `sanitizeInternalRedirect`. Antes de compartilhar o fluxo de recovery/deep link, o callback web precisa entrar no backlog de hardening e receber teste de open redirect. Nenhuma correção é feita neste planejamento.

### B08 — Contrato de sessão expõe autoridade inadequada — médio

`packages/core/src/contracts/auth.contract.ts` inclui `tenantId` em `Session`. No mobile v1 esse valor, se mantido para apresentação/cache, deve chamar-se explicitamente `tenantHint` ou ser marcado não autoritativo. BFF, RPC e RLS nunca autorizam a partir dele.

## 5. Arquitetura de autenticação proposta

### 5.1 Cliente mobile

Um único cliente Supabase por processo, criado fora da árvore React, com:

```ts
auth: {
  flowType: 'pkce',
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: false,
  storage: secureSessionStorage
}
```

O storage implementa somente `getItem`, `setItem` e `removeItem` necessários ao Supabase Auth. A UI não lê tokens diretamente. Logs, analytics, crash reports, URLs e mensagens de erro nunca recebem code, verifier, access token ou refresh token.

Login por e-mail/senha cria sessão diretamente. PKCE é obrigatório para fluxos com redirecionamento: confirmação de cadastro, Magic Link, OAuth e recuperação de senha.

### 5.2 Estados da máquina de sessão

```text
BOOTING
  -> RESTORING
    -> AUTHENTICATED
    -> ANONYMOUS
    -> RECOVERY_REQUIRED
    -> STORAGE_ERROR

AUTHENTICATED
  -> REFRESHING -> AUTHENTICATED
  -> EXPIRED -> ANONYMOUS
  -> REVOKED -> ANONYMOUS
  -> SIGNING_OUT -> ANONYMOUS
```

Somente um restore/refresh ocorre por vez. Escritas privadas aguardam restauração; não usam sessão antiga durante rotação. Falha transitória de rede preserva o estado offline com validade conhecida, mas token expirado não autoriza escrita.

### 5.3 Inicialização, pausa e retomada

1. registrar uma vez `onAuthStateChange`;
2. abrir o cofre e restaurar a sessão;
3. usar `setSession`/estado interno da biblioteca para validar ou renovar se necessário;
4. ao entrar em foreground, executar `startAutoRefresh()` e revalidar antes de operações privadas;
5. ao ir para background, executar `stopAutoRefresh()`;
6. tratar `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED` e `PASSWORD_RECOVERY` sem reentrância;
7. limpar cache por `user_id + tenant` em logout/troca de conta.

O listener de lifecycle deverá usar `@capacitor/app`, hoje ausente. A dependência só poderá ser adicionada após o gate.

## 6. PKCE, deep links e recuperação

### 6.1 URLs propostas

- primária: `https://www.conexaomaconica.com.br/auth/mobile/callback`;
- recuperação: `https://www.conexaomaconica.com.br/auth/mobile/recovery`;
- fallback controlado: `com.conexaomaconica.app://auth/callback`.

Universal Links/App Links são preferidos porque vinculam o app a um domínio HTTPS verificado. O custom scheme não deve ser a rota principal, pois outro app pode tentar registrá-lo.

### 6.2 Recepção

- cold start: `App.getLaunchUrl()`;
- app em execução: listener `appUrlOpen`;
- allowlist exata de scheme, host e path;
- rejeitar userinfo, host parecido, porta inesperada, path desconhecido, fragmento/token e parâmetros duplicados;
- trocar `code` uma única vez por `exchangeCodeForSession(code)` no mesmo aparelho que iniciou o PKCE;
- serializar callbacks para impedir duplo exchange;
- remover dados sensíveis da navegação após a troca;
- se o app não estiver instalado, a rota HTTPS mostra fallback web seguro.

### 6.3 Arquivos de associação

- iOS: `apple-app-site-association`, Associated Domains e Team ID reais;
- Android: `.well-known/assetlinks.json`, package `com.conexaomaconica.app` e fingerprints separados para debug, internal testing e produção;
- Supabase Auth: allowlist somente com URLs exatas necessárias;
- validação obrigatória em aparelho físico, e-mail real e build assinado.

## 7. Armazenamento seguro — alternativas

| Opção | Compatibilidade atual | Segurança/comportamento | Custo/manutenção | Veredito |
| --- | --- | --- | --- | --- |
| `@aparajita/capacitor-secure-storage@7.1.6` | linha 7 compatível com Capacitor 7 | Keychain no iOS; AES-GCM com chave no Android Keystore; Keychain pode sobreviver à reinstalação; web usa storage inseguro | MIT, projeto ativo; exige pin e spike nativo | **candidato OSS recomendado** |
| `capacitor-secure-storage-plugin@0.12.0` | declara suporte a Capacitor 7 | Keychain wrapper/Keystore; iOS também pode sobreviver à reinstalação | OSS e API simples; implementação mais antiga | alternativa OSS, segunda escolha |
| Ionic Identity Vault 6 | suporta Capacitor 7+ | controles fortes, opções ligadas a passcode/biometria e storage de tokens | licença/assinatura Enterprise | recomendado se suporte comercial/compliance justificar custo |
| Capawesome Secure Preferences | versão ativa atual requer Capacitor 8 | Keychain/Keystore, erros detalhados e política de reinstalação documentada | produto pago/Insiders | não compatível com a base Capacitor 7 sem upgrade separado |
| `@capacitor/preferences` | já instalado | UserDefaults/SharedPreferences, não é cofre criptográfico | oficial e estável | somente preferências não sensíveis |

Recomendação provisória: spike em dispositivo com `@aparajita/capacitor-secure-storage@7.1.6`, pin exato e adapter próprio. A decisão final exige verificar licença, releases, dependências nativas, supply chain, backup Android, acessibilidade Keychain, corrupção/invalidade da chave e comportamento após reinstalação.

Política proposta para reinstalação: detectar primeira execução por marcador não sensível em Preferences e limpar o Keychain legado antes de restaurar Auth. Isso evita que uma reinstalação reabra silenciosamente a sessão anterior no iOS. A decisão deve ser homologada em aparelho real.

## 8. Fronteiras de confiança e BFF

### 8.1 Requisição autenticada

```text
Mobile
  -> Authorization: Bearer <access_token>
  -> BFF /api/mobile/v1/*
      -> valida assinatura/expiração e usuário com Supabase Auth
      -> deriva user_id do token
      -> associa o aplicativo ao tenant canônico em configuração server-side
      -> consulta tenant_members/business_members/profiles
      -> executa query/RPC com escopo explícito
      -> retorna DTO mobile/v1 allowlist
```

O BFF ignora `tenant_id`, `user_id`, role, entitlement e host do payload para autorização. Slugs e IDs recebidos são somente seletores e sempre precisam ser relacionados ao tenant canônico e aos vínculos autorizados.

### 8.2 Uso de clientes Supabase

- cliente com JWT do usuário: preferido quando a RLS é parte da autorização;
- `service_role`: somente servidor, depois de autenticação/autorização explícitas, em operações que realmente exigem privilégio;
- ao usar `service_role`, toda restrição normalmente garantida por RLS deve ser reconstruída no serviço e testada;
- endpoints BFF aplicam CORS restrito quando relevante, rate limit, tamanho máximo, content type e `request_id` sem dados pessoais.

### 8.3 Papéis e vínculos

| Identidade | Fonte autorizativa | Acesso mobile planejado |
| --- | --- | --- |
| visitante | ausência de JWT + contexto canônico da aplicação | diretório, Home, benefícios e Mural publicados |
| membro | `auth.uid()` + `profiles` para dados pessoais + vínculo ativo com o tenant canônico | conta, favoritos, indicações e conexões próprias |
| anunciante | `business_members`/propriedade validada no tenant canônico | somente recursos de relacionamento futuramente aprovados; comercial segue web |
| admin/master | helpers, escopo administrativo e vínculos persistidos no servidor | nenhum portal administrativo mobile no P0-B; `master` não ignora o escopo oficial |

Múltiplos vínculos empresariais devem produzir apenas a lista de empresas autorizadas dentro da Conexão Maçônica, nunca uma lista de tenants. Usuários de outros tenants podem autenticar no Supabase compartilhado, mas não recebem recursos privados da Conexão Maçônica. A seleção visual de uma empresa não concede acesso; cada chamada revalida o vínculo e o escopo do recurso no servidor.

## 9. Matriz de auditoria RLS/grants/RPC

| Superfície | Positivo obrigatório | Negativo obrigatório | Evidência ainda necessária |
| --- | --- | --- | --- |
| `profiles` e `user_profiles` | próprio perfil; admin autorizado no mesmo tenant | anon, membro B e tenant B não enumeram perfil A | catálogo remoto, definição/view options e grants efetivos |
| `tenant_members` | usuário vê vínculos permitidos | usuário fora do tenant não enumera membros | policies/grants remotos |
| `business_members` | membro empresarial ativo vê vínculo próprio | negócio/tenant cruzado negado | última policy efetiva |
| favoritos | usuário cria/lê/remove os próprios no tenant derivado | `user_id`, host e slug forjados; recurso despublicado | reexecução com host inválido e dois tenants |
| conexões | membro registra e lista as próprias | outro membro/tenant; foto sem owner; empresa despublicada | assinaturas RPC finais e Storage policies |
| indicações | visita válida/antiabuso; membro vincula chave própria | enumeração, replay, autoindicação, chave curta/forjada | grants efetivos e rate limit do BFF |
| exclusão | titular solicita a própria | usuário ausente, tenant ausente, obrigação financeira | funcionamento sem claim customizado |
| funções `SECURITY DEFINER` | resultado mínimo esperado | chamada por papel sem grant; search-path hijack | owner, ACL, `proconfig`, dependências transitivas |
| Storage | upload no prefixo próprio permitido | MIME/tamanho/path/tenant cruzado negados | buckets e policies remotos |

## 10. Plano de testes

### 10.1 Sessão e PKCE

- login válido/inválido e usuário não confirmado;
- PKCE iniciado e concluído no mesmo aparelho;
- callback sem verifier, code expirado, code reutilizado e dois fluxos concorrentes;
- cold start e callback com app já aberto;
- recovery, atualização de senha e encerramento explícito da sessão;
- restore após kill, reboot e atualização do app;
- cofre ausente, corrompido, bloqueado e chave invalidada;
- refresh concorrente, offline durante refresh e retorno ao foreground;
- relógio do aparelho adiantado/atrasado;
- logout local, global e de outros aparelhos;
- comprovar janela em que JWT emitido permanece válido após revogação.

### 10.2 Deep links

- Universal Link e App Link em builds assinados;
- app instalado e não instalado;
- host/path válidos e todas as variações maliciosas rejeitadas;
- custom scheme capturado por aplicativo adversário no teste de ameaça;
- debug, internal testing/TestFlight e produção com fingerprints/Team ID corretos.

### 10.3 Autorização e isolamento do tenant fixo

Fixtures mínimas: tenant canônico da Conexão Maçônica, tenant adversarial B, membro A, membro B, usuário sem vínculo, anunciante A com duas empresas, admin A e recurso despublicado. O tenant B existe apenas para testes negativos e nunca como opção da interface.

Para cada endpoint/RPC: happy path, sessão ausente, expirada e revogada; tentativa de injetar ou trocar `tenant_id`, `user_id`, role, host, slug e UUID; enumeração; referência cruzada; vínculo inativo; usuário com múltiplos vínculos empresariais; downgrade de papel durante sessão ativa.

### 10.4 Regressão

- testes pgTAP/RLS locais em transação;
- contract tests produtor/consumidor `mobile/v1`;
- `pnpm --filter web typecheck`;
- `pnpm --filter web exec vitest run`;
- `pnpm --filter @saas/mobile typecheck`;
- `pnpm --filter @saas/mobile test`;
- nenhuma suíte aponta para produção sem confirmação explícita de Project Ref/URL.

## 11. Sequência executiva proposta

| Incremento | Entrega | Dependência | Rollback |
| --- | --- | --- | --- |
| P0-B.0 | snapshot read-only do Supabase oficial e matriz de divergências | confirmação explícita do ambiente | nenhum estado alterado |
| P0-B.1 | ADRs do tenant fixo, revogação, deep links e secure storage | B01–B04 esclarecidos | reverter decisões documentais |
| P0-B.2 | hardening aprovado de exposições preexistentes + testes RLS | migrations revisadas e backup/rollback | migration reversa específica, nunca reset global |
| P0-B.3 | contratos `mobile/v1` e BFF de identidade/contexto | matriz RLS aprovada | desabilitar rotas versionadas por flag |
| P0-B.4 | spike isolado do cofre em Android/iOS | plugin aprovado | remover adapter/plugin sem migrar usuários reais |
| P0-B.5 | cliente Auth mobile, restore e lifecycle | cofre homologado | feature flag mantém login mobile indisponível |
| P0-B.6 | Universal/App Links e recovery | domínios, Team ID e fingerprints | remover associação/redirect novo mantendo web |
| P0-B.7 | favoritos/conexões via BFF com tenant derivado | contratos e testes cruzados | desativar endpoints mobile; web intacta |
| P0-B.8 | homologação fechada em dispositivos | todos os gates anteriores | revogar builds/tokens de teste e retornar à versão anterior |

Cada incremento requer revisão própria. Nenhum incremento inclui pagamentos, contratos, planos ou renovações no mobile.

## 12. Critérios de aceite verificáveis

P0-B poderá ser considerado **planejado e pronto para pedido de implementação** quando:

- o estado remoto estiver inventariado sem divergência não explicada;
- o resultado de segurança global do banco compartilhado estiver aprovado;
- o resultado de segurança específica da Conexão Maçônica estiver aprovado, incluindo vínculo canônico, status da conta e escopo de `member`, `admin` e `master`;
- B02, B03 e B04 tiverem decisão aprovada e teste desenhado;
- o P0-A tiver a emenda de canal BFF para operações autenticadas dependentes de host;
- plugin e versão do cofre tiverem ADR aprovado;
- URLs, domínios, Team ID e fingerprints necessários estiverem identificados;
- logout local/global e garantia real de revogação estiverem definidos;
- matriz de isolamento cobrir o tenant canônico e um tenant adversarial em todas as superfícies em escopo;
- rollback e feature flags estiverem definidos por incremento;
- nenhuma credencial ou chave privilegiada fizer parte do bundle;
- responsáveis aprovarem formalmente o gate seguinte.

## 13. Gate de autorização para implementação

O gate de auditoria de segurança é anterior e obrigatório ao gate de implementação. Ele deve comparar, em modo somente leitura: (1) código e migrations locais; (2) estado efetivo de RLS, grants, views e funções no Supabase oficial confirmado; e (3) matriz de acesso prevista neste plano. Divergências devem ser documentadas, sem correção automática.

Antes de qualquer alteração, registrar aprovação explícita para:

- Project Ref/URL e ambiente em que cada comando será executado;
- SQL/migration exata, se necessária, com rollback revisado;
- pacote, versão fixa e licença do secure storage;
- mudanças na allowlist do Supabase Auth;
- associação de domínio iOS/Android;
- endpoints BFF e regras de rate limit;
- plano de teste que não escreva no banco oficial sem autorização adicional.

Até esse gate, permanecem proibidos: `pnpm add`, `cap sync`, edição nativa, migration, policy/grant, dashboard Auth, secrets, deploy, commit e smoke test remoto.

## 14. Validações obrigatórias em dispositivo real

- Keychain após kill, reboot, upgrade e reinstalação;
- Keystore após reboot, backup/restore, troca de bloqueio e key invalidation;
- Universal Links/App Links com builds assinados;
- recovery vindo de clientes de e-mail reais;
- refresh em background/foreground e rede instável;
- revogação iniciada por outro dispositivo;
- biometria/passcode, caso Identity Vault seja escolhido;
- limpeza de cache e ausência de tokens em logs, WebView inspector e backups.

## 15. Fontes externas primárias consultadas

- Supabase, PKCE: <https://supabase.com/docs/guides/auth/sessions/pkce-flow>
- Supabase, sessões e refresh: <https://supabase.com/docs/guides/auth/sessions>
- Supabase, sign-out e escopos: <https://supabase.com/docs/guides/auth/signout>
- Supabase, referência JavaScript de sign-out: <https://supabase.com/docs/reference/javascript/auth-signout>
- Supabase, deep links nativos: <https://supabase.com/docs/guides/auth/native-mobile-deep-linking>
- Capacitor, Universal/App Links: <https://capacitorjs.com/docs/guides/deep-links>
- Capacitor Preferences: <https://github.com/ionic-team/capacitor-plugins/blob/main/preferences/README.md>
- Ionic Identity Vault: <https://ionic.io/docs/identity-vault/cryptography>
- `@aparajita/capacitor-secure-storage`: <https://github.com/aparajita/capacitor-secure-storage>
- `capacitor-secure-storage-plugin`: <https://github.com/martinkasa/capacitor-secure-storage-plugin>
- Capawesome Secure Preferences: <https://capawesome.io/docs/sdks/capacitor/secure-preferences/>

## 16. Parecer

O P0-B está **em revisão técnica**. O desenho single-tenant está definido, mas a implementação não deve ser autorizada até a conclusão do gate de auditoria de segurança, a comprovação do banco efetivo e a resolução formal de B02–B04. Este relatório deve ser aprovado antes de qualquer mudança.
