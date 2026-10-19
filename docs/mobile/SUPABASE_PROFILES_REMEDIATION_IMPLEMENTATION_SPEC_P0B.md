# Especificação de Implementação — Remediação de `public.profiles` (P0-B)

> **Status:** pré-implementação; aguardando revisão e autorização formal.  
> **Não autoriza:** migrations, grants, policies, funções, deploy ou alteração no Supabase.  
> **Base:** [desenho de remediação](./SUPABASE_PROFILES_REMEDIATION_DESIGN_P0B.md) e [análise de impacto](./SUPABASE_PROFILES_IMPACT_ANALYSIS_P0B.md).

O draft SQL para homologação, a matriz de testes e o procedimento de recuperação estão em [`supabase/audits/p0b_profiles_remediation_homologation_draft.sql`](../../supabase/audits/p0b_profiles_remediation_homologation_draft.sql), [`SUPABASE_PROFILES_HOMOLOGATION_TESTS_P0B.md`](./SUPABASE_PROFILES_HOMOLOGATION_TESTS_P0B.md) e [`SUPABASE_PROFILES_ROLLBACK_P0B.md`](./SUPABASE_PROFILES_ROLLBACK_P0B.md). Nenhum deles autoriza execução.

## 1. Decisão de canal

### Perfil próprio — recomendado: RPC/serviço allowlist

O caminho canônico será uma operação server-side versionada, por BFF/Server Action ou RPC dedicada, que retorna somente o DTO aprovado. A tabela base não será usada pelo mobile para `SELECT *`.

Contrato conceitual:

```text
GET /api/mobile/v1/me/profile
-> autentica JWT e deriva user_id de auth.uid()
-> verifica conta ativa e vínculo com o tenant Conexão Maçônica
-> retorna ProfileSelfDTO allowlist

PATCH /api/mobile/v1/me/profile
-> aceita somente name, phone, city, state, avatar_url
-> ignora/rejeita id, role, tenant_id, status, rhid e campos de consentimento
-> aplica validação e retorna ProfileSelfDTO
```

O mesmo contrato pode ser adaptado para a Web, preservando a experiência atual. Não haverá diferença de autorização entre Web e Mobile.

### Projeção pública — recomendado: BFF/serviço server-side

O diretório/Mural deverá consumir um DTO público produzido por serviço autorizado, com publicação e consentimento verificados. Uma view SQL só poderá ser escolhida após provar owner, grants, `security_invoker`/`security_definer`, relação subjacente e comportamento de RLS.

Não conceder `SELECT` na tabela base como forma de alimentar uma projeção pública.

## 2. DTOs e colunas

### `ProfileSelfDTO`

Permitidos na leitura: `id`, `name`, `email`, `phone`, `city`, `state`, `avatar_url`, `terms_accepted_at`, `privacy_accepted_at` quando necessários ao próprio titular.

Somente leitura interna/servidor: `role`, `tenant_id`, `status`, `rhid`, `created_at`, `updated_at` e atributos de auditoria.

Atualizáveis pelo titular: `name`, `phone`, `city`, `state`, `avatar_url`. E-mail continua no fluxo Auth com confirmação; consentimentos seguem operações próprias de conformidade.

### `PublicMemberDTO`

Permitidos somente quando publicados e consentidos: identificador público, nome de exibição e avatar público. Não incluir `email`, `phone`, `rhid`, `role`, `tenant_id`, `status`, consentimentos ou timestamps internos.

### `AdminProfileDTO`

Permitidos ao administrador autorizado: `id`, `name`, `email`, `role`, `status`, `tenant_id`, `created_at`, com paginação, filtros por escopo e trilha de auditoria. Nunca retornar a tabela completa por padrão.

## 3. Matriz preliminar de grants

Esta matriz é uma especificação para revisão, não SQL executável. O grant de tabela não substitui RLS, e RLS não restringe colunas.

| Papel | `profiles` tabela | Perfil próprio | Projeção pública | Administração |
| --- | --- | --- | --- | --- |
| `anon` | sem `SELECT`/escrita | não | somente endpoint/DTO público | não |
| `authenticated` | sem `SELECT` genérico após migração | RPC/BFF do próprio usuário | DTO público allowlist | somente serviço que valide papel/tenant |
| `service_role` | servidor apenas; nunca bundle | serviço autorizado | serviço autorizado | serviço autorizado e auditado |
| `PUBLIC` | nenhum `EXECUTE` sensível | não | somente funções explicitamente públicas | não |

