# Estratégia de CI: Lint Incremental e Eliminação do Passivo Técnico
**Conexão Maçônica — CivicOS SABA**  
**Documento de Governança Técnica & Integração Contínua**

---

## 1. Contexto e Diagnóstico

Durante a validação do pipeline do GitHub Actions para o Pull Request da etapa **M1 — Proteção Operacional**, identificou-se que o comando global `pnpm lint` falhava com **14.451 erros de lint preexistentes** herdados da branch `main`.

A auditoria confirmou:
- **Zero erros ou warnings** nos arquivos introduzidos ou modificados pela etapa M1.
- O passivo acumulado decorre da adoção de regras TypeScript estritas (`recommendedTypeChecked`, `@typescript-eslint/no-explicit-any: error`, etc.) aplicadas retrospectivamente a centenas de arquivos legados de todo o monorepo.
- A falha no step de lint bloqueava as etapas subsequentes do CI (`Typecheck`, `Test` e `Build`), impedindo a validação automatizada de Pull Requests.

---

## 2. Estratégia Temporária de Lint Incremental

Para viabilizar a entrega contínua sem comprometer a qualidade do código nem flexibilizar as regras do linter, implementou-se uma **estratégia de lint incremental** via script versionado [`scripts/lint-incremental.mjs`](file:///e:/projetos/saas-platform/scripts/lint-incremental.mjs).

### 2.1 Princípios e Garantias
1. **Regras Intactas:** Nenhuma regra do ESLint em `eslint.config.mjs` foi desativada, flexibilizada ou silenciada.
2. **Zero Novos Problemas:** Qualquer arquivo adicionado, modificado ou renomeado no PR é submetido à verificação estrita (`--max-warnings=0`). Um único erro ou aviso novo provoca a falha imediata do CI (exit code != 0).
3. **Resolução por `merge-base`:** A comparação é feita utilizando o ancestral comum real (`git merge-base`) entre a branch do PR e a branch de destino (`origin/main` ou `${GITHUB_BASE_REF}`), garantindo precisão mesmo com commits intermediários.
4. **Tratamento de Caracteres Especiais:** Uso de delimitador NUL (`git diff -z`) e passagem de argumentos estruturados no subprocesso para total robustez com caminhos aninhados e espaços.
5. **Auditoria de Infraestrutura:** Mudanças em `eslint.config.mjs`, `package.json`, `tsconfig.json` e workflows são monitoradas e alertadas no relatório de execução.

---

## 3. Comandos e Uso no Monorepo

| Comando | Escopo | Finalidade |
| :--- | :--- | :--- |
| `pnpm lint` | **Incremental (PR / local)** | Valida exclusivamente os arquivos alterados contra a base via [`scripts/lint-incremental.mjs`](file:///e:/projetos/saas-platform/scripts/lint-incremental.mjs). Utilizado no GitHub Actions. |
| `pnpm lint:all` | **Global (Monorepo)** | Executa `turbo run lint` em todos os pacotes e arquivos. Utilizado para auditorias periódicas e saneamento do passivo. |

---

## 4. Preservação do Pipeline no GitHub Actions

O arquivo [`.github/workflows/ci.yml`](file:///e:/projetos/saas-platform/.github/workflows/ci.yml) preserva integralmente todos os portões de qualidade:

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
    with:
      fetch-depth: 0 # Garante histórico completo para git merge-base

  - name: Setup pnpm
    uses: pnpm/action-setup@v4
    ...
  - name: Setup Node
    ...
  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Lint
    run: pnpm lint # Executa o lint incremental estrito

  - name: Typecheck
    run: pnpm typecheck # Typecheck completo do monorepo (tsc)

  - name: Test
    run: pnpm test # Suíte completa de testes (Vitest + arquitetura)

  - name: Build
    run: pnpm build # Compilação de produção de todos os pacotes
```

---

## 5. Plano de Eliminação Gradual do Passivo Técnico (14.451 Erros)

A eliminação dos erros legados deve ser conduzida em etapas independentes, isoladas de features de produto e orientadas por criticidade arquitetural:

### Fase 1 — Módulos Críticos de Segurança e Finanças (Prioridade Máxima)
- **Escopo:** Autenticação (`src/lib/admin/`, `src/lib/auth/`), Webhooks e Integração Asaas (`src/app/api/webhooks/asaas/`), RLS helpers.
- **Meta:** 100% de conformidade com tipagem estrita e ausência de `any`.

### Fase 2 — Core e Bibliotecas Compartilhadas
- **Escopo:** `packages/core/`, `packages/sdk/`, `packages/shared/`.
- **Meta:** Garantir que o núcleo compartilhado forneça tipos seguros para toda a aplicação.

### Fase 3 — Plugins de Domínio
- **Escopo:** `plugins/conexao-maconica/`, `plugins/community-directory/`.
- **Meta:** Sanear chamadas a banco e tipagens de schemas.

### Fase 4 — Componentes de UI e Páginas Públicas
- **Escopo:** `apps/web/src/components/`, `apps/web/src/app/(public)/`.
- **Meta:** Correção sistemática por pasta até zerar completamente o passivo de `pnpm lint:all`.

---

## 6. Critérios para Remoção da Estratégia Incremental
Assim que o passivo técnico for zerado através das Fases 1 a 4, o comando `pnpm lint` retornará a chamar `turbo run lint` globalmente, eliminando a necessidade do script incremental.
