# System Master Specification — CivicOS

> _A constituição da plataforma. Toda decisão de código deve ser rastreável a
> um princípio declarado neste documento._

**Versão:** 1.0.0
**Status:** Ratificado
**Última Revisão:** 2026-07-16

---

## 1. Missão

O **CivicOS** é um framework SaaS Operating System projetado para comunidades
estruturadas — associações comerciais, diretórios profissionais, clubes de
benefícios, entidades maçônicas e redes de cooperação local.

Ele não é uma aplicação. Ele é o **sistema operacional** sobre o qual aplicações
(plugins) são construídas, instaladas, licenciadas e compostas dinamicamente
para cada inquilino (tenant).

---

## 2. Topologia de Camadas

```mermaid
graph TD
    subgraph "Camada 3: PLUGINS (Produtos Isolados)"
        P1["Guia Comercial"]
        P2["Diretório Maçônico"]
        P3["Marketplace"]
        P4["Eventos"]
        P5["CRM"]
    end

    subgraph "Camada 2: PLATFORM (Serviços Oficiais)"
        S1["Auth & RBAC"]
        S2["Licensing Engine"]
        S3["Billing Engine"]
        S4["Capability Registry"]
        S5["Route & UX Registries"]
        S6["Feature Flags"]
        S7["Analytics"]
        S8["Jobs & Scheduler"]
    end

    subgraph "Camada 1: KERNEL (Sistema Operacional)"
        K1["DI Container"]
        K2["EventBus"]
        K3["Plugin Registry"]
        K4["Plugin Lifecycle"]
        K5["Manifest Loader"]
        K6["Middleware Pipeline"]
        K7["Configuration"]
    end

    P1 & P2 & P3 & P4 & P5 -->|"Consome e Implementa"| S4
    S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 -->|"Orquestra via"| K1 & K2 & K3
```

**Regra de Dependência:** As setas apontam estritamente de cima para baixo.
Nenhuma camada inferior pode importar ou referenciar uma camada superior.

```
Plugins   → conhecem Platform e Kernel (via contratos)
Platform  → conhece Kernel (via contratos)
Kernel    → não conhece ninguém acima
```

---

## 3. As 7 Invariantes do Sistema

Estas são as leis invioláveis do CivicOS. Qualquer código que viole uma dessas
invariantes deve ser rejeitado, independente de quem o escreveu.

### Invariante 1: Kernel é Domain-Oblivious
O Kernel não contém, importa ou referencia nenhuma entidade de domínio de
negócio. Ele opera exclusivamente sobre abstrações universais: `Entity`,
`Schema`, `Plugin`, `Route`, `Event`, `Command`, `Permission`.

**Referência:** ADR-011, ADR-023

### Invariante 2: Plugins Nunca Importam Plugins
Um plugin não pode ter dependência direta (import) de outro plugin. Toda
comunicação inter-plugin acontece via EventBus ou resolução de serviços no
DI Container.

**Referência:** ADR-003, Princípio 2

### Invariante 3: Platform Não Conhece Entidades de Domínio
Serviços da Platform (Auth, Billing, Licensing) nunca referenciam conceitos
específicos como "Empresa", "Loja", "Evento". Eles operam sobre abstrações:
"Entidade", "Recurso", "Módulo", "Capability".

**Referência:** ADR-005, ADR-023

### Invariante 4: Todo Dado Respeita RLS por `tenant_id`
Toda tabela do banco de dados que contém dados multi-tenant possui:
- Uma coluna `tenant_id UUID REFERENCES tenants(id)`
- Uma política RLS ativa que filtra por `tenant_id`
- Índice na coluna `tenant_id`

**Referência:** ADR-002, Princípio 4

### Invariante 5: Toda Rota Pública Passa pelo Route Registry
Nenhuma rota pública pode existir hardcoded no diretório `app/` do Next.js sem
estar registrada no Route Registry de um plugin. O Middleware consulta o Route
Registry para validar permissões antes de renderizar.

**Referência:** ADR-029

### Invariante 6: Toda Funcionalidade Vendável é uma Capability
Se uma funcionalidade pode ser ligada, desligada, vendida como add-on ou
diferenciada entre planos, ela **deve** ser modelada como uma Capability no
catálogo oficial (`04_CAPABILITY_CATALOG.md`).

**Referência:** ADR-028

### Invariante 7: Todo Estado de Plugin Segue a State Machine
Plugins transitam por estados definidos (`installed` → `migrated` → `licensed`
→ `configured` → `active` → `public`). Nenhum plugin pode pular estados.

**Referência:** ADR-026

