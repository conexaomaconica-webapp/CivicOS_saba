# P0-A — Fundação da Arquitetura Compartilhada Web + Mobile

> **Status:** aprovado em 14/10/2026 como referência para o planejamento executivo do P0-B; nenhuma integração funcional ou validação de segurança é considerada entregue por este documento.  
> **Escopo:** Web Next.js, aplicativo React + Vite + Capacitor e Supabase compartilhado.  
> **Documentos relacionados:** `MOBILE_ROADMAP.md` e `MOBILE_ARCHITECTURE_AUDIT.md`.

## 1. Objetivo e limites

Este documento define contratos, fronteiras e critérios de segurança que devem existir antes da integração funcional do aplicativo. A arquitetura aprovada mantém:

- `apps/web`: Next.js, administração, experiência web e API/BFF;
- `apps/mobile`: React + Vite + Capacitor para Android e iOS;
- Supabase oficial: Postgres, Auth, Storage, RPCs e RLS como fonte canônica;
- pacotes do monorepo: código puro compartilhável, sem acoplar o mobile ao runtime do Next.js.

O P0-A não autoriza migrations, mudanças de RLS, instalação de plugins nativos nem implementação das funcionalidades. Também não comprova a segurança em produção: isso depende da auditoria e dos testes do P0-B.

Planos, contratos, cobranças, pagamentos e renovações permanecem exclusivamente na web. Reconhecimentos institucionais — Pedra Fundamental, Fundadora e Coluna de Honra — continuam separados dos planos e entitlements comerciais.

## 2. Decisões arquiteturais

1. Não migrar o aplicativo para Next.js, React Native ou Flutter.
2. Não reutilizar Server Components ou Server Actions diretamente no mobile.
3. Usar uma arquitetura híbrida: acesso direto ao Supabase somente quando o contrato e a RLS forem suficientes; API/BFF para composição, autorização adicional, operações privilegiadas ou regras transacionais.
4. Nunca confiar em `tenant_id`, papel, proprietário ou entitlement enviados pelo cliente. O servidor/RPC deriva o contexto da identidade validada da aplicação, do JWT e dos vínculos persistidos.
5. Nunca incluir `SUPABASE_SERVICE_ROLE_KEY` no bundle mobile ou web client.
6. Manter contratos aditivos e retrocompatíveis para versões antigas do aplicativo.

### Decisão complementar aprovada — banco multi-tenant, aplicativo single-tenant

O Supabase permanece compartilhado e multi-tenant. Android e iOS operam exclusivamente no tenant canônico da Conexão Maçônica, sem descoberta, seleção ou alternância de tenant na interface. O aplicativo reutiliza a identidade centralizada do Supabase Auth e os registros existentes em `public.profiles`; não haverá tabela de usuários mobile paralela.

O backend associa o aplicativo ao tenant por configuração server-side e valida o vínculo efetivo do usuário, o status da conta e seus privilégios. `tenant_id`, host, header ou claim recebido do cliente não constitui autoridade. `master` não concede acesso irrestrito automaticamente: o escopo administrativo oficial deve ser respeitado. Empresas e vínculos empresariais são recursos internos do tenant da Conexão Maçônica, não tenants alternativos. Um segundo tenant será usado somente em testes negativos de isolamento.

Qualquer alteração global em `profiles`, Auth, RLS, grants ou triggers exige análise de impacto sobre todos os tenants e aplicações que compartilham o projeto.
7. Conteúdo real não pode ser substituído silenciosamente por mocks em produção. A interface deve distinguir carregamento, vazio, erro e offline.

## 3. Monorepo e dependências permitidas

### 3.1 Responsabilidades

| Local | Responsabilidade | Pode depender de |
| --- | --- | --- |
| `apps/web` | UI web, RSC, Server Actions, Route Handlers e administração | pacotes compartilhados, `next/*`, cliente Supabase SSR |
| `apps/mobile` | UI e navegação mobile, ciclo de vida Capacitor e adaptadores nativos | pacotes compartilhados e APIs públicas dos plugins Capacitor |
| `packages/shared` | DTOs, schemas, normalizadores, erros e utilitários puros | TypeScript e bibliotecas isomórficas aprovadas |
| `packages/ui` | tokens e componentes React realmente isomórficos | React; sem `next/*`, cookies ou APIs de Node |
| `packages/core` | contratos e regras de domínio independentes de transporte | `packages/shared` e validação isomórfica |
| `packages/infrastructure` | integrações de infraestrutura e implementação de portas | não deve ser importado pelo bundle mobile sem revisão explícita |
| `packages/sdk` | hoje é SDK de plugins; eventual cliente de dados deve ter nome/exports inequívocos | contratos compartilhados, nunca segredos de servidor |

