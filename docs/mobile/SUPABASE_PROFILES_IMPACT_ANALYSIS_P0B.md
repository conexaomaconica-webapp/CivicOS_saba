# Análise de Impacto — `public.profiles` (P0-B)

> **Status:** análise somente leitura; nenhuma correção autorizada.  
> **Escopo:** consumidores Web, infraestrutura, migrations, RPCs, Storage e futuros consumidores mobile.  
> **Fonte:** repositório local e catálogo Supabase exportado em 14/10/2026.

## 1. Conclusão executiva

`public.profiles` é uma dependência global do banco multi-tenant. Foram identificados 46 arquivos de migration que criam, protegem ou consultam a tabela, além de consumidores Web e da camada de infraestrutura.

O catálogo confirmou RLS em `profiles`, mas também confirmou a policy `Allow authenticated read profiles` com `USING (true)` e `SELECT` concedido a `authenticated`. Isso permite leitura ampla de linhas por usuários autenticados e não deve ser corrigido removendo a policy sem antes mapear os consumidores abaixo.

Não há evidência de incidente ou de acesso indevido efetivamente ocorrido. O achado representa capacidade técnica configurada e requer minimização global compatível com os demais tenants e aplicações.

## 2. Matriz de consumidores comprovados

| Consumidor | Evidência | Campos/uso observado | Tipo de acesso atual | Direção de correção |
| --- | --- | --- | --- | --- |
| Middleware web | `apps/web/src/middleware.ts` | `role`, `tenant_id` do usuário autenticado | SSR por sessão | consulta própria ou helper server-side de autorização; nunca leitura global |
| Autorização master | `apps/web/src/lib/admin/admin-auth-helper.ts`, `apps/web/src/app/master/page.tsx` | `role` | sessão autenticada | função/serviço mínimo que retorna apenas papel efetivo |
| Redirecionamento anunciante | `apps/web/src/lib/advertiser/advertiser-access.ts` | `role` | sessão autenticada | helper de papel mínimo |
| Perfil próprio | `apps/web/src/app/minha-conta/perfil/page.tsx` | `name`, `email`, `phone`, `city`, `state`, `avatar_url` | leitura própria | policy própria + DTO de perfil; sem `role`, tenant, RHID ou status |
| Atualização do perfil próprio | `apps/web/src/lib/member/member-profile-service.ts`, `apps/web/src/lib/auth/auth-service.ts` | nome, e-mail, telefone, cidade, UF, avatar | update próprio | manter `WITH CHECK` próprio e trigger de campos de autoridade |
| Administração de usuários | `apps/web/src/lib/admin/admin-users-service.ts` | `id`, `name`, `email`, `role`, `status`, `tenant_id`, `created_at` | servidor com cliente administrativo | serviço privilegiado com escopo explícito, campos mínimos e auditoria |
| Dashboard administrativo | `apps/web/src/lib/admin/admin-dashboard-service.ts` | `full_name`, `email`, contagem por `created_at` | servidor/admin | métricas agregadas e consulta própria; evitar listagem global para papéis não autorizados |
| LGPD/exportação | `packages/infrastructure/src/lgpd/lgpd-repository.ts` | e-mail e relações de dados do titular | serviço servidor | escopo por `user_id`/tenant e saída mínima |
| RBAC | `packages/infrastructure/src/rbac/rbac-repository.ts` | `role` de plataforma | caminho service-role servidor | manter fora do cliente; cruzar com memberships e permissões |
| Storage | migrations `069`, `199`, `200` | papel do usuário, dono, avatar | policies Storage | usar helper/claims mínimos e escopo por objeto/tenant |
| RPCs/triggers | 46 migrations listadas na seção 4 | autorização, tenant, e-mail, RHID, nome público | SECURITY DEFINER/RLS | triagem por risco e revisão individual |

## 3. Classificação de dados

| Classe | Campos exemplificativos | Consumidores legítimos | Exposição recomendada |
| --- | --- | --- | --- |
| Próprio perfil | `name`, `phone`, `city`, `state`, `avatar_url` | titular autenticado | somente o próprio usuário |
| Identificação pública controlada | nome e avatar, quando consentidos | Mural/diretório publicado | projeção/DTO sem campos administrativos |
| Autorização | `role`, `tenant_id`, `status` | middleware e serviços autorizados | servidor; nunca listagem pública |
| Dados pessoais | `email`, `phone`, `rhid` | titular, LGPD e administradores autorizados | mínimo necessário e escopo validado |
| Consentimento | `terms_accepted_at`, `privacy_accepted_at` | titular/LGPD/serviço de conformidade | servidor e exportação do titular |

## 4. Dependências de migrations e banco

Foram encontrados 46 arquivos SQL que referenciam `public.profiles`. Os grupos principais são:

- criação, constraints, triggers e RLS: `002`, `039`, `107`, `108`, `140`;
- tenant/RBAC e helpers de autorização: `005`, `006`, `040`, `073`, `204`;
- LGPD e exportação: `038`, `039`;
- Storage e avatares: `044`, `069`, `199`, `200`;
- admin, eventos, surveys, contratos e analytics: `045`, `047`, `060`, `061`, `063`, `064`, `066`, `112`, `113`, `116`, `117`, `120`, `122`, `134`, `138`, `139`, `142`, `144`;
- diretório, conexões, benefícios e mudanças de empresas: `068`, `088`, `091`, `092`, `106`, `163`, `168`, `185`, `189`.

Essa lista é inventário de dependências, não autorização para alterar as migrations.

## 5. Riscos de compatibilidade

1. Remover a policy global pode quebrar middleware, diretórios, RPCs, Storage e serviços administrativos.
2. Manter `SELECT` amplo perpetua exposição de dados pessoais e atributos de autoridade.
3. Corrigir somente o mobile deixaria a exposição global da Web e de outros tenants intacta.
4. Alterar `role`/`tenant_id` sem preservar triggers e vínculos pode quebrar autorização existente.
5. Funções `SECURITY DEFINER` podem depender de leitura de `profiles` com privilégios do owner; cada função precisa de revisão própria.

## 6. Plano de impacto antes da correção

1. Inventariar chamadas e campos em cada consumidor acima.
2. Separar consultas próprias, projeções públicas, administração e serviços internos.
3. Identificar quais RPCs retornam dados derivados de perfil e quais aceitam parâmetros de tenant/usuário.
4. Projetar DTOs/projeções mínimas e helpers server-side.
5. Reproduzir o comportamento em homologação com dois tenants e papéis `member`, `admin`, `master` e usuário sem vínculo.
6. Medir regressão Web, Storage, LGPD, admin e contratos antes de qualquer produção.

## 7. Critério de saída

A análise de impacto só estará concluída quando cada consumidor tiver campos, canal, papel autorizado, tenant efetivo, alternativa de correção e teste de regressão documentados. Até esse ponto, o Gate A permanece não aprovado, o Gate B permanece pendente e a implementação mobile continua bloqueada.