---

## 4. Modelo de Multi-Tenancy

```mermaid
sequenceDiagram
    participant U as Usuário
    participant MW as Middleware
    participant TR as Tenant Resolver
    participant DB as Supabase (RLS)
    participant App as Aplicação

    U->>MW: GET florianopolis.civicos.com.br/guia
    MW->>TR: extractSubdomain("florianopolis")
    TR->>DB: SELECT id FROM tenants WHERE slug = 'florianopolis'
    DB-->>TR: tenant_id = "abc-123"
    TR-->>MW: x-tenant-id: abc-123
    MW->>App: Request com tenant resolvido
    App->>DB: SELECT * FROM businesses WHERE tenant_id = 'abc-123'
    Note over DB: RLS filtra automaticamente
    DB-->>App: Dados isolados do tenant
```

**Estratégias de resolução de tenant (em ordem de prioridade):**
1. Subdomínio HTTP (`florianopolis.civicos.com.br`)
2. Header customizado (`x-tenant-id`)
3. Cookie (`tenant_id`)
4. Fallback de desenvolvimento (`florianopolis` em localhost)

---

## 5. Ciclo de Vida do Plugin

```mermaid
stateDiagram-v2
    [*] --> installed : Código presente no monorepo
    installed --> migrated : Migrações SQL executadas
    migrated --> licensed : Tenant adquiriu licença
    licensed --> configured : Admin preencheu config obrigatória
    configured --> active : Plugin inicializado pelo Kernel
    active --> public : Rotas públicas expostas
    public --> disabled : Admin desativou temporariamente
    disabled --> active : Admin reativou
    active --> error : Falha em runtime
    error --> active : Recuperação automática
    disabled --> [*] : Uninstall
```

**Regras de transição:**
- Não é possível pular de `installed` para `active`
- `public` requer que todas as capabilities `requires` estejam satisfeitas
- `disabled` preserva dados — é reversível
- `error` dispara notificação ao admin do tenant

---

## 6. Estratégia de Expansão

```mermaid
timeline
    title Roadmap de Produtos (Plugins)
    section Fase 1 - Fundação
        Guia Comercial : Plugin business-directory
        : Primeiro produto comercial
        : Valida arquitetura de plugins
    section Fase 2 - Expansão Vertical
        Diretório Maçônico : Plugin masonic-directory
        Clube de Benefícios : Plugin benefits-club
        : Prova que múltiplos nichos coexistem
    section Fase 3 - Expansão Horizontal
        Marketplace : Plugin marketplace
        Eventos : Plugin events
        CRM : Plugin crm
        : Plataforma se torna ecossistema
    section Fase 4 - Comunidade
        SDK Público : Desenvolvedores externos
        Plugin Store : Marketplace de plugins
        : CivicOS se torna plataforma aberta
```

---

## 7. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Runtime** | Node.js 20+ | LTS, performance, ecossistema |
| **Framework Web** | Next.js 15 (App Router) | SSR, RSC, Edge Runtime |
| **Linguagem** | TypeScript (strict mode) | Type-safety para DI e contratos |
| **Banco de Dados** | PostgreSQL via Supabase | RLS nativo, Auth integrado, Realtime |
| **Monorepo** | Turborepo + pnpm | Cache, builds paralelos, workspaces |
| **Mobile** | Capacitor | PWA → nativo sem reescrever |
| **Testes** | Vitest | Rápido, TypeScript nativo |
| **CI/CD** | GitHub Actions | Integração com monorepo |

---

## 8. Glossário Oficial

| Termo | Definição |
|---|---|
| **Kernel** | Camada mais baixa. Sistema operacional do CivicOS. Nunca contém lógica de negócio. |
| **Platform** | Serviços oficiais transversais (Auth, Billing, Licensing). Utiliza o Kernel. |
| **Plugin** | Produto isolado. Encapsula um domínio de negócio completo. |
| **Capability** | Unidade atômica de funcionalidade vendável, ligável ou composta. |
| **Registry** | Catálogo em memória onde plugins registram extensões. |
| **Extension Point** | Local oficial no Core onde plugins podem se encaixar (slot, hook). |
| **Manifest** | Conjunto de arquivos JSON declarativos que descrevem um plugin. |
| **Tenant** | Inquilino. Uma instância isolada da plataforma com seus dados e configurações. |
| **Capability Pack** | Pacote comercial que agrupa capabilities para venda. |
| **Slot** | Ponto nomeado na UI onde widgets de plugins são renderizados. |
| **State Machine** | Autômato finito que controla os estados do ciclo de vida de um plugin. |