### 3.2 Regras de importação

- `apps/mobile` não importa arquivos de `apps/web`.
- Pacotes compartilhados não importam `next/headers`, `next/cache`, `next/image`, `next/link`, `cookies()`, módulos `node:*` ou chaves privadas.
- Tipos gerados do banco continuam canônicos, mas DTO público não é igual a uma linha de tabela. A camada de transporte expõe apenas os campos necessários.
- Componentes só migram para `packages/ui` depois de comprovado o uso real nos dois canais.
- Regras de negócio puras e schemas são extraídos antes de componentes visuais.

## 4. Contratos e versionamento

### 4.1 Formato

Cada operação exposta ao mobile deve possuir:

- schema de entrada e saída validável em runtime;
- DTO sem campos administrativos ou sensíveis;
- erro estável com `code`, mensagem amigável e `request_id` quando houver BFF;
- indicação de autenticação, autorização, cache e versão mínima suportada;
- teste de contrato executado contra produtor e consumidor.

Exemplo de envelope da API/BFF:

```ts
type ApiEnvelope<T> =
  | { ok: true; data: T; contract_version: 1 }
  | { ok: false; error: { code: string; message: string; request_id?: string }; contract_version: 1 };
```

### 4.2 Política de compatibilidade

- A versão major fica na rota BFF (`/api/mobile/v1/...`) ou no nome de um novo RPC quando houver quebra real.
- Dentro de `v1`, mudanças são aditivas: novos campos são opcionais para consumidores antigos.
- Não renomear, remover, mudar significado ou estreitar valores já publicados em uma versão ativa.
- O mobile ignora campos desconhecidos e aplica defaults explícitos para campos ausentes.
- O backend mantém, no mínimo, a versão publicada atualmente nas lojas e a versão imediatamente anterior, até existir política operacional baseada em adoção.
- Quebras exigem nova versão, janela de depreciação, telemetria de adoção e plano de rollback.

## 5. Matriz de acesso Web + Mobile

Esta matriz fixa o canal e os requisitos-alvo. “RLS obrigatória” significa que a policy/grant ainda precisa ser comprovada no P0-B; não afirma que a implementação atual já foi auditada.

