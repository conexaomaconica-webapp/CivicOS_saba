# Desenho Técnico de Remediação — `public.profiles` (P0-B)

> **Status:** proposta para revisão; não é migration executável e não autoriza alterações.  
> **Escopo:** banco Supabase multi-tenant compartilhado.  
> **Dependências:** [análise de impacto de `profiles`](./SUPABASE_PROFILES_IMPACT_ANALYSIS_P0B.md) e [plano de remediação global](./SUPABASE_SECURITY_REMEDIATION_PLAN_P0B.md).

A especificação pré-migration detalhada está em [`SUPABASE_PROFILES_REMEDIATION_IMPLEMENTATION_SPEC_P0B.md`](./SUPABASE_PROFILES_REMEDIATION_IMPLEMENTATION_SPEC_P0B.md). Ela fecha contratos, grants a avaliar, ordem de rollout e recuperação sem reabrir a exposição.

## 1. Objetivo

Substituir a leitura ampla de `profiles` por acessos mínimos e explícitos, preservando os consumidores Web, RBAC, LGPD, Storage e demais tenants. A implementação deve ser feita em incrementos reversíveis, após homologação.

## 2. Princípios de desenho

- `profiles` permanece fonte interna de identidade e autorização; não é uma API pública de diretório.
- O usuário autenticado acessa somente seu próprio perfil e os campos permitidos.
- Dados públicos de membros saem por uma projeção/DTO mínima, nunca pela tabela inteira ou por `SELECT *`.
- Administração consulta dados por serviço autorizado, com papel e tenant efetivos validados no servidor.
- `role`, `tenant_id`, `status`, `rhid`, e-mail, telefone e consentimentos não entram em projeções públicas.
- Policies permissivas e restritivas, grants de tabela/coluna, views e funções `SECURITY DEFINER` são avaliados em conjunto.
- Qualquer mudança é global ao Supabase e deve considerar todos os tenants e aplicações.

## 3. Modelo de acesso proposto

| Superfície | Campos mínimos | Canal | Autorização |
| --- | --- | --- | --- |
| Perfil próprio | `id`, `name`, `email`, `phone`, `city`, `state`, `avatar_url` | tabela/RPC de próprio perfil | `auth.uid() = id`; conta ativa |
| Atualização própria | `name`, `phone`, `city`, `state`, `avatar_url` | Server Action/RPC validada | `auth.uid() = id`; `WITH CHECK`; trigger preserva autoridade |
| Identificação pública | `id` técnico/slug público, nome e avatar consentidos | view/DTO allowlist | somente perfil publicado/consentido; sem PII sensível |
| Administração | `id`, nome, e-mail, papel, status, tenant, data de criação | serviço server-side | papel administrativo + tenant/escopo efetivo |
| RBAC interno | `role`, `tenant_id`, `status` | helpers/RPCs internas | server-side; nunca leitura global do cliente |
| LGPD | campos necessários ao titular e obrigações legais | serviço de exportação | próprio usuário, escopo legal e tenant |
| Storage | papel/owner mínimo para decidir objeto | policy/helper | usuário, empresa, tenant e bucket validados |

## 4. Opções avaliadas

### Opção A — Restringir a tabela e criar RPCs mínimas

Revogar a leitura ampla, adicionar policies de próprio perfil e expor funções allowlist para as necessidades administrativas e públicas.

**Vantagens:** menor superfície direta; regras centralizadas.  
**Riscos:** exige inventário completo de RPCs e revisão de `SECURITY DEFINER`.

### Opção B — View pública com grants mínimos

Criar uma view de projeção pública sem PII sensível e remover acesso à tabela original para clientes.

**Vantagens:** compatibilidade para diretórios e Mural.  
**Riscos:** view não é automaticamente segura; owner, `security_invoker`, grants, RLS e funções chamadas precisam ser verificados.

### Decisão preliminar

Adotar combinação de A+B: tabela restrita, RPC/serviço para perfil próprio e view/DTO pública mínima. Não usar a view como substituto de RLS nem conceder `SELECT` amplo na tabela base.

## 5. Sequência de migration proposta (não executável)

1. Criar consultas/DTOs de projeção e atualizar consumidores identificados.
2. Criar policies específicas de próprio perfil e administração, preservando triggers de autoridade.
3. Criar a projeção pública com colunas explicitamente allowlisted e revisar owner/`security_invoker`/grants.
4. Revogar `SELECT` amplo de `authenticated` na tabela base somente após todos os consumidores migrarem.
5. Revisar grants de `anon`, `authenticated` e `PUBLIC` em tabela, view e funções.
6. Revisar `SECURITY DEFINER` dependentes de `profiles`, incluindo `search_path`, owner e autorização interna.
7. Revalidar Storage e RPCs que consultam perfil para autorização.
8. Remover compatibilidade antiga somente após janela de observação e evidência de ausência de consumidores.

Cada passo deve ser uma migration isolada, com feature flag ou fallback quando aplicável. Não consolidar tudo em uma migration global sem rollback independente.

## 6. Testes de homologação

### Acesso a dados

- anônimo não lê `profiles`;
- membro lê somente o próprio perfil e a projeção pública permitida;
- membro não lê e-mail, telefone, RHID, role, tenant ou status de terceiros;
- admin lê somente o escopo administrativo autorizado;
- master respeita o escopo oficial e não ganha acesso implícito a todos os tenants;
- usuário de tenant adversarial não lê perfis da Conexão Maçônica;
- conta `deleted`, suspensa ou sem vínculo não acessa dados privados.

### Escrita e autoridade

- usuário altera somente campos próprios permitidos;
- `role`, `tenant_id`, `status`, `rhid` e consentimentos protegidos não podem ser forjados;
- RPCs rejeitam `user_id`, tenant, host e IDs cruzados;
- triggers e `WITH CHECK` permanecem ativos;
- views não permitem escrita indireta.

### Regressão

- login, middleware e redirects Web;
- perfil próprio, avatar e atualização de e-mail;
- admin de usuários, dashboard, LGPD e Storage;
- diretório, Mural, conexões, indicações e contratos;
- testes de contrato mobile v1 e typecheck/Vitest.

## 7. Rollback e observabilidade

- cada migration deve ter reversão específica revisada;
- preservar nomes de policies antigas até a validação da nova rota;
- monitorar erros de autorização, falhas de perfil e chamadas RPC durante a janela;
- não registrar e-mails, tokens, IPs ou valores de perfil em logs;
- se houver regressão, reverter somente o incremento afetado e manter a web funcional.

## 8. Critérios de aprovação

O desenho só poderá virar migration revisável quando:

- todos os consumidores da análise de impacto tiverem rota nova e campos definidos;
- a projeção pública estiver explicitamente allowlisted;
- grants de tabela, coluna, view e função estiverem documentados;
- funções `SECURITY DEFINER` em escopo tiverem revisão individual;
- testes com dois tenants e papéis `member`, `admin`, `master` passarem;
- rollback e janela de observação forem aprovados pelos responsáveis globais da plataforma.

Até essa aprovação, o Gate A permanece não aprovado, o Gate B permanece pendente e o P0-B mobile não pode ser implementado.
