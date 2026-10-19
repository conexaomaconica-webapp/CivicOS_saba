# Conexão Maçônica — Prontidão P0 para Pré-produção

Status: pronto para revisão de implantação; nenhuma operação remota autorizada ou executada.

## Escopo revisado

As migrations locais 205–212 foram aplicadas somente no PostgreSQL local. A sequência cobre compatibilidade de planos, resolução fail-closed de tenant, contrato público de plano, assinaturas ambíguas, remoção da leitura global de `profiles`, hardening de autorização, trigger de autoridade e `search_path` das quotas.

O contrato público agora diferencia:

- `contracted_plan_code`: valor comercial persistido em `businesses.plan_tier`;
- `effective_plan_code`: plano derivado de uma assinatura elegível única;
- `effective_access`: acesso efetivo; falso quando não há assinatura elegível ou quando há ambiguidade.

Não há downgrade automático nem alteração automática de publicação/status da empresa.

## Evidências locais

| Verificação | Resultado |
| --- | ---: |
| Teste 040 | 54/54 |
| Teste 042 | 15/15 |
| Teste 105 | 6/6 |
| Teste 107 | 10/10 |
| Teste 108 | 4/4 |
| Teste 110 | 3/3 |
| Teste 204 | 13/13 |
| Teste 205 | 10/10 |
| Total SQL | 115/115 |
| Vitest direcionado | 20/20 |
| TypeScript Web | aprovado |
| `git diff --check` | aprovado |
| Vitest Web em 4 lotes | 144/144 arquivos, lotes com exit code 0 |

Os testes locais cobrem perfis, isolamento, planos, quotas, benefícios, onboarding, administração e RSVP. Não existe atualmente um arquivo SQL separado de homologação de eventos; RSVP possui cobertura Vitest.

## Pontos de implantação

Antes de qualquer aplicação remota, é obrigatório comparar o catálogo/migrations efetivos do projeto oficial com o local. Essa comparação não foi feita nesta etapa por restrição de acesso remoto.

Sequência proposta: backup/catalogação; aplicação 205–212 em janela controlada; smoke tests de RPC, RLS, login, perfis, Guia, planos, quotas e RSVP; monitoramento; interrupção se houver erro de autorização, queda de RPC pública ou regressão comercial.

Rollback deve ser funcional e controlado por migration revisada. Não restaurar policy global de leitura de `profiles` como mecanismo de recuperação.

## Parecer dos gates

**Gate A — Segurança global:** evidências locais aprovadas, mas aprovação formal pendente da comparação com o catálogo remoto e da revisão de impacto da remoção da policy global de `profiles`.

**Gate B — Conexão Maçônica:** cenários locais aprovados para o tenant e contratos comerciais; aprovação formal pendente da mesma validação remota e dos smoke tests pós-implantação.

Produção permanece sem alterações. A implantação, merge e deploy continuam não autorizados.

## Compatibilidade remota pendente

Foi preparado o script [P0_PREPROD_READONLY_CATALOG.sql](../../supabase/audits/P0_PREPROD_READONLY_CATALOG.sql) para futura execução autorizada. Ele consulta apenas catálogo, policies, grants, assinaturas de funções, domínios, dependências e triggers; não retorna perfis, e-mails, tokens, documentos ou outros dados pessoais.

O inventário detalhado está em [P0_PRE_PRODUCTION_MIGRATION_INVENTORY.md](./P0_PRE_PRODUCTION_MIGRATION_INVENTORY.md). A migração local 209 exige revisão específica dos consumidores sociais e da view `user_profiles`; 210/211 exigem validação dos fluxos de primeiro acesso, consentimento, exclusão lógica e administração.

Ainda dependem de autorização: executar o catálogo no remoto, comparar histórico/schema, aplicar migrations, realizar smoke tests pós-implantação, rollback, deploy ou merge.

## Parecer de segurança do script READ-ONLY

O script foi revisado integralmente. Ele contém apenas consultas de catálogo e metadados, sem DDL, DML, grants, alterações de policy, criação de objetos, chamadas a RPCs de negócio ou leitura de registros de usuários. A execução está protegida por `BEGIN`, `SET TRANSACTION READ ONLY`, `statement_timeout`, `lock_timeout` e `ROLLBACK`.

O script retorna somente nomes/atributos de schema, histórico disponível, policies, grants, assinaturas de funções, domínios verificados, dependências e triggers. Não seleciona e-mails, tokens, senhas, documentos ou corpos de funções. A tabela `supabase_migrations.schema_migrations` é detectada antes e nunca é referenciada diretamente quando ausente; nesse caso, o relatório registra a ausência e continua com o catálogo de objetos.

Parecer: **apto para revisão do responsável e futura execução controlada**, ainda não autorizado para conexão remota.
