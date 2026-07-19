# Especificação do Capability Runtime — CivicOS

> _Define as regras absolutas de resolução de capacidades (capabilities), cotas, licenças e features. Este é o motor central que dita o que um tenant pode ou não fazer na plataforma. Nenhum componente deve bypassar este motor._

**Versão:** 1.0.0
**Status:** Rascunho Inicial

---

## 1. Princípios Arquiteturais da Capability Platform

1. **Agnosticismo de Domínio Comercial:** Plugins e Módulos do Sistema **NUNCA** devem referenciar nomes de planos (ex: `if (plan === 'Enterprise')`). O sistema comercial é mutável; as capacidades são estáticas.
2. **Única Fonte da Verdade:** A única maneira de validar se um recurso está disponível para um tenant é invocando o `CapabilityResolver.canTenantUse()` ou `QuotaEngine.quotaRemaining()`.
3. **Desacoplamento do Billing:** O faturamento (Billing) é apenas um mutador do estado de licença de um tenant. A Capability Platform não lida com pagamentos, notas fiscais ou gateways.

---

## 2. A Hierarquia da Capability Platform

O fluxo de resolução flui estritamente na seguinte ordem, de baixo para cima:

### Nível 1: Capability Registry
- **Responsabilidade:** Conhecer o catálogo absoluto de capabilities do sistema inteiro.
- **Não conhece:** Planos, Tenants, Cotas.
- **Modelo de Dados:**
  ```typescript
  interface CapabilityDefinition {
    id: string;         // e.g., "media:gallery"
    type: "service" | "slot" | "api";
    provider: string;   // pluginId that provides it
    requires?: string[]; // dependencies
    version: string;
  }
  ```

### Nível 2: Licensing Engine
- **Responsabilidade:** Determinar a licença exata de um tenant no momento (Plano Base + Add-ons + Overrides + Status de Pagamento/Trial).
- **Não conhece:** UI, Plugins, Lógica de Negócio.
- **Saída:** Produz um objeto determinístico `ResolvedLicense`, contendo a lista plana de capabilities liberadas e as cotas estabelecidas.

### Nível 3: Quota Engine
- **Responsabilidade:** Medir e limitar o consumo (storage, usuários, plugins ativos).
- **Comportamento:** Funciona independente das capabilities booleanas.

### Nível 4: Capability Resolver
- **Responsabilidade:** O motor central que orquestra a resolução final respondendo `true/false`.
- **Invariável (Pure Function):** O `CapabilityResolver` é um componente puro. Ele não realiza I/O, não consulta banco de dados, não chama APIs externas e não possui efeitos colaterais. Sua única responsabilidade é resolver capacidades a partir de um `ResolvedLicense` e do `CapabilityRegistry`.
- **Fluxo de Avaliação:**
  1. Verifica se a capability requisitada existe no `CapabilityRegistry`.
  2. Verifica se a capability está no pacote (`capabilities` listadas no `ResolvedLicense`).
  3. Retorna o resultado (`allowed` ou `denied`).

### Nível 5: Feature Engine
- **Responsabilidade:** Traduzir Capabilities de backend em Feature Flags de Frontend e Middleware.
- **Por que?** Evita a criação manual e desincronizada de Feature Flags. Toda feature UI deriva de uma Capability.

---

## 3. Comportamento e Resolução (CapabilityResolver)

### Regras de Precedência
O conjunto final de capacidades de um tenant (`ActiveSet`) é definido por:
```
ActiveSet = (BasePlanCapabilities U AddonCapabilities U Overrides) - SuspendedCapabilities
```
*Overrides* administrativos têm precedência absoluta (ex: liberar uma capability beta para um tenant específico sem mudar o plano dele).

### Resolução de Dependências
Se um tenant tem acesso à capability `A`, mas `A` requer `B` (e o tenant não tem `B`), o `CapabilityResolver` deve bloquear a transação ou emitir um erro crítico de inconsistência comercial (um plano não deveria ser vendido incompleto). Na prática, dependências devem ser auto-resolvidas no `LICENSE_CATALOG`.

### Cache e Invalidação
- O `ResolvedLicense` de um tenant deve ser cacheado em memória ou Redis.
- **TTL Padrão:** 15 minutos (ou conforme configuração).
- **Invalidação:** O `Billing` dispara um evento `tenant.license.updated` que força o `LicensingEngine` a evict o cache imediatamente.

### Comportamento em Falhas (Fallback)
- Se o banco de dados (Supabase) estiver inatingível durante uma consulta de licença e não houver cache:
  - **Graceful Degradation:** Assumir o plano `STARTER` (ou um modo restrito de fallback) em vez de crashar a aplicação inteira, garantindo que o tenant consiga pelo menos acessar dados básicos. Se a rota exige prioridade superior, retornar erro amigável (`503 Service Unavailable` em vez de `403 Forbidden`).

---

## 4. Evolução do Modelo de Dados

O banco de dados deve refletir essa estrutura de forma dissociada. A tabela `tenant_plans` será migrada/estruturada como:

1. `license_catalog`: Planos Base (Starter, Pro, Enterprise) e Add-ons.
2. `license_capabilities`: Mapeamento N:M (Plano X possui Capability Y).
3. `tenant_subscriptions`: Qual plano e addons um tenant assina no momento.
4. `tenant_capability_overrides`: Liberações ou bloqueios manuais pontuais por tenant.
5. `tenant_usage`: Rastreamento de métricas para o `QuotaEngine`.
