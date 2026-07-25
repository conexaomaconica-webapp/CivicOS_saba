# Sprint 1.0E - Supabase Type Safety

Substituição da tipagem temporária `Database = any` por um schema de tipos TypeScript gerado estaticamente a partir das migrações SQL da aplicação. Isso garantirá segurança de tipos em tempo de compilação em todas as queries e rotas do Supabase, atendendo aos padrões de qualidade da Sprint da Fundação.

## Diretivas de Execução

1. **Geração dos tipos baseados em migrations**:
   - Usar as migrations como fonte de verdade.
   - Ordem prioritária de geração:
     1. Tentar iniciar o Supabase local (`supabase start`).
     2. Aplicar todas as migrations (`supabase db reset`).
     3. Gerar os tipos (`supabase gen types typescript --local > apps/web/src/types/database.types.ts`).
     4. Se o ambiente Docker local não estiver disponível/funcional, leremos detalhadamente as migrations para construir manualmente o arquivo `database.types.ts` simulando perfeitamente a saída oficial do gerador do Supabase (incluindo todas as tabelas, views, enums, relacionamentos de chaves estrangeiras), sem limitar o escopo a uma lista parcial de tabelas.
2. **Tratamento de arquivo gerado**:
   - O arquivo `database.types.ts` será tratado as artefato gerado. Não faremos edições manuais para mascarar erros de TypeScript no código consumidor; quaisquer correções de estrutura no banco devem ser refletidas nas migrations e o arquivo de tipo regenerado.
3. **Auditoria de bypasses de tipagem**:
   - Buscar e auditar todos os clientes Supabase (browser, server, middleware, rotas, repositories e actions).
   - Eliminar `eslint-disable` globais, `as any`, `@ts-ignore`, e `@ts-expect-error` usados para contornar tipagens do banco.
   - Garantir que todos usem `SupabaseClient<Database>` ou equivalentes.

## Critérios de Aceite da Sprint 1.0E

- **AC01** — `database.types.ts` não contém `any` como tipo raiz.
- **AC02** — O tipo `Database` contempla todas as tabelas das migrations aplicadas.
- **AC03** — Browser client, server client e middleware usam o mesmo `Database`.
- **AC04** — Queries para tabelas válidas possuem inferência de `Row`, `Insert` e `Update`.
- **AC05** — Consultar uma tabela inexistente provoca erro de TypeScript.
- **AC06** — Inserir um campo inexistente provoca erro de TypeScript.
- **AC07** — Campos nullable e opcionais correspondem ao schema SQL.
- **AC08** — Chaves estrangeiras e `Relationships` são geradas corretamente.
- **AC09** — Não existem `eslint-disable` globais.
- **AC10** — Não existem `as any` usados para contornar o Supabase.
- **AC11** — `pnpm typecheck` termina com exit code 0.
- **AC12** — `pnpm lint` termina com exit code 0.
- **AC13** — `pnpm build` termina com exit code 0.
- **AC14** — `pnpm test` termina com exit code 0.
- **AC15** — `pnpm verify` termina com exit code 0.

## Open Questions

> [!NOTE]
> Se o ambiente de Docker/Supabase local estiver inacessível devido a restrições de privilégios ou indisponibilidade do daemon do Docker na máquina host, prosseguiremos com a geração manual simulada de `database.types.ts` correspondendo estritamente ao schema SQL das migrations de forma a atingir a fidelidade de 100%.

## Proposed Changes

---

### Core Database Types

#### [MODIFY] [database.types.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/saas-platform/apps/web/src/types/database.types.ts)
- Substituir a definição provisória por tipos de bancos gerados (via CLI ou gerados estritamente correspondendo a todas as tabelas e relacionamentos descritos no SQL).

---

### Middleware & Route Protection

#### [MODIFY] [middleware.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/saas-platform/apps/web/src/middleware.ts)
- Remover comentários de escape do linter e usar tipagem forte baseada no `Database`.

---

### Configurações de Administrador

#### [MODIFY] [page.tsx (admin/settings)](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/saas-platform/apps/web/src/app/admin/settings/page.tsx)
- Corrigir a tipagem de estados como `tenant` para derivarem de `Database['public']['Tables']['tenants']['Row']`, eliminando casts e inconsistências.

## Verification Plan

### Automated Tests
- Executar `pnpm run typecheck` na aplicação para validar os tipos.
- Executar testes negativos (comprovando que consultas ou inserções em tabelas ou colunas inexistentes acusam erros de compilação TypeScript).
- Executar `pnpm verify` completo e registrar a saída.

### Manual Verification
*Se o ambiente/conexão de banco não estiver operacional localmente, será explicitamente relatado: "Verificação manual não executada por ausência de ambiente/configuração."* Caso contrário, testaremos manualmente:
- Resolução do tenant pelo subdomínio.
- Carregamento das configurações do tenant e login.
- Painel de administrador e listagem/criação/edição de empresas.
- Junções e queries com avaliações (`business_reviews`).
- Comportamento do middleware em domínios válidos/inválidos.
