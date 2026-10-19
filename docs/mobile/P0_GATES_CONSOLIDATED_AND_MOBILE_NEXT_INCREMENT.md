# P0-B — Consolidação dos Gates A/B e próximo incremento mobile

Data: 2026-10-16  
Ambiente: homologação local e evidências READ-ONLY remotas  
Status: Gates A/B pendentes de aprovação para produção

## 1. Gate A — segurança global

Evidências locais consolidadas:

- SQL P0-B: 115/115 cenários aprovados (040, 042, 105, 107, 108, 110, 204 e 205).
- Vitest Web: 144/144 arquivos aprovados, executados em lotes para evitar timeout.
- TypeScript e `git diff --check`: aprovados.
- Isolamento sintético entre tenants e testes negativos: aprovados no ambiente local.
- A policy global de leitura de `profiles` não existe no catálogo auditado.
- Consumidores de `profiles` foram classificados por perfil próprio, projeção pública, administração e serviço interno.
- Grants e EXECUTE efetivos foram analisados localmente; `service_role` permanece somente server-side.

O Gate A **não está aprovado para produção**. As diferenças remotas ainda não comprovadas são:

1. Compatibilidade efetiva das migrations 205–212 com o catálogo remoto, já que o histórico CLI não está disponível.
2. Trigger remoto de `profiles` ainda cobre apenas `id`, `role` e `tenant_id`; a proteção local 210/211 também cobre `status`, `deleted_at` e consentimentos.
3. Equivalência remota das funções hardening e do resolver fail-closed de tenant/plano.
4. Equivalência de policies, grants, triggers, RPCs e `search_path` para todos os objetos 205–212.

Nenhuma dessas diferenças autoriza inferir incidente ou aprovar segurança; exigem implantação controlada e validação posterior.

## 2. Gate B — Conexão Maçônica

Homologação local do hardening concluída. Foram validados contas ativas/excluídas, papéis expirados, memberships não aprovados, master global, isolamento e tentativas de alteração de autoridade.

O Gate B permanece pendente para produção porque a proteção remota de `profiles` não é equivalente às migrations 210/211. As autorizações existentes devem ser preservadas até uma janela controlada de implantação, com backup verificável, rollback e smoke tests.

## 3. Próximo incremento mobile — autenticação local/isolada

O aplicativo continua exclusivo da experiência de membro. `member`, `admin`, `master` e responsáveis por empresas usam a mesma navegação; nenhum papel libera administração, painel comercial, contratos, pagamentos ou checkout no app.

Foi criada a fronteira local `apps/mobile/src/member-access.ts`, com testes, que:

- exige sessão autenticada;
- aceita somente o tenant canônico `conexao-maconica` retornado pelo backend;
- exige vínculo ativo e perfil ativo;
- falha fechado para tenant informado pelo dispositivo, usuário sem vínculo ou conta inativa;
- não usa `role` para desbloquear superfícies administrativas.

Essa fronteira ainda não conecta ao Supabase remoto. O próximo incremento de implementação deve adicionar, em ambiente isolado, o adaptador Supabase Auth com PKCE, restauração/renovação/logout, deep link e armazenamento Keychain/Keystore. O cliente deve usar apenas chave pública; `service_role` é proibido no app.

O incremento P0-C iniciado localmente adiciona `apps/mobile/src/mobile-auth.ts`, com provider injetável, store seguro injetável, restauração, login, logout, callback PKCE e rejeição de sessões cujo vínculo não seja autorizado. A sessão autenticada pode permanecer armazenada com segurança durante uma falha temporária de autorização; uma negativa efetiva limpa a sessão local. Os testes usam provider/store sintéticos; não representam ainda homologação contra Supabase nem dispositivo real.

Também foi adicionado `apps/mobile/src/mobile-access-guard.ts`: Home/Guia e demais superfícies públicas permanecem acessíveis sem sessão, enquanto favoritos, indicações, conexões, mural e perfil exigem revalidação de autorização. A decisão é recalculada para cada operação protegida; ela não substitui RLS nem a autorização server-side.

O guard diferencia autorização `authorized`, negativa `denied` e indisponibilidade temporária `indeterminate`. O controlador de sessão mantém esse estado sem limpar credenciais automaticamente; novos acessos protegidos continuam bloqueados até a revalidação. O estado `loading` permanece reservado ao ciclo de inicialização da interface.

O adaptador estrutural `apps/mobile/src/supabase-auth-adapter.ts` foi preparado para o cliente Supabase Auth, incluindo login, refresh, sessão atual, eventos e logout com escopo `local`. Ele recebe o cliente por injeção, não contém credenciais e permite homologação sintética sem apontar para produção. O uso efetivo em Android ainda depende da configuração local do cliente, PKCE/deep link e armazenamento nativo seguro.

O contrato `apps/mobile/src/secure-session-store.ts` separa o armazenamento de tokens da API genérica de Preferences: em Android ele deve ser ligado a um vault baseado em Keystore e, no iOS, a Keychain. A implementação local não grava tokens em Preferences nem simula segurança nativa.

## 4. Implantação futura (não executada)

Pré-requisitos: catálogo remoto comparado, backup verificável, migrations 205–212 revisadas e ordem de aplicação confirmada. Aplicar em janela controlada, executar smoke tests de autenticação, Guia, cadastro, benefícios, contratos, RSVP e permissões, e interromper se houver falha de isolamento ou regressão comercial.

Recuperação deve privilegiar rollback funcional seguro; não reintroduzir a policy global de leitura de `profiles`. Nenhuma migration, `db push`, `migration repair`, deploy ou merge foi executado nesta etapa.

## 5. Decisão

- Gate A: não aprovado para produção.
- Gate B: homologado localmente, pendente para produção.
- Mobile: desenvolvimento local/isolado retomado; integração remota e publicação continuam bloqueadas até os Gates A/B.