| Domínio/operação | Canal definido | Autenticação | Autorização derivada | RLS/controle obrigatório |
| --- | --- | --- | --- | --- |
| Configuração pública da Home | `GET /api/mobile/v1/home` no BFF | anônima permitida | tenant canônico configurado no servidor | BFF seleciona apenas configuração publicada; acesso subjacente auditado |
| Empresas, categorias e busca públicas | BFF mobile; acesso direto somente após RPC sem autoridade derivada de host ser auditada | anônima permitida | tenant canônico configurado no servidor | grants mínimos para `anon`; RLS/função impede conteúdo despublicado e outro tenant |
| Página pública da empresa | `GET /api/mobile/v1/businesses/{slug}` no BFF | anônima permitida | tenant canônico + `businesses.slug`; publicação validada no servidor | BFF expõe DTO allowlist e somente relações públicas |
| Benefícios publicados | `GET /api/mobile/v1/businesses/{slug}/benefits` no BFF | anônima permitida | tenant, empresa publicada e elegibilidade derivados no servidor | consulta subjacente com RLS/grants auditados; somente benefício ativo/publicado |
| Login, refresh e logout | Supabase Auth com PKCE | credencial/IdP conforme fluxo | identidade emitida pelo GoTrue; cliente não define usuário ou papel | não se aplica a tabela; configuração Auth e redirects auditados |
| Favoritos do membro | BFF mobile até existir operação auditada sem autoridade derivada de host | Bearer JWT válido | usuário por `auth.uid()`; tenant canônico configurado no servidor | RPCs e `business_favorites` com grants/RLS que restrinjam ao próprio usuário |
| Criar/atribuir indicação | `POST /api/mobile/v1/referrals` no BFF | anônima na atribuição inicial; JWT quando vincular ao membro | visitante pseudonimizado, usuário do JWT e empresa/tenant resolvidos no servidor | BFF aplica antiabuso; tabela/RPC sem escrita direta irrestrita |
| Consultar indicações do membro | `GET /api/mobile/v1/me/referrals` no BFF | Bearer JWT válido | usuário por JWT; tenant por vínculo persistido | DTO restrito ao próprio membro; consultas subjacentes auditadas |
| Registrar conexão | BFF mobile até existir operação auditada sem autoridade derivada de host | Bearer JWT válido | usuário por `auth.uid()`; tenant canônico no servidor e empresa resolvida pelo slug | função e `business_connections` impedem identidade/tenant forjados |
| Mural público | BFF mobile sobre o contrato público empresarial | anônima permitida | tenant canônico no servidor; somente registros confirmados, consentidos e moderados | grants mínimos; função não revela dados privados nem registros de outro tenant |
| Conexões do membro | BFF mobile sobre as operações autenticadas existentes | Bearer JWT válido | usuário por `auth.uid()` e empresa por vínculo validado quando aplicável | tabela/funções restringem membro, anunciante e tenant conforme a operação |
| Upload de foto do Mural/perfil | BFF autoriza o caminho; upload no Storage com token do usuário | Bearer JWT válido | proprietário, tenant, finalidade e caminho derivados no servidor | policies de Storage limitam bucket, prefixo, MIME, tamanho e proprietário |
| Exclusão de conta | RPC `request_account_deletion` | Bearer JWT válido e confirmação na UI | usuário exclusivamente por `auth.uid()` | execute somente para `authenticated`; trilha e retenção conforme LGPD |
| Analytics | `POST /api/mobile/v1/analytics/events` no BFF | anônima ou autenticada conforme evento | tenant/recurso resolvidos no servidor; sujeito pseudonimizado | sem insert direto do cliente; allowlist de eventos/campos, rate limit e sem IP público |
| Administração, planos e pagamentos | nenhum canal mobile | não permitido | somente fluxos web/servidor autorizados | sem grants ou rotas mobile; nunca incluídos no bundle do app |

Nenhuma consulta mobile deve depender de `service_role`. Caso um endpoint BFF use privilégios elevados, ele precisa primeiro autenticar, autorizar e derivar o escopo no servidor, além de selecionar explicitamente as colunas retornadas.

## 6. Isolamento de tenants e autorização

### 6.1 Regras obrigatórias

- O cliente pode fornecer host, slug ou identificador como dado de busca, nunca como prova de autorização.
- Operações autenticadas derivam o usuário de `auth.uid()`/JWT validado.
- O tenant operacional do mobile é o tenant canônico configurado no servidor; vínculos persistidos determinam permissões dentro dele. Cabeçalhos, cookies, hosts, claims e payloads arbitrários não o substituem.
- Vínculos compostos devem preservar `tenant_id` nas chaves e filtros quando o schema assim exigir.
- RLS deve estar habilitada em todas as tabelas alcançáveis pelo cliente.
- Funções `SECURITY DEFINER`, se usadas, devem ter `search_path` seguro, validação interna de tenant/papel e grants mínimos.
- O BFF não deve simplesmente repassar `tenant_id`, `user_id`, `business_id` ou papel recebidos sem reconstruir e validar o contexto.

### 6.2 Auditoria obrigatória do P0-B

Para cada tabela, view, Storage bucket e RPC da matriz:

1. registrar grants para `anon`, `authenticated` e papéis de servidor;
2. verificar RLS e todas as policies por comando;
3. verificar `SECURITY INVOKER/DEFINER`, `search_path` e autorização interna;
4. testar acesso permitido no tenant A;
5. testar leitura, escrita, enumeração e referência cruzada contra tenant B;
6. testar usuário sem vínculo, sessão expirada e recurso despublicado;
7. registrar evidências na matriz RLS do projeto.

## 7. Sessão mobile

### 7.1 Fluxo

