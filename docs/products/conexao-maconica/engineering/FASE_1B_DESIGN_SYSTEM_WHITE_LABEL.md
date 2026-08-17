# Fase 1B — Design System White Label do ecossistema

Status: **arquitetura implementada para revisão; páginas visuais e banco remoto não alterados**.

Este documento é normativo para a fundação visual da plataforma. O Conexão Maçônica é o primeiro preset real, mas apenas a qualidade, a estrutura e os componentes são compartilhados. Cores, conteúdo, símbolos e conceitos maçônicos pertencem ao produto.

## 1. Decisão arquitetural

| Camada | Autoridade | Pode conter | Não pode conter |
|---|---|---|---|
| White Label Core | `packages/core`, `packages/ui` e shell compartilhado | contratos, tokens semânticos, componentes, grid, estados, acessibilidade e responsividade | nomes, imagens, cores ou regras do Conexão Maçônica |
| Tenant Theme | configuração versionada e publicada do tenant | identidade, ativos públicos, paleta semântica, tipografia aprovada e aparência | CSS/JavaScript arbitrário, fonte remota livre ou dados privados de `tenants.settings` |
| Product Modules | catálogo do plugin + instalação + licença efetiva + refinamentos | diretório, lojas, Fundadora, Verificada, planos, eventos e campanhas | liberação premium baseada apenas em flag visual ou `businesses.plan_tier` |

É proibido ramificar componente compartilhado por slug, por exemplo `tenant.slug === "conexao-maconica"`. Variação de comportamento deve vir de catálogo de módulos, capabilities, entitlements ou feature flags tipadas.

## 2. Inventário do estado encontrado

| Área | Estado encontrado | Lacuna/ação |
|---|---|---|
| Persistência | `tenants.settings JSONB` já armazena `settings.branding` plano e não versionado | reutilizar a estrutura; migrar por adaptador e somente ampliar o schema quando houver publicação/auditoria |
| Seed atual | o seed ainda usa `#4A0E1A` como primária do Conexão Maçônica | alinhar de forma controlada ao preset v1 (`#7A1F2E`) na configuração de dados da Fase 1C/2, sem sobrescrever tenants existentes |
| Domínios | `tenant_domains` já representa domínio, verificação e SSL | deve ser a autoridade da resolução pública por host |
| Módulos | `tenant_plugins` e catálogo de plugins já existem | usar para instalação estrutural; não criar outra tabela de módulos |
| Capabilities | registry/licensing e `tenant_features` já existem | licença efetiva concede capacidade; `tenant_features` apenas refina um módulo já autorizado |
| SSR do tema | `tenant-brand.ts` injeta variáveis no layout inicial | usa o `Host` original no servidor e a RPC mínima; falha fechada para o tema neutro |
| SEO | `root-metadata.ts` consome o mesmo resolvedor cacheado do tema | tema e metadados compartilham uma única autoridade por requisição |
| Motor de tokens | `brand-tokens.ts` converte o formato legado e o contrato v1 em CSS vars | concluído: o legado altera somente a identidade disponível e não força superfícies quentes; `tenantThemeToCssVars` cobre o contrato completo |
| Tokens | `packages/ui/src/tokens/tokens.css` é a fonte canônica | concluído: vocabulário `--color-*`, tipografia, aparência, planos e confiança; nomes legados são aliases temporários |
| Tailwind/shadcn | Tailwind e `apps/web/src/styles/tokens.ts` apontam às mesmas variáveis | concluído para a fundação; consumidores legados podem migrar gradualmente sem criar outra paleta |
| Biblioteca UI | `packages/ui/src/components` usava cores `slate`, `blue`, `rose` e superfícies escuras | componentes básicos generalizados para tokens semânticos e protegidos por teste de arquitetura |
| UI duplicada | há componentes em `packages/ui` e `apps/web/src/components/ui` | escolher `packages/ui` como catálogo compartilhado e migrar consumidores gradualmente |
| Tenant Admin | `/admin/marca` já oferece edição e prévia | leitura reduzida a `id/name/slug/settings`, ativos limitados a HTTPS/same-origin e fontes aprovadas; escrita versionada, rascunho/publicação e auditoria continuam para a Fase 1C/5 |
| Branding público homologado localmente | migration 041 define `public_tenant_branding(p_host)` | domínio verificado e `font_token` aprovado estão contidos; saída ainda representa somente o formato legado mínimo |
| Ativo global | `apps/web/src/app/icon.svg` contém “C”, bordô e ouro | mover para o preset/asset do produto e servir favicon resolvido por tenant |

