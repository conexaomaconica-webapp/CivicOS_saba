# Princípios Arquiteturais do CivicOS

> _Estes princípios são as leis fundamentais que protegem o ecossistema contra
> o acoplamento, a complexidade acidental e a degradação arquitetural._

**Versão:** 2.0.0 (evolução do `01_CORE_PRINCIPLES.md`)
**Status:** Ratificado

---

## Princípio 1: Contenção e Isolamento do Core

O pacote `@saas/core` é o Kernel do sistema. Ele gerencia ciclo de vida,
injeção de dependências, roteamento de eventos, compilação de middleware e
definição de contratos.

**Regra:** O Core não contém regras específicas de diretórios, agendamentos,
comércios ou qualquer outro domínio de negócio.

**Serviços de infraestrutura** como Auth (verificação de identidade), Billing
(processamento de pagamentos) e Storage residem na camada Platform, expostos
via contratos abstratos. Suas implementações concretas são fornecidas por
adaptadores.

---

## Princípio 2: Isolamento Estrito de Plugins (Loose Coupling)

- **Sem imports diretos:** Plugins **nunca** importam módulos de outros plugins.
  - ❌ `import { BusinessModel } from '../../plugin-business-directory'`
  - ✅ `context.getService(SEARCH_REGISTRY).search(query)`

- **Interação por contratos:** Se o Plugin A precisa de informação do Plugin B,
  ele usa um serviço do DI Container ou dispara um evento tipado.

- **Comunicação assíncrona:** Operações de longa duração ou com efeitos
  colaterais usam o EventBus. Quando um pagamento é confirmado, o Core emite
  `billing.payment.confirmed` e os plugins relevantes reagem.

---

## Princípio 3: Hierarquia de Reusabilidade

Se uma funcionalidade é usada por **mais de um** plugin, ela deve ser promovida:

| Escopo | Destino |
|---|---|
| Helpers de domínio, monads (Result) | `@saas/shared` |
| Repositórios SQL | `@saas/database` |
| Importação CSV/Excel | `@saas/importer` |
| Background runners | `@saas/jobs` |
| Configuração e temas | `@saas/config` |
| UI Components compartilhados | `@saas/ui` |

---

## Princípio 4: Compliance Multi-Tenant

- **Sem queries cross-tenant:** Toda consulta ao banco filtra por `tenant_id`.
- **Injeção de contexto:** Plugins usam o `TenantContext` resolvido pelo Core.
  Nunca consultam headers HTTP ou subdomínios diretamente.
- **RLS obrigatório:** Toda tabela com `tenant_id` tem Row-Level Security ativo.

---

## Princípio 5: Composição por Slots

A interface do usuário do CivicOS **não possui telas fixas**. Ela possui
**slots nomeados** que são preenchidos dinamicamente pelos registros de
componentes dos plugins.

```
Home Page = SlotRenderer("HOME_TOP_BANNER")
          + SlotRenderer("HOME_SEARCH")
          + SlotRenderer("HOME_FEATURED")
          + SlotRenderer("HOME_NEWS")
          + SlotRenderer("HOME_FOOTER")

Dashboard = SlotRenderer("DASHBOARD_QUICK_ACTION")
          + SlotRenderer("DASHBOARD_CARD")
          + SlotRenderer("DASHBOARD_GRAPH")
          + SlotRenderer("DASHBOARD_WIDGET")
```

Se nenhum plugin registra conteúdo para um slot, ele simplesmente não renderiza.

---

## Princípio 6: Capability-First

O ecossistema não pergunta _"O Plugin X está instalado?"_

O ecossistema pergunta _"Alguém fornece a Capability Y?"_

```typescript
// ❌ Errado — acopla ao plugin específico
if (pluginRegistry.has('business-directory')) { ... }

// ✅ Correto — pergunta pela capability
if (capabilityRegistry.hasCapability('search:provider')) { ... }
```

Isso permite que **múltiplos plugins** forneçam a mesma capability. A busca
global pode agregar resultados do Guia Comercial, do Diretório Maçônico e do
Marketplace — todos fornecendo `search:provider`.

---

## Princípio 7: Plugin State Machine

Plugins não estão simplesmente "ligados" ou "desligados". Eles transitam por
uma máquina de estados com 8 estados explícitos:

```
installed → migrated → licensed → configured → active → public
                                                  ↕
                                               disabled
                                                  ↕
                                                error
```

Cada transição é validada. Não é possível pular de `installed` para `public`.
Cada estado habilita um conjunto específico de funcionalidades.

---

## Princípio 8: Manifest Split

Cada aspecto de um plugin é declarado em **arquivo de manifesto próprio** dentro
do diretório `manifest/`:

```
manifest/
├── routes.json       → Rotas públicas e protegidas
├── permissions.json  → Permissões RBAC
├── navigation.json   → Itens de menu
├── widgets.json      → Cards, gráficos, slots UI
├── capabilities.json → provides / requires
├── schemas.json      → Entidades e campos
├── events.json       → publishes / consumes
├── settings.json     → Configurações editáveis
├── commands.json     → Command palette entries
└── jobs.json         → Background jobs
```

O `plugin.json` raiz contém apenas metadados essenciais (id, nome, versão,
autor, licença, dependências).

---

## Princípio 9: Documentação Primeiro

> **Nenhuma linha de código pode existir sem que exista antes um contrato
> arquitetural correspondente.**

Fluxo obrigatório:
1. Criar ou atualizar o ADR (se necessário)
2. Atualizar a especificação correspondente (Capability, Registry, Manifest)
3. Validar se respeita a Constituição da plataforma
4. Só então implementar o código

---

## Princípio 10: Extensão por Extension Points

O Core declara **oficialmente** onde plugins podem se encaixar. Plugins não
podem inventar novos pontos de extensão — eles usam os que o Core oferece.

**Extension Points oficiais:**

| Área | Slots |
|---|---|
| **Home** | `HOME_TOP_BANNER`, `HOME_SEARCH`, `HOME_NEWS`, `HOME_FEATURED`, `HOME_FOOTER`, `HOME_SIDEBAR` |
| **Dashboard** | `DASHBOARD_CARD`, `DASHBOARD_WIDGET`, `DASHBOARD_SHORTCUT`, `DASHBOARD_GRAPH`, `DASHBOARD_QUICK_ACTION` |
| **Sistema** | `NAVIGATION`, `SEARCH`, `NOTIFICATIONS`, `SETTINGS`, `REPORTS`, `EXPORTS`, `IMPORTS` |
| **Avançado** | `MAPS`, `AI`, `BILLING`, `AUTH`, `AUTOMATION`, `WIDGETS`, `PUBLIC_PAGES`, `ADMIN_PAGES` |

Novos Extension Points requerem um ADR com aprovação.
