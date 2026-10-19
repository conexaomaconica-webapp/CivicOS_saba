# Testes de Homologação — Remediação de `public.profiles` (P0-B)

> **Status:** plano executável somente em homologação; nenhuma execução em produção autorizada.  
> **Draft associado:** [`supabase/audits/p0b_profiles_remediation_homologation_draft.sql`](../../supabase/audits/p0b_profiles_remediation_homologation_draft.sql).

## 1. Fixtures

Criar contas e registros sintéticos, sem reutilizar os dados reais das duas empresas:

- tenant da Conexão Maçônica e tenant adversarial;
- `member` ativo, `admin` ativo, `master` com escopo documentado;
- usuário sem vínculo, conta suspensa/deletada e sessão expirada;
- duas empresas de teste com membros e objetos Storage públicos/privados.

## 2. Matriz de aceite

| Cenário | Esperado |
| --- | --- |
| `anon` consulta `profiles` | zero linhas/negado |
| member lê próprio perfil | permitido somente pelo canal aprovado |
| member lê perfil de terceiro no mesmo tenant | negado |
| member lê perfil de outro tenant | negado |
| member tenta ler `role`, `tenant_id`, `status`, `rhid` de terceiro | negado |
| member atualiza nome/telefone/cidade/UF/avatar próprios | permitido após validação |
| member altera `role`, `tenant_id`, `status` ou `rhid` | negado; trigger e `WITH CHECK` preservados |
| admin consulta usuários do tenant autorizado | permitido somente pelo serviço administrativo e escopo válido |
| admin consulta outro tenant | negado |
| master consulta escopo global | somente conforme regra oficial documentada |
| conta suspensa/deletada usa operação privada | negado |
| RPC recebe `user_id`, host ou tenant forjado | ignora/rejeita e não cruza escopo |
| projeção pública | somente nome/avatar consentidos; sem PII ou autoridade |
| Storage entre tenants | leitura/escrita negada fora do escopo |
| Web perfil, middleware, admin, LGPD e Storage | regressão aprovada |

## 3. Verificações de grants e views

Após a Fase 1, reexportar `01_relations_rls`, `02_policies`, `03_table_grants`, `04_views_metadata`, `05_functions_metadata` e `06_function_grants`. Confirmar que:

- a policy `Allow authenticated read profiles` não existe;
- não há `SELECT` anônimo;
- não há policy permissiva equivalente com outro nome;
- a view pública não herda campos administrativos;
- funções privilegiadas não fornecem caminho alternativo para enumeração;
- `PUBLIC` não executa funções sensíveis sem justificativa.

## 4. Regressão dos consumidores atuais

Executar typecheck e suítes Web, além dos testes de contrato mobile v1. Validar manualmente login, perfil próprio, administração, LGPD, Storage, Mural, favoritos, conexões e cadastro das duas empresas reais sem modificar seus dados.

## 5. Critério de aprovação

A Fase 1 só é aprovada se a leitura ampla cessar, o perfil próprio continuar funcional, nenhum tenant cruzado for acessível e a Web não apresentar regressão crítica. A Fase 2 de grants por coluna exige aprovação separada.

