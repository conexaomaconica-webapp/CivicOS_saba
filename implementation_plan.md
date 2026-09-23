# MEMBER-001 — Fundação da Área do Membro

## Objetivo e limite desta entrega

Criar a fundação da Área do Membro em `/minha-conta`, usando Supabase Auth e a tabela `profiles` existentes, sem misturar permissões com `/anunciante` ou `/admin`.

Este documento é apenas o plano de implementação. Nenhuma tabela, rota ou regra funcional do MEMBER-001 deve ser criada antes da aprovação deste plano e da confirmação do Project Ref oficial do Supabase.

## Diagnóstico atual

### Autenticação e cadastro

- A autenticação já usa Supabase Auth com clientes SSR/browser.
- O cadastro existente está em `apps/web/src/app/(auth)/register/page.tsx` e chama `signUp()` de `apps/web/src/lib/auth/auth-service.ts`.
- O cadastro atual solicita nome, e-mail, senha e confirmação. Ainda não solicita cidade, UF nem aceites legais.
- O parâmetro `redirect` já é validado contra URLs externas e preservado entre cadastro e login.
- O callback de autenticação já aceita um destino interno em `apps/web/src/app/auth/callback/route.ts`.
- O login respeita `redirect`, mas, sem ele, envia todo usuário não administrativo para `/anunciante`. Isso é incorreto para membros sem vínculo empresarial.

### Profiles, roles e trigger

- `public.profiles` é criado em `supabase/migrations/002_profiles.sql`.
- O CHECK atual aceita apenas `master`, `socio_admin`, `anunciante` e `usuario_comum`.
- O papel lógico de membro já existe parcialmente como `usuario_comum`; não existe `member` em `profiles`.
- `tenant_members.role` já usa `member` como padrão, mas representa vínculo com tenant e não deve ser confundido com autorização administrativa da plataforma.
- O trigger `public.handle_new_user()` cria `profiles` e, quando recebe `tenant_id`, cria `tenant_members`.
- O trigger atualmente lê `role` de `raw_user_meta_data`. Mesmo com lista permitida, uma conta não deve poder solicitar papel `anunciante` pelo payload público. O trigger deve criar contas públicas sempre como `member`; elevação administrativa/comercial deve continuar em fluxo privilegiado.
- A autorização administrativa já possui fontes específicas (`business_members`, helpers RBAC e `admin-roles.ts`). O novo papel não deve substituir essas fontes.

### Perfil existente

- Existe `/usuario/perfil`, com nome, e-mail, senha, vínculos comunitários e privacidade.
- O serviço `updatePersonalProfile()` atualiza Auth e `profiles`, mas suporta apenas nome e e-mail.
- `profiles` não possui hoje telefone, cidade, UF, nascimento ou foto.
- O e-mail deve continuar canônico em `auth.users`; `profiles.email` é somente projeção operacional.
- A foto usada em avaliações pode vir de metadata do Auth, mas não existe ainda um fluxo canônico de upload do membro.

### Middleware e rotas

- O middleware protege `/admin`, `/dashboard`, `/perfil`, `/profile` e `/usuario`.
- `/minha-conta` ainda não está incluída nas rotas protegidas.
- O middleware consulta `profiles.role` somente em rotas protegidas e preserva a separação de admin/dashboard.
- A rota `/minha-conta/beneficios` já existe, mas isolada, sem layout/sidebar da Área do Membro.
- Cada Server Component protegido também deve validar `auth.getUser()`; middleware não substitui autorização no servidor.

### Navbar pública

- `PublicHeader` já possui contrato opcional `viewer`, avatar e nome.
- O layout público real não resolve nem fornece `viewer`; apenas fixtures do Visual Lab usam esse caminho.
- Os botões de favoritos/notificações mostram estado visual estático e ainda não são conectados à conta.
- Não existe dropdown funcional da conta nem logout nesse cabeçalho.
- O diretório usa um cabeçalho próprio (`DirectoryHeader`), que precisará adotar o mesmo estado de sessão.

### Funcionalidades já existentes que devem ser reutilizadas

- Favoritos: já existe `public.business_favorites` com RLS. Não criar `member_business_favorites`.
- Avaliações: reutilizar `public.business_reviews`, a moderação atual e a regra única por autor/empresa.
- Benefícios: reutilizar `public.business_benefit_redemptions` e as RPCs transacionais existentes.
- Área inicial de benefícios: reutilizar e incorporar `/minha-conta/beneficios` ao novo layout.
- Tenant: manter `tenant_members`; não criar associação paralela para membro.

## Decisões arquiteturais

1. `member` será o papel padrão de conta comum em `profiles`.
2. A autorização administrativa continuará baseada em helpers protegidos e vínculos (`business_members`, tenant roles e platform roles), nunca apenas em `profiles.role`.
3. Usuário com empresa também poderá acessar `/minha-conta`; os contextos de membro e anunciante não são mutuamente exclusivos.
4. O login decidirá o destino por vínculo real:
   - `redirect` interno informado: respeitar;
   - administrador de plataforma: seletor/admin existente;
   - possui empresa ou `business_members`: `/anunciante`;
   - caso contrário: `/minha-conta`.
