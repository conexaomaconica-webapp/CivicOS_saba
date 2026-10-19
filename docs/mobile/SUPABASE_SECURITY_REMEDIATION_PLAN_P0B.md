# Plano de Remediação de Segurança Supabase — P0-B

> **Status:** planejamento; nenhuma correção autorizada.  
> **Escopo:** segurança global do Supabase compartilhado, vinculada ao gate P0-B.  
> **Projeto:** `rwvztwsjcjljphqttiws` — produção.  
> **Restrições:** sem migrations, grants, policies, funções, configuração Auth, Storage ou dados alterados nesta fase.

## 1. Objetivo

Reduzir os riscos confirmados ou pendentes no banco multi-tenant antes de conectar o aplicativo mobile. O plano é global: qualquer mudança em `profiles`, Auth, RLS, grants, views, funções ou Storage deve considerar todos os tenants e aplicações que compartilham o projeto.

A matriz inicial de consumidores de `profiles` está em [`SUPABASE_PROFILES_IMPACT_ANALYSIS_P0B.md`](./SUPABASE_PROFILES_IMPACT_ANALYSIS_P0B.md). Ela é preliminar e não autoriza alteração da policy existente.

O desenho técnico revisável para a remediação está em [`SUPABASE_PROFILES_REMEDIATION_DESIGN_P0B.md`](./SUPABASE_PROFILES_REMEDIATION_DESIGN_P0B.md). Ele não contém uma migration executável.

Este documento não declara incidente, exploração ou correção concluída. A leitura ampla de `profiles` é um caminho de acesso confirmado pelo catálogo, mas ainda não há evidência de que tenha sido explorado.

## 2. Priorização

| ID | Área | Prioridade | Estado | Gate necessário |
| --- | --- | --- | --- | --- |
| R01 | `profiles` com `SELECT USING (true)` para `{public}` e `SELECT` de `authenticated` | P0 crítica | confirmado | impacto, minimização de campos, RLS/grants e regressão |
| R02 | `SECURITY DEFINER` e `search_path = public` | P1 alta | catálogo confirmado; risco individual pendente | triagem por função, owner, ACL, corpo e dependências |
| R03 | `EXECUTE` para `PUBLIC` | P1 alta | 101 ocorrências | separar funções públicas intencionais de funções sensíveis |
| R04 | leitura de `business-assets`/`event-assets` por bucket | P1 alta | impacto pendente | inventário de objetos e escopo esperado por tenant |
| R05 | histórico de migrations remoto ausente | P2 média | não comprovado | obter histórico ou explicar divergência |
| R06 | autorização mobile e isolamento comportamental | P0 para P0-B | não testado | ambiente controlado com fixtures e rollback |

## 3. Fase 1 — Contenção e análise de impacto (somente leitura)

### 3.1 `profiles`

Mapear, sem consultar valores pessoais:

- rotas, Server Actions, componentes, RPCs e funções que leem `profiles`;
- campos efetivamente consumidos por cada consumidor;
- dependências de `profiles` em Storage, middleware, admin, onboarding, Auth e analytics;
- campos que podem ser substituídos por DTOs mínimos ou consultas de próprio perfil;
- dependências de outros tenants e aplicações.

A análise deve separar: perfil próprio; diretório público; administração; vínculo de tenant; autorização; consentimento; atributos privados. Nenhuma policy deve ser removida antes desse mapa.

### 3.2 Funções privilegiadas

Classificar primeiro as 155 `SECURITY DEFINER` por impacto:

1. identidade, perfil, tenant e autorização;
2. favoritos, conexões, indicações e exclusão de conta;
3. Storage, mídia e conteúdo público;
4. pagamentos, contratos e funções administrativas;
5. triggers, quotas e funções internas sem exposição de API.

Para cada função, coletar owner, ACL, `search_path`, grants, argumentos, chamadores e corpo revisado sem exportar segredos. Priorizar funções executáveis por `PUBLIC`, `anon` ou `authenticated`.

### 3.3 Storage

Inventariar buckets, finalidade, classificação de objetos e consumidores. Não exportar arquivos. A policy de leitura por bucket deve ser comparada com a intenção: público, autenticado global, membro do tenant, empresa autorizada ou proprietário.

## 4. Fase 2 — Plano de correções

Para cada item, produzir uma mudança mínima e isolada:

- `profiles`: substituir leitura global por DTO/endpoint de campos mínimos; preservar consulta de próprio perfil e acessos administrativos autorizados; decidir se `user_profiles` deve ser removida, restringida ou mantida sem grants;
- grants: reduzir privilégios de `anon`, `authenticated` e `PUBLIC` somente após inventário de consumidores;
- policies: separar políticas permissivas de leitura pública, leitura própria e administração; revisar `USING` e `WITH CHECK` conjuntamente;
- funções: usar `search_path` controlado, owner adequado, grants mínimos e autorização interna baseada em `auth.uid()` e vínculos canônicos;
- Storage: aplicar escopo por bucket, tenant, empresa, proprietário e status de publicação conforme a finalidade;
- migrations: preparar rollback específico e registrar impacto por tenant/aplicação.

Não usar `service_role` no cliente nem mascarar uma alteração global como requisito exclusivamente mobile.

## 5. Fase 3 — Homologação controlada

Executar fora da produção com fixtures mínimas:

- tenant Conexão Maçônica e tenant adversarial;
- membro, admin, master com escopo limitado, usuário sem vínculo e conta excluída;
- empresa com múltiplos membros e objetos Storage públicos/privados;
- acesso anônimo, autenticado, próprio perfil, perfil de terceiro e administrador autorizado.

Testes obrigatórios:

- enumeração de `profiles` e tentativa de acessar campos administrativos;
- alteração de `role`, `tenant_id`, `status` e demais campos protegidos;
- chamadas diretas a RPCs com `user_id`, `tenant_id`, `host`, slug e UUID forjados;
- execução de funções privilegiadas por `anon`, `authenticated` e `PUBLIC`;
- leitura e escrita de Storage entre usuários, empresas e tenants;
- logout, expiração e revogação de sessão;
- regressão web e contratos mobile v1.

## 6. Fase 4 — Produção

Somente após aprovação formal:

1. confirmar Project Ref e janela de mudança;
2. aplicar uma migration ou mudança isolada por risco;
3. executar smoke tests autorizados e monitorar erros;
4. comparar grants, policies, funções e Storage com o estado esperado;
5. manter rollback específico e reversível;
6. registrar impacto observado sem expor dados pessoais.

## 7. Critérios para reabrir o gate P0-B

O gate A — segurança global — só pode ser considerado aprovado quando:

- a leitura ampla de `profiles` estiver minimizada ou formalmente justificada com campos e consumidores documentados;
- nenhum papel não autorizado enumerar perfis ou atributos de autoridade;
- funções privilegiadas em escopo tiverem `search_path`, owner, ACL e autorização revisados;
- grants `PUBLIC` sensíveis forem removidos ou justificados;
- Storage estiver classificado e testado por tenant/empresa;
- rollback e evidências de homologação estiverem aprovados.

O gate B — Conexão Maçônica — só pode ser considerado aprovado quando usuários `member`, `admin` e `master` com vínculo válido funcionarem dentro do escopo previsto, usuários de outros tenants forem bloqueados e contas inativas/deletadas não acessarem recursos privados.

Até os dois gates, o P0-B permanece em revisão técnica e a implementação mobile continua não autorizada.
