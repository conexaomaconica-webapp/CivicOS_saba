# Inventário local de compatibilidade P0

Status: revisão local concluída; auditoria remota ainda não executada.

## Sequência 205–212

| Migration | Efeito local | Dependências/risco |
| --- | --- | --- |
| 205 | Compatibilidade de `plan_tier` com quotas de serviços/benefícios | Usa `_effective_business_plan`; funções privilegiadas revisadas posteriormente em 212 |
| 206 | Tenant público fail-closed e `search_path` seguro da RPC pública | Depende de `tenant_domains`, `tenants` e RPCs públicas existentes |
| 207 | Contrato JSONB com plano contratado, efetivo e acesso efetivo | Renomeia a implementação anterior para função interna; preserva assinatura pública |
| 208 | Assinaturas elegíveis ambíguas não concedem acesso | Substitui `_effective_business_plan`; mantém estados active/trialing/past_due/canceled |
| 209 | Remove policy legada `SELECT true` de `profiles` | Pode afetar consumidores que liam terceiros diretamente; exige projeção autorizada |
| 210 | Hardening de conta ativa, expiração de `user_roles`, `approved_at` e trigger de autoridade | Alteração global no banco compartilhado; requer smoke tests de cadastro/admin/LGPD |
| 211 | Inclui status, exclusão e consentimentos na lista de colunas do trigger | Permite primeira aceitação; bloqueia alteração posterior pelo próprio usuário |
| 212 | `search_path = ''` nas funções SECURITY DEFINER de quotas | Depende de todas as referências permanecerem qualificadas |

A ordem local é estritamente 205 → 206 → 207 → 208 → 209 → 210 → 211 → 212. Como a produção não possui `supabase_migrations.schema_migrations`, a reconciliação não poderá depender da CLI. A estratégia é:

1. Detectar tabelas de histórico existentes apenas pelo catálogo.
2. Comparar assinaturas, colunas, policies, grants, funções e triggers remotos com o estado local.
3. Gerar um inventário de objetos equivalentes, divergentes, ausentes e adicionais.
4. Tratar objetos equivalentes sem migration correspondente como possível alteração manual histórica.
5. Tratar migrations locais sem objeto remoto equivalente como pendências, sem executar `db push`, `migration repair` ou `db pull`.

Nenhum histórico alternativo será considerado prova de aplicação de uma migration; a evidência principal será o estado efetivo dos objetos.

## Consumidores de `profiles`

- Próprio perfil: `profile-access-service`, `member-profile-service`, onboarding e autenticação; leitura limitada por `id = auth.uid()`.
- Administração: `admin-users-service`, dashboard, aprovações e pagamentos; devem usar contexto server-side e escopo administrativo.
- Projeção pública: `listPublicMemberDTOs` com allowlist mínima; precisa ser confirmada para Mural, avaliações e conexões.
- Navegação pública: `PublicMobileBottomNav` e `DirectoryHeader` consultam apenas o perfil do usuário autenticado.
- RPCs/migrations: eventos, RSVP, auditorias, contratos, LGPD e notificações usam `profiles` via funções ou serviços privilegiados.
- Ponto de atenção: `user_profiles` é view de compatibilidade e deve ser incluída na auditoria de grants e definição de segurança.

## Critérios de aceite dos Gates

Gate A exige catálogo remoto compatível, policies/grants confirmados, funções privilegiadas com `search_path` seguro e smoke tests sem exposição global de `profiles`.

Gate B exige acesso correto de member/admin/master no tenant Conexão Maçônica, isolamento de tenant adversarial, contratos de planos e fluxos Guia, cadastro, benefícios, contratos, autenticação e RSVP aprovados.

Nenhum gate deve ser declarado aprovado apenas com evidência local.