5. Dados pessoais básicos serão extensões de `profiles`, evitando uma segunda identidade.
6. Foto terá bucket/prefixo próprio de membro e URL persistida no perfil; não reutilizar caminhos de mídia empresarial.
7. A UI será Server Component por padrão, com Client Components apenas nos formulários, upload, dropdown e logout.

## Modelo de dados e migration necessária

Criar uma migration posterior à `106`, após confirmar a sequência atual.

### Alterações em `profiles`

- ampliar o CHECK de `role` para aceitar `member`;
- migrar `usuario_comum` para `member` de forma transacional;
- manter compatibilidade temporária de leitura para código antigo durante a implantação;
- adicionar `phone TEXT`;
- adicionar `city TEXT`;
- adicionar `state TEXT` com validação de duas letras;
- adicionar `birth_date DATE NULL`;
- adicionar `avatar_url TEXT NULL`;
- adicionar `terms_accepted_at TIMESTAMPTZ`;
- adicionar `privacy_accepted_at TIMESTAMPTZ`;
- adicionar preferências mínimas de privacidade somente se pertencentes ao MEMBER-001; preferências de comunicação ficam para MEMBER-005.

### Trigger de novo usuário

- substituir a confiança em `raw_user_meta_data.role` por `member` para cadastro público;
- aceitar apenas nome, cidade, UF e timestamps/versionamento dos aceites no fluxo público;
- preservar criação opcional de `tenant_members` com role `member` quando houver tenant verificado;
- manter elevação para anunciante/admin fora do trigger público.

### Storage

- criar bucket ou prefixo canônico `member-avatars`;
- limite de tamanho e MIME para JPEG/PNG/WebP;
- caminho `{auth.uid()}/avatar.{ext}` ou UUID controlado;
- SELECT público apenas da imagem destinada à apresentação pública;
- INSERT/UPDATE/DELETE somente quando o primeiro segmento for `auth.uid()`;
- nenhum `service_role` no navegador.

## RLS proposta

### `profiles`

- `SELECT`: o usuário lê o próprio perfil; admins mantêm regras atuais.
- `UPDATE`: o usuário atualiza somente a própria linha.
- `WITH CHECK`: `id`, `role` e `tenant_id` permanecem imutáveis pelo membro.
- `INSERT`: exclusivamente pelo trigger de `auth.users`, não pelo cliente.
- O e-mail não deve ser alterado apenas em `profiles`; primeiro chamar `auth.updateUser()`.

### Proteções complementares

- validar cidade/UF no servidor, além do formulário;
- normalizar telefone e limitar comprimentos;
- não expor nascimento, telefone ou e-mail por RPC pública;
- não usar metadata editável do usuário como fonte de role;
- validar upload pelo conteúdo do arquivo, não apenas extensão/MIME declarado.

## Rotas MEMBER-001

### Criar

- `/minha-conta` — resumo inicial e aviso de perfil incompleto;
- `/minha-conta/perfil` — dados pessoais, foto e segurança;
- `/minha-conta/layout.tsx` — autenticação, layout responsivo e navegação da conta.

### Reutilizar/redirecionar

- incorporar `/minha-conta/beneficios` ao layout sem reescrever o motor de resgates;
- manter `/usuario/perfil` temporariamente redirecionando para `/minha-conta/perfil`, após migrar vínculos e privacidade;
- não criar ainda favoritos, avaliações, eventos, seguindo, notificações e preferências funcionais; seus links podem ficar ausentes até as respectivas fases.

## Fluxos

### Cadastro

1. Usuário informa nome, e-mail, senha, cidade e UF.
2. Usuário aceita Termos e Política de Privacidade separadamente.
3. Cliente envia somente dados permitidos; não envia role privilegiado.
4. Supabase Auth cria a conta.
5. Trigger cria `profiles.role = 'member'` e vínculo tenant `member`, se aplicável.
6. Se confirmação de e-mail estiver ativa, usuário confirma e retorna pelo callback.
7. Login respeita a URL original ou envia para `/minha-conta`.

### Login após ação protegida

1. Ação gera `/login?redirect=<rota interna>`.
2. Login valida o destino para impedir open redirect.
3. Após autenticação, retorna à rota original.
4. Continuação automática da ação (favoritar/resgatar) fica para a fase da funcionalidade; MEMBER-001 garante o retorno correto.

### Edição de perfil

1. Server Component carrega `auth.getUser()` e a própria linha de `profiles`.
2. Client Component envia mutation por Server Action validada.
3. Nome/metadados são sincronizados com Auth quando necessário.
4. E-mail usa fluxo de confirmação do Supabase.
5. Foto é validada, enviada ao storage e persistida em `profiles.avatar_url`.