Arquivos principais auditados: `apps/web/src/lib/tenant/tenant-brand.ts`, `apps/web/src/lib/tenant/brand-tokens.ts`, `apps/web/src/lib/seo/root-metadata.ts`, `apps/web/src/middleware.ts`, `apps/web/src/app/admin/marca/page.tsx`, `apps/web/tailwind.config.ts`, `packages/ui/src/tokens/tokens.css`, `packages/ui/src/components`, `supabase/migrations/001_tenants.sql`, `005_platform_tenant_context.sql`, `034_tenant_branding_access.sql` e a proposta `041_public_read_contracts.sql`.

## 3. Hardcodes e componentes a generalizar

Concluído nesta fundação:

- `Button`, `Card`, `Dialog`, `Drawer`, `Input`, `Select`, `Tabs`, `Toast`, `EmptyState`, `Skeleton` e `Badge` em `packages/ui` passaram a usar tokens semânticos;
- `Header`, `AppShell` e `Sidebar` deixaram de usar cores literais de marca/estado;
- `brand-tokens.ts` não deriva mais marfim para todos os tenants e aceita somente fontes aprovadas;
- `admin/marca` não aceita fonte livre, URL HTTP ou leitura indiscriminada de colunas.

Pendente para as fases de shell/publicação:

- `icon.svg`, `public/logo.svg`, metadados e fallbacks globais ainda precisam sair do shell e ser resolvidos como ativos do produto/tenant;
- `admin/marca` ainda escreve o namespace legado em `settings`, sem rascunho, publicação atômica, histórico ou auditoria;
- componentes locais duplicados em `apps/web/src/components/ui` devem convergir gradualmente para `packages/ui`.

Ocorrências em laboratórios de design e valores primitivos usados para gerar escalas não são automaticamente defeitos. O problema é a cor literal em um componente compartilhado ou a imposição de uma paleta de produto a qualquer tenant.

## 4. Contrato tipado do tema

A implementação canônica está em `packages/core/src/contracts/tenant-theme.contract.ts` e usa Zod estrito.

```text
TenantThemeConfig v1
├── productName / productDescription
├── logos: primary / compact / inverse / favicon
├── institutionalImages: hero / login / emailHeader
├── colors / darkColors opcional: pares semânticos + estados
├── typography: tokens de fontes aprovadas
└── appearance: radius / shadow / colorMode / density / buttonStyle
```

Regras do contrato:

- somente cores hexadecimais de seis dígitos;
- ativos somente por HTTPS ou caminho absoluto da mesma origem;
- tipografia por token aprovado (`platform-sans`, `editorial-serif`, `humanist-sans`), nunca por `font-family` livre;
- objetos estritos, portanto CSS, JavaScript e campos desconhecidos são rejeitados;
- publicação bloqueada se qualquer par semântico de texto normal ficar abaixo de 4.5:1;
- adaptador explícito para o formato real legado (`appName`, `logoUrl`, `faviconUrl`, `primaryColor`, `accentColor`, `fontFamily`, `radius`, `density`, `colorMode`); a fonte livre legada não é promovida automaticamente.

O preset `CONEXAO_MACONICA_THEME` fica em `plugins/conexao-maconica/src/domain/theme.ts`, com `#7A1F2E`, `#C9A227`, `#F3EEDD`, superfície branca quente e título editorial. Componentes do Core não importam esse preset.

## 5. Tokens semânticos e integração

A fonte única pretendida é:

```text
--color-primary                  --color-primary-foreground
--color-secondary                --color-secondary-foreground
--color-accent                   --color-accent-foreground
--color-accent-subtle            --color-accent-subtle-foreground
--color-background               --color-surface
--color-surface-elevated         --color-foreground
--color-muted                    --color-muted-foreground
--color-border                   --color-ring
--color-success                  --color-warning
--color-destructive              --color-info
--font-heading                   --font-body
--font-interface                 --radius-sm/md/lg
--shadow-sm/md
```

