# Lista de Anti-Padrões (O que é PROIBIDO) — CivicOS

> _Este documento define explicitamente práticas arquiteturais proibidas no
> desenvolvimento do CivicOS. Qualquer PR ou sugestão de IA contendo estas
> práticas deve ser rejeitada imediatamente._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 🚫 1. Acoplamento de Plugins

### ❌ Anti-Padrão: Importar arquivos de outro plugin
* **Por que é proibido?** Impede a desativação ou remoção de um plugin sem quebrar os outros. Cria dependências circulares insolúveis.
* **Exemplo Proibido:**
  ```typescript
  import { BusinessCard } from '@saas/plugin-business-directory/components';
  ```
* **Alternativa Correta:** Usar o `ExtensionPointRegistry` para renderizar o componente por meio de um slot ou emitir um evento.

---

## 🚫 2. Poluição do Kernel (Core)

### ❌ Anti-Padrão: Importar lógica de plugin no Core
* **Por que é proibido?** O Core deve permanecer domain-oblivious (ADR-023). Inserir conceitos de negócio no Core impede o reuso do framework em outros nichos.
* **Exemplo Proibido:**
  ```typescript
  // Dentro de packages/core
  import { Listing } from '@saas/plugin-business-directory';
  ```
* **Alternativa Correta:** Usar contratos genéricos e injeção de dependências (DI) via `Container`.

---

## 🚫 3. Acesso Direto a Bancos de Dados & APIs na UI

### ❌ Anti-Padrão: Chamar Supabase diretamente na UI sem passar por Repositories ou APIs do Plugin
* **Por que é proibido?** Viola a regra de API-First (ADR-017). Se alterarmos a estrutura da tabela do banco de dados, quebraremos a UI. Além disso, dificulta a depuração e o cache.
* **Exemplo Proibido:**
  ```typescript
  const { data } = await supabase.from('businesses').select('*');
  ```
* **Alternativa Correta:** Resolver um serviço de repositório pelo DI container do plugin ou chamar uma rota de API do plugin.

---

## 🚫 4. Bypass de Licenciamento & Segurança

### ❌ Anti-Padrão: Criar Feature Flags locais ou fora do Licensing Engine
* **Por que é proibido?** Fragmenta as regras de negócio e licenciamento do sistema. O faturamento não consegue controlar quais recursos o inquilino ativou.
* **Exemplo Proibido:**
  ```typescript
  const showBanner = process.env.NEXT_PUBLIC_SHOW_BANNERS === 'true';
  ```
* **Alternativa Correta:** Perguntar ao `LicensingEngine` se a capability está ativa.

### ❌ Anti-Padrão: Modificar arquivos de migração SQL antigos em produção
* **Por que é proibido?** Quebra a integridade do banco de dados e impede migrações limpas em staging/produção.
* **Alternativa Correta:** Criar uma nova migration SQL incremental sob numeração sequencial subsequente (ex: `005_update_listings.sql`).

---

## 🚫 5. bypass de Roteamento

### ❌ Anti-Padrão: Criar páginas hardcoded fora do Route Registry
* **Por que é proibido?** Impede que o Middleware intercepte e aplique checagem de capabilities ou RBAC automaticamente na requisição.
* **Alternativa Correta:** Registrar a rota na pasta `manifest/routes.json` do plugin.