1. O app inicia PKCE e registra o `code_verifier` temporariamente.
2. O navegador do sistema realiza autenticação; o retorno acontece por Universal Link/App Link preferencialmente e custom scheme apenas como fallback controlado.
3. O app valida o callback esperado e troca o código por sessão.
4. Access e refresh tokens são persistidos por um adaptador de armazenamento seguro.
5. Na inicialização, o app restaura a sessão, valida a expiração e renova quando necessário.
6. Ao retornar do background, revalida a sessão e atualiza dados sensíveis.
7. Logout remove tokens locais, cache privado e inscrições associadas ao usuário.
8. Refresh inválido, revogado ou reutilizado encerra a sessão de modo seguro e solicita novo login.

### 7.2 Armazenamento

- iOS: Keychain.
- Android: Keystore por meio de plugin que cifre e proteja o segredo em repouso.
- `@capacitor/preferences`, `localStorage`, IndexedDB sem proteção ou arquivo simples não são armazenamento aceitável para refresh token.
- A escolha do plugin exige revisão de manutenção, licença, suporte às versões alvo, política de backup/restauração e comportamento após reinstalação.
- O adapter deve permitir testes sem acoplar o domínio ao plugin nativo.

O P0-B deve cobrir login, reinício do processo, retorno do background, rotação de refresh token, expiração, revogação, logout, troca de usuário e perda/corrupção do cofre.

## 8. Evolução retrocompatível da Home

`directory_home_settings.sections_config` continua sendo a fonte editorial. A Home web atual não será reestruturada no P0-A. Novos campos serão opcionais e interpretados com fallback.

```json
{
  "id": "connections_mural",
  "enabled": true,
  "title": "Mural de Conexões",
  "order": 5,
  "web_order": 5,
  "mobile_order": 2,
  "web_limit": 8,
  "mobile_limit": 4
}
```

Regras de leitura:

- `enabled` é o fallback global; futuras chaves `web_enabled`/`mobile_enabled`, se aprovadas, são opcionais.
- Web usa `web_order ?? order ?? defaultOrder`.
- Mobile usa `mobile_order ?? order ?? defaultOrder`.
- Limites ausentes usam defaults seguros definidos no contrato, não no conteúdo simulado.
- IDs canônicos existentes, como `connections_mural`, não são renomeados.
- Entradas desconhecidas são ignoradas por apps antigos; seções obrigatórias ausentes recebem fallback local versionado.
- Conteúdo editorial é global; propriedades de ordem, limite e apresentação podem variar por plataforma.

Antes de alterar o JSON persistido, o P0-B deverá adicionar testes de regressão da normalização atual da web e definir o schema compartilhado. Nenhuma duplicação integral `web_config`/`mobile_config` deve ser criada sem nova decisão arquitetural.

## 9. Cache, atualização e estados da interface

- Conteúdo público usa TTL e revalidação documentados por recurso.
- O app atualiza conteúdo no cold start, no retorno ao foreground quando estiver obsoleto e por ação explícita do usuário.
- Realtime fica restrito a casos que exijam atualização imediata; diretório e busca usam requisições normais.
- Cache privado é particionado por usuário dentro do tenant canônico e apagado no logout.
- Conteúdo offline deve mostrar a data da última sincronização.
- Erro de rede não autoriza substituir dados reais por fixtures.
- Alterações de conteúdo e mídia podem aparecer sem nova publicação nas lojas; componentes ou campos obrigatórios desconhecidos exigem atualização do aplicativo ou fallback compatível.

## 10. Testes e homologação do P0-B

### 10.1 Contratos

- validação runtime de todos os DTOs;
- fixtures compatíveis com a versão atual e a versão anterior do app;
- campos adicionais ignorados pelo consumidor antigo;
- campos opcionais ausentes resolvidos por fallback;
- erro padronizado e sem vazamento de detalhes internos.

### 10.2 Segurança

- matriz positiva e negativa de RLS por tabela/RPC;
- acesso cruzado entre dois tenants reais de teste;
- tentativa de forjar `tenant_id`, `user_id`, papel, `business_id` e host;
- grants mínimos para `anon` e `authenticated`;
- nenhuma chave privilegiada em bundles, sourcemaps ou logs;
- uploads limitados por proprietário, caminho, MIME e tamanho.

### 10.3 Sessão

- PKCE e callback válido/inválido;
- restauração após encerramento e reboot;
- refresh e rotação concorrente;
- logout, revogação e sessão expirada;
- limpeza de cache ao trocar de usuário.

### 10.4 Regressão