Durante a migração, shadcn e Tailwind devem apontar para essas mesmas variáveis. Aliases legados são permitidos temporariamente, por exemplo `--bg-primary → --color-background`, `--accent → --color-primary` e `--highlight → --color-accent`; eles não formam um segundo tema.

O mapeamento reutilizável está publicado por `@saas/ui/tailwind-preset`. Cada aplicação informa apenas seus caminhos de conteúdo e plugins; não replica cores ou nomes semânticos. `apps/web/tailwind.config.ts` já consome esse preset.

Tokens de plano e confiança ficam em namespace próprio e não são editáveis como identidade do tenant:

```text
--plan-bronze / --plan-silver / --plan-gold
--trust-verified / --trust-founder
```

A disponibilidade e o significado desses estados vêm dos contratos de autoridade e dos módulos. Além da cor, badges precisam de rótulo, ícone e estado acessível.

## 6. Contrato de módulos e capabilities

O catálogo inicial está em `plugins/conexao-maconica/src/domain/theme.ts`. Ele descreve dependências e capacidades, sem consultar slug e sem conceder acesso sozinho.

`resolveEffectiveTenantModules`, no contrato do Core, faz a composição fail-closed: seleção configurada + plugin instalado + todas as capabilities concedidas + dependências efetivas + refinamento de feature. Uma feature flag `true` isolada nunca instala plugin nem concede capability.

| Camada existente | Responsabilidade |
|---|---|
| catálogo do plugin | define quais módulos e capabilities o produto conhece |
| `tenant_plugins.enabled` | instalação estrutural para o tenant |
| assinatura/plano/entitlements efetivos | autoridade comercial para usar capabilities |
| `tenant_features` | refinamento/rollout dentro de um módulo já instalado e autorizado |

Um produto genérico pode habilitar somente `directory.businesses`; nesse caso não recebe rotas, filtros, textos nem badges de `masonic.*` ou `founder.program`.

## 7. Resolução segura do tema público

Fluxo obrigatório:

```text
Host normalizado no servidor
→ tenant_domains verificado, SSL ativo e tenant ativo
→ RPC pública mínima por host
→ validação Zod + defaults seguros
→ variáveis e metadados no SSR
→ HTML inicial correto
```

O identificador público não vem de JWT, `x-tenant-id`, cookie ou parâmetro `tenant_id` enviado pelo cliente. Header/cookie podem continuar como conveniência interna autenticada, mas não são autoridade para páginas anônimas. Host deve ser normalizado com porta removida, limites de tamanho, IDNA conhecido e rejeição de valores ambíguos.

Tema e SEO devem consumir o mesmo resultado cacheável. A chave de cache inclui o host normalizado e a versão publicada; publicação invalida a chave. Falha de resolução usa um tema neutro seguro ou página de domínio não configurado, nunca a identidade de outro tenant.

## 8. Projeção pública mínima de branding

A projeção mínima da 041 foi homologada localmente e não expõe o objeto `settings`. A evolução para o contrato white label completo deve retornar apenas:

- `tenant_slug`, `schema_version`, `published_version` e `published_at`;
- `product_name` e `product_description` públicos;
- URLs já validadas de logos, favicon e imagens institucionais autorizadas;
- cores semânticas do contrato;
- tokens aprovados de tipografia e aparência;
- opcionalmente a lista de IDs de módulos públicos efetivamente disponíveis, nunca configurações privadas ou entitlements internos.

Não deve retornar `tenant_id`, o objeto completo `settings`, configurações de plugins, e-mails, documentos ou dados administrativos. A função deve resolver somente um domínio verificado, ter `search_path` fixo, privilégios mínimos e proteção de frequência na borda/API. A resposta para host inexistente deve ser uniforme para reduzir enumeração.

## 9. Tenant Admin planejado

O editor existente será evoluído, em fase posterior, para:

1. carregar somente contrato administrativo autorizado;
2. editar um rascunho versionado sem alterar o tema publicado;
3. selecionar cores, ativos e fontes aprovadas;
4. validar todos os pares WCAG, foco, estados e fundos;
5. enviar imagens para bucket privado por tenant e publicar somente URLs derivadas autorizadas;
6. oferecer prévia isolada, restauração e comparação;
7. publicar atomicamente por RPC com RBAC e auditoria;
8. invalidar cache e manter a última versão válida para rollback.

