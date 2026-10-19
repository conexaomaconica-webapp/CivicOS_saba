# P0-B — Auditoria local de consumidores e privilégios de `profiles`

Status: diagnóstico local concluído; nenhuma alteração remota realizada.

## Permissões efetivas locais

No PostgreSQL local, `information_schema.table_privileges` mostra poucos grants explícitos, mas `has_table_privilege`/ACL expandida demonstram permissões efetivas amplas no nível SQL:

| Papel | SELECT | INSERT | UPDATE | DELETE | RLS/bypass |
| --- | --- | --- | --- | --- | --- |
| `anon` | não | sim | sim | sim | RLS, sem bypass |
| `authenticated` | sim | sim | sim | sim | RLS, sem bypass |
| `service_role` | sim | sim | sim | sim | `rolbypassrls = true` |
| `postgres` | sim | sim | sim | sim | `rolbypassrls = true` |

Não foram encontradas memberships herdadas para esses papéis. A autorização real ainda depende das policies RLS; grant SQL não equivale a acesso efetivo a linhas.

Policies locais de `profiles`:

- leitura autenticada: próprio perfil, administrador do tenant ou master global;
- atualização autenticada: próprio perfil, com `tenant_id` e `role` preservados;
- master: policy global condicionada à função de autoridade;
- nenhuma policy global de leitura permanece após a migration 209.

## Consumidores identificados

| Consumidor | Canal | Operação | Classificação |
| --- | --- | --- | --- |
| `profile-access-service` | Server/BFF e páginas autenticadas | SELECT próprio, projeções públicas/internas, UPDATE administrativo | Serviço centralizado |
| `member-profile-service` | Server Action | SELECT/UPDATE próprio | Perfil próprio |
| onboarding/anunciar | Server Component/Action | SELECT próprio e criação/atualização relacionada | Web autenticado |
| `admin-users-service` | Server-side privilegiado | busca, role/status | Administração |
| dashboard/aprovações/pagamentos | Server-side | projeções allowlistadas | Administração |
| `PublicMobileBottomNav` e `DirectoryHeader` | Cliente Web | SELECT do próprio usuário | Cliente autenticado, sem leitura de terceiros |
| Mural/avaliações/conexões | Serviços/RPCs | projeção pública por IDs permitidos | Deve permanecer allowlistado |
| RSVP/eventos/LGPD/contratos | RPCs e serviços internos | leitura privilegiada conforme operação | Server/RPC |
| `user_profiles` | View de compatibilidade | depende de grants e definição da view | Requer validação remota |

Não foi encontrado consumidor mobile que ofereça administração ou gestão comercial; o app continua limitado à experiência de membro.

## Testes locais executados

- `107_member_area_foundation.sql`: 10/10.
- `108_member_profile_hardening.sql`: 4/4.
- `204_secure_user_tenant_membership_provisioning.sql`: 13/13.
- `205_p0b_authorization_function_hardening.sql`: 10/10.

Os testes cobrem perfil próprio, terceiros, campos de autoridade, consentimento, contas excluídas, papéis expirados, membership não aprovado e isolamento administrativo.

## Divergências remotas conhecidas

1. Produção possui trigger de `profiles` limitado a `id`, `role` e `tenant_id`; local 211 inclui também `status`, `deleted_at`, `terms_accepted_at` e `privacy_accepted_at`.
2. Produção ainda precisa ser comparada com os privilégios efetivos locais; ausência de linhas em `information_schema` não é suficiente.
3. A remoção da policy global de leitura parece já refletida nas policies remotas recebidas, mas a confirmação de grants e consumidores ainda é necessária.

## Correções mínimas recomendadas

- Não conceder `SELECT` global em `profiles`.
- Preservar projeções públicas allowlistadas ou RPCs autorizadas para Mural, avaliações e conexões.
- Validar o caminho server-side dos serviços que usam `service_role`.
- Aplicar 210/211 somente após confirmar cadastro, primeiro consentimento, atualização de perfil, aprovação administrativa e exclusão lógica.
- Não alterar grants com base apenas em `information_schema.table_privileges`.

Gate A e Gate B permanecem pendentes até a comparação remota de policies, ACLs efetivas, funções e triggers.