- `pnpm --filter web typecheck`;
- `pnpm --filter web exec vitest run`;
- `pnpm --filter @saas/mobile typecheck`;
- `pnpm --filter @saas/mobile test`;
- testes de normalização de `sections_config` na web e no mobile;
- smoke tests em Android e iOS somente após confirmar o projeto Supabase oficial e os ambientes usados.

## 11. Gates de aprovação

### P0-A aprovado quando

- este documento for revisado e aceito como referência;
- cada operação mobile tiver canal e fronteira definidos;
- política de contratos e compatibilidade estiver aceita;
- fluxo de sessão e requisito de armazenamento seguro estiverem aceitos;
- evolução retrocompatível da Home estiver definida;
- escopo da auditoria e critérios do P0-B estiverem registrados.

### Entrada no planejamento executivo do P0-B

O planejamento do P0-B pode começar depois da aprovação documental do P0-A. Antes de instalar dependências, alterar autenticação ou criar endpoints, o plano executivo deve fechar e registrar:

- Project Ref e URL do Supabase oficial por ambiente, sem executar smoke test destrutivo;
- inventário final de tabelas, views, funções, grants, policies e buckets alcançados pela matriz;
- ADR de armazenamento seguro, com plugin Keychain/Keystore escolhido e critérios de backup, reinstalação e revogação;
- domínios, Universal Links/App Links, custom scheme de fallback e allowlist exata de redirects do PKCE;
- DTOs e schemas `v1` em `@saas/core/contracts/mobile/v1`; clientes de transporte permanecem em cada app;
- ameaça-modelo mínima para falsificação de tenant, replay/roubo de sessão, abuso de endpoints anônimos e upload malicioso;
- plano de testes negativos entre tenant A, tenant B, usuário sem vínculo e sessão expirada;
- rollback para qualquer mudança posterior de Auth, API, RPC ou policy.

Sem esses itens aprovados, o P0-B permanece em planejamento e não autoriza mutações no código de autenticação, dependências, banco ou configuração do Supabase.

### P0-B aprovado quando

- os contratos forem implementados e testados;
- o plugin de armazenamento seguro for escolhido, revisado e homologado;
- tabelas, RPCs, funções e buckets em escopo tiverem auditoria RLS com evidências;
- testes cruzados entre tenants passarem;
- regressão web e testes mobile passarem;
- o Project Ref/URL do Supabase usado na homologação estiver explicitamente confirmado;
- não houver mocks silenciosos em builds de produção.

## 12. Pendências deliberadas para o P0-B

- validar por evidência cada canal fixado na matriz e propor ADR apenas se uma auditoria exigir mudança;
- avaliar candidatos e aprovar o plugin Keychain/Keystore antes da instalação;
- validar os Universal Links/App Links, domínios de callback e allowlist antes de alterar o Auth;
- definir TTLs e política operacional de versões mínimas;
- criar os DTOs em `@saas/core/contracts/mobile/v1`, sem reutilizar o atual `@saas/sdk` de plugins como cliente de dados;
- validar se `analytics_events` atende integralmente ao contrato mobile canônico;
- auditar policies, grants e funções existentes — a presença de RLS habilitada não comprova isolamento correto.

## 13. Evidências atuais do repositório

- `apps/mobile/package.json`: React 19, Vite e Capacitor, sem cliente Supabase neste momento.
- `apps/mobile/src/home-sections.ts`: configuração local com indicação de futura prioridade do servidor.
- `apps/mobile/src/App.tsx`: seções e estados ainda preparados com conteúdo local da fundação mobile.
- `apps/web/src/app/actions/directory-home-settings.ts`: grava `directory_home_settings` e invalida a Home web.
- `apps/web/src/lib/directory/home-sections.ts`: normalização atual da ordem e visibilidade da Home web.
- `supabase/migrations/055_directory_home_and_contracts.sql`: tabela e contrato público inicial da Home.
- `supabase/migrations/187_member_favorites.sql`: RPCs autenticados de favoritos.
- `supabase/migrations/168_business_connections_mural.sql` e evoluções posteriores: base de conexões e Mural.
- `supabase/migrations/174_member_referrals_tracking.sql`: base e RPCs de indicações.
- `supabase/migrations/038_lgpd_privacy_export_deletion.sql`: solicitação de exclusão de conta.

Estas evidências sustentam o planejamento, mas não substituem a auditoria de segurança exigida no P0-B.