Não haverá upload fictício, URL simulada, CSS/JS livre ou fonte remota arbitrária. A política atual que permite atualizar a linha inteira de `tenants` é ampla demais para essa operação e deve ser substituída por um contrato de escrita restrito.

## 10. Proposta de persistência para a Fase 1C

O JSON atual suporta o conteúdo do tema v1, então a Fase 1B não cria migration. Para publicação segura, a Fase 1C deverá escolher e revisar uma destas estratégias:

- preferida: tabela de revisões de tema com `tenant_id`, versão, estado `draft/published/archived`, payload validado, autor e timestamps; índice único parcial para uma versão publicada por tenant;
- compatibilidade mínima: namespaces `themeDraft` e `themePublished` em `settings`, gravados somente por RPC restrita e auditada.

A primeira opção é recomendada por permitir auditoria, rollback, concorrência segura e privilégio de coluna. Como 040 e 041 permanecem não aplicadas remotamente, uma 042 só deve ser numerada depois de reconfirmar a última migration e aprovar o modelo de revisão. Nenhuma migration adicional foi criada ou aplicada nesta Fase 1B.

## 11. Estratégia de testes

Implementados agora:

- validação estrita do tema neutro e do preset Conexão Maçônica;
- rejeição de CSS desconhecido, URL insegura e fonte livre legada;
- adaptação segura do formato atual de `settings.branding`;
- bloqueio de publicação por contraste insuficiente;
- unicidade de módulos;
- segundo produto fictício sem módulos maçônicos, somente em teste.
- aplicação de dois temas distintos sobre os mesmos tokens sem alterar componentes;
- bloqueio arquitetural contra cores de produto/utilitários de paleta em `packages/ui`;
- resolução fail-closed de módulos desconhecidos, sem capability ou dependência;
- serialização de CSS rejeita declarações injetadas.

Obrigatórios nas fases de integração:

- dois hosts resolvem temas diferentes antes da hidratação e nunca cruzam cache;
- host não verificado, porta malformada, header/cookie forjado e tenant inativo são negados;
- leitura anônima não alcança `tenants.settings` nem campos privados;
- admin de outro tenant não lê, edita, publica nem acessa assets;
- alteração de tema não muda tokens de plano/confiança;
- todos os estados de foco, hover, active, disabled, alto contraste e `prefers-reduced-motion`;
- snapshot/Storybook do tema neutro e do Conexão usando os mesmos componentes.

## 12. Compatibilidade, riscos e ordem de execução

Riscos ainda abertos:

- a projeção 041 ainda não contém versionamento/publicação nem o contrato v1 completo;
- a projeção pública ainda entrega o formato legado mínimo; o contrato v1 completo depende da persistência/publicação da Fase 1C;
- o Brand Studio ainda altera o namespace legado no JSON e não possui publicação/auditoria;
- os componentes básicos de `packages/ui` foram generalizados, mas componentes locais duplicados ainda exigem convergência progressiva;
- nomes de capabilities existentes usam convenções diferentes e precisam de normalização progressiva;
- o runtime de plugin ainda precisa receber capabilities efetivas do tenant, não defaults ou flags isoladas.
- o seed legado ainda diverge do preset v1 e não foi alterado nesta fase para evitar mutação de dados fora da aprovação.

Ordem aprovada para as próximas entregas:

1. Fase 1A — contenção, contratos de autoridade e homologação PostgreSQL local concluídos;
2. Fase 1B — esta arquitetura, implementada e parada para revisão;
3. Fase 1C — aprovar a persistência versionada do tema, sem aplicação remota;
4. Fase 2 — aplicação e homologação controlada do backend/RLS;
5. Fase 3 — tokens, shell público e componentes compartilhados;
6. Fase 4 — Home, Guia e perfil como primeira aplicação real;
7. Fase 5 — Tenant Admin de personalização;
8. Fase 6 — segundo tema e produto sem módulos maçônicos em testes.

Até a aprovação desta fundação e a homologação do backend, não implementar as páginas visuais.