## Layout e navegação

### Desktop

- sidebar com Visão geral, Meu perfil e Meus benefícios já funcional;
- áreas futuras entram apenas quando implementadas;
- conteúdo principal com cabeçalho e logout.

### Mobile

- cards/menu compacto ou drawer;
- todas as ações acessíveis por teclado e com rótulos;
- estados de carregamento e erro explícitos.

### Navbar pública autenticada

- layout público resolve sessão no servidor e fornece somente nome, localização e avatar seguro;
- não autenticado: `Entrar`;
- autenticado: avatar/nome e dropdown;
- dropdown inicial: Minha conta, Meu perfil, Meus benefícios e Sair;
- mostrar Portal do Anunciante somente quando existir vínculo empresarial real;
- remover contadores fictícios de notificações.

## Arquivos previstos

### Alterar

- `apps/web/src/middleware.ts`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(public)/layout.tsx`
- `apps/web/src/components/public/PublicHeader.tsx`
- `apps/web/src/components/public/PublicShell.tsx`
- `apps/web/src/lib/auth/auth-service.ts`
- `apps/web/src/lib/auth/validation.ts`
- `apps/web/src/types/database.types.ts` somente por regeneração após migration

### Criar

- migration MEMBER-001 após a `106`
- `apps/web/src/app/minha-conta/layout.tsx`
- `apps/web/src/app/minha-conta/page.tsx`
- `apps/web/src/app/minha-conta/perfil/page.tsx`
- Client Components mínimos para navegação, perfil, avatar e logout
- serviço/Server Actions específicos do membro
- testes Vitest do fluxo e testes PostgreSQL/RLS

### Migrar ou redirecionar

- `apps/web/src/app/usuario/perfil/*`
- `apps/web/src/app/minha-conta/beneficios/page.tsx`

## Critérios de aceite

- cadastro cria conta `member` sem permitir autoelevação;
- nome, cidade, UF e aceites são persistidos;
- usuário sem vínculo empresarial entra em `/minha-conta`, nunca em `/anunciante`;
- usuário com vínculo pode alternar entre Minha Conta e Portal do Anunciante;
- `/minha-conta/**` exige autenticação no middleware e no servidor;
- membro edita nome, telefone, cidade, UF e foto próprios;
- membro não altera `role`, `tenant_id` ou perfil de terceiros;
- e-mail segue confirmação do Supabase Auth;
- navbar pública mostra dados reais, sem contador ou avatar fictício;
- logout limpa sessão e retorna a rota pública definida;
- redirect pós-login não aceita URL externa;
- nenhuma permissão existente de admin/anunciante é ampliada.

## Testes obrigatórios

### TypeScript e unidade

- `pnpm --filter web typecheck`;
- `pnpm --filter web exec vitest run`;
- validação de cadastro, UF, telefone e aceites;
- decisão de destino pós-login por role/vínculo;
- sanitização do parâmetro `redirect`;
- dropdown e logout;
- estado de perfil incompleto.

### PostgreSQL/RLS real

- cadastro público resulta em `profiles.role = member` mesmo se metadata tentar `admin`/`anunciante`;
- membro lê e atualiza somente o próprio perfil;
- membro não altera role nem tenant;
- membro não lê dados privados de outro perfil;
- admin mantém acesso autorizado;
- policies do avatar impedem escrita fora do próprio prefixo;
- RPCs públicas não expõem telefone, e-mail, nascimento ou preferências.

## Riscos e mitigação

- **Quebra por renomear `usuario_comum`:** localizar todas as comparações e implantar compatibilidade antes do backfill.
- **Confusão entre `profiles.role` e `tenant_members.role`:** documentar que o primeiro classifica a conta e o segundo representa vínculo tenant.
- **Autoelevação via metadata:** trigger ignora role enviado pelo cadastro público.
- **Usuário anunciante perder acesso:** decisão de portal usa vínculo empresarial real, não apenas role.
- **RLS recursiva:** usar helpers SECURITY DEFINER mínimos, com `search_path = ''` e ACL explícita.
- **Exposição de dados pessoais:** projeções públicas nunca consultam novos campos privados.
- **Migration no banco errado:** confirmar Project Ref/URL antes de aplicar ou homologar.
- **Duplicação de favoritos/perfil:** reutilizar `business_favorites` e `profiles` existentes.

## Ordem de implementação após aprovação

1. migration e testes PostgreSQL do papel/perfil/RLS;
2. tipos gerados;
3. cadastro e validações;
4. decisão de destino do login;
5. middleware e layout `/minha-conta`;
6. perfil e upload de avatar;
7. navbar autenticada e logout;
8. migração/redirecionamento de `/usuario/perfil`;
9. integração da página de benefícios existente;
10. typecheck, Vitest e homologação RLS no projeto confirmado.