Grants por coluna só serão considerados se preservarem todos os consumidores e não criarem uma falsa sensação de segurança sobre views/RPCs. A alternativa preferida é não conceder leitura direta e concentrar a allowlist no serviço/RPC.

## 4. Autorização administrativa

O serviço administrativo deve:

1. validar JWT e `auth.uid()`;
2. obter papel efetivo e vínculos pelo mecanismo canônico, sem confiar somente em `profiles.role` ou `profiles.tenant_id` fornecidos pelo cliente;
3. aplicar escopo do tenant e da operação;
4. diferenciar `member`, `admin` e `master` conforme regras existentes;
5. paginar e selecionar somente os campos do `AdminProfileDTO`;
6. auditar alterações sem registrar tokens ou dados desnecessários.

`master` não recebe acesso irrestrito por ser um valor textual; o escopo global existente precisa ser comprovado nas funções e memberships.

## 5. Dependências a revisar antes da migration

- `profiles` policies atuais e eventuais policies RESTRICTIVE;
- grants de tabela e coluna para `anon`, `authenticated`, `service_role` e `PUBLIC`;
- view `user_profiles` e qualquer view pública derivada;
- `protect_own_profile_authority_fields()` e `assign_profile_rhid()`;
- `current_tenant_id()`, `current_user_profile_tenant_id()`, `get_current_user_role()` e helpers de permissão;
- funções `SECURITY DEFINER` que consultam ou retornam campos de `profiles`;
- Storage policies que consultam `profiles` para decidir administração;
- middleware, Server Actions, admin, LGPD, Mural e contratos mobile v1.

Cada dependência deve receber status: migrada para DTO, mantida em serviço privilegiado, substituída por helper ou bloqueada para revisão.

## 6. Ordem de implantação proposta

1. Implementar e testar os contratos/DTOs e endpoints em ambiente de homologação.
2. Migrar consumidores Web e serviços internos para os contratos allowlist.
3. Homologar perfil próprio, administração, LGPD, Storage, diretório e Mural com dois tenants.
4. Adicionar observabilidade sem dados pessoais e confirmar ausência de chamadas diretas legadas.
5. Aplicar grants/policies mínimos em migration isolada e reversível.
6. Monitorar erros e rejeições; manter o caminho seguro de recuperação.
7. Só depois remover compatibilidade antiga, em janela separada.

Nenhum passo deve depender de restaurar `USING (true)` como fallback.

## 7. Recuperação segura

### Rollback funcional

Se um consumidor falhar, reativar temporariamente o endpoint/DTO compatível já testado ou fazer rollback do incremento de aplicação, mantendo a restrição de `profiles`.

### Rollback de segurança

Se a mudança de banco precisar ser revertida, retornar somente a última configuração comprovadamente segura e versionada. É proibido restaurar automaticamente a policy global `USING (true)` ou grants amplos.

Antes da janela, registrar snapshot de policies, grants, views, funções e contratos esperados. A reversão deve ser específica por incremento.

## 8. Testes de aceite

- perfil próprio lê somente o DTO permitido;
- `role`, `tenant_id`, `status`, `rhid` e campos de terceiros não são expostos ao membro;
- atualização própria não altera campos de autoridade;
- membro de tenant B não acessa perfil ou recurso privado da Conexão Maçônica;
- `admin` e `master` recebem somente o escopo oficial validado;
- conta desativada/deletada não acessa operações privadas;
- projeção pública não expõe PII nem autoridade;
- nenhuma view ou `SECURITY DEFINER` contorna o desenho;
- Web, LGPD, Storage, Mural e contratos mobile permanecem funcionais;
- rollback funcional não reabre leitura global.

## 9. Gate de autorização

Esta especificação só poderá virar migration revisável após aprovação dos responsáveis globais da plataforma, evidência de homologação, análise de impacto nos demais tenants e revisão SQL linha a linha. Até lá, Gate A permanece não aprovado, Gate B pendente e a implementação mobile não autorizada.
