# Filosofia Central do CivicOS

> _"O CivicOS não é uma aplicação. É um sistema operacional para comunidades."_

Este documento define as leis filosóficas fundamentais que governam toda decisão
de arquitetura, implementação e evolução do ecossistema CivicOS. Qualquer agente
de IA ou desenvolvedor humano **deve ler este arquivo antes de escrever uma única
linha de código**.

---

## O que é o Kernel?

O Kernel é o **sistema operacional**. Ele provê a infraestrutura mínima e
universal para que qualquer combinação de serviços e produtos funcione.

O Kernel **nunca muda** para atender um plugin específico. Se uma funcionalidade
requer alteração no Kernel, ela provavelmente não pertence ao Kernel.

**O Kernel contém:**
- Container de Injeção de Dependências (DI)
- Barramento de Eventos (EventBus)
- Registro de Plugins (PluginRegistry)
- Ciclo de Vida e Máquina de Estados (PluginLifecycle)
- Carregador de Manifestos (ManifestLoader)
- Pipeline de Middleware (MiddlewarePipeline)
- Agendador de Tarefas (Scheduler)
- Gerenciador de Configuração (Configuration)

**O Kernel NÃO contém:**
- Nenhuma entidade de domínio (Empresa, Loja, Evento, Produto, Documento)
- Nenhuma regra de negócio específica de qualquer nicho
- Nenhuma referência a tabelas de banco de dados de plugins

---

## O que é a Platform?

A Platform é a camada de **serviços oficiais** que utiliza o Kernel para prover
funcionalidades transversais. Esses serviços são consumidos por plugins, mas
nunca conhecem os domínios dos plugins.

**A Platform contém:**
- Autenticação e Autorização (Auth & RBAC)
- Faturamento e Cobrança (Billing Engine)
- Licenciamento e Capacidades (Licensing Engine)
- Analítica e Observabilidade (Analytics)
- Filas de Tarefas em Background (Jobs)
- Flags de Funcionalidades (Feature Flags)
- SDK Público para Integrações

**A Platform NÃO contém:**
- Lógica de renderização de telas
- Conhecimento de quais plugins existem
- Referências a entidades de domínio de qualquer plugin

---

## O que é um Plugin?

Um Plugin é um **produto isolado** que encapsula toda a lógica de um domínio de
negócio. Ele se registra no Kernel declarando suas capacidades, rotas, widgets,
menus e permissões através de manifestos.

**O Core nunca sabe quais plugins existem.** Ele apenas pergunta:
```
registry.getRoutes()
registry.getCapabilities()
registry.getWidgets()
```
E monta tudo dinamicamente.

**Exemplos de plugins:**
- Guia Comercial (Business Directory)
- Diretório Maçônico (Masonic Directory)
- Marketplace
- CRM
- Eventos
- Cursos
- Documentos

---

## O que é uma Capability?

A Capability é a **unidade atômica de funcionalidade** no CivicOS. Ela é o
conceito mais importante do ecossistema.

**O Plugin nunca pergunta:** _"Qual plano o tenant possui?"_

**O Plugin pergunta:** _"Tenho a Capability X?"_

```typescript
const hasBanner = useCapability('banner:basic');
if (!hasBanner) return <UpgradeCTA />;
```

Isso inverte completamente o controle. O Billing não vende "Plugin do Guia" —
ele vende **conjuntos de capacidades** (Capability Sets). O mesmo plugin pode
operar em três faixas de preço diferentes, simplesmente ligando ou desligando
chaves de Capability no Licensing Engine.

**Regra absoluta:** Toda funcionalidade vendável, desligável ou composta
independentemente **é** uma Capability.

---

## O que é um Registry?

Um Registry é um **catálogo em memória** onde plugins registram extensões que o
Core monta dinamicamente. Ele é populado durante o bootstrap da aplicação a
partir dos manifestos dos plugins ativos.

**Regra:** Se mais de um plugin precisa contribuir para o mesmo ponto de
extensão, existe um Registry para isso.

**Exemplos:**
- `RouteRegistry` → Plugins registram rotas → Core monta o roteador
- `CapabilityRegistry` → Plugins declaram provides/requires → Core valida
- `WidgetRegistry` → Plugins registram cards → Dashboard Engine monta
- `NavigationRegistry` → Plugins registram menus → Shell monta sidebar
- `SearchRegistry` → Plugins registram SearchProviders → Busca global agrega

---

## O que nunca pertence ao Core?

Qualquer conceito que responda a uma pergunta de negócio **nunca** pertence ao
Core:

| Conceito | Pertence ao... |
|---|---|
| Empresa, Anúncio, Banner | Plugin `business-directory` |
| Loja Maçônica, Potência, Rito | Plugin `masonic-directory` |
| Pedido, Produto, Carrinho | Plugin `marketplace` |
| Evento, Agenda, Inscrição | Plugin `events` |
| Contato, Lead, Pipeline | Plugin `crm` |

O Core conhece apenas abstrações universais: `Entity`, `Schema`, `Repository`,
`Command`, `Query`, `Event`, `Permission`, `Widget`, `Route`.

---

## Quando criar um novo Registry?

**Pergunta-chave:** _"Mais de um plugin precisa contribuir para este ponto?"_

- **Sim** → Crie um Registry e um Extension Point.
- **Não** → O plugin resolve internamente.

**Exemplos de quando criar:**
- Três plugins querem aparecer na busca global → `SearchRegistry`
- Dois plugins querem adicionar cards ao Dashboard → `WidgetRegistry`
- Todo plugin quer registrar rotas → `RouteRegistry`

**Exemplos de quando NÃO criar:**
- Apenas o plugin de CRM precisa de pipeline de vendas → lógica interna
- Apenas o plugin de eventos precisa de calendário → lógica interna

---

## Quando criar uma nova Capability?

**Pergunta-chave:** _"Essa funcionalidade precisa ser vendida, desligada ou
composta independentemente?"_

- **Sim** → É uma Capability. Adicione ao `CAPABILITY_CATALOG.md` via ADR.
- **Não** → É uma funcionalidade interna do plugin.

**Exemplos de Capabilities:**
- `banner:rotating` → Pode ser vendido como add-on
- `ai:chatbot` → Pode ser ligado/desligado por plano
- `search:advanced` → Pode ser composto com qualquer plugin

**Exemplos de NÃO-Capabilities:**
- Validação de CNPJ no formulário → Lógica interna do plugin
- Formatação de endereço → Utilitário em `@saas/shared`

---

## Quando alterar um ADR?

**Nunca.** ADRs (Architecture Decision Records) são **imutáveis**.

Se uma decisão anterior precisa ser revertida ou evoluída:
1. Crie um **novo ADR** com status `Supersedes ADR-XXX`.
2. Atualize o status do ADR original para `Superseded by ADR-YYY`.
3. Nunca edite o corpo do ADR original.

Isso preserva o registro histórico completo das decisões arquiteturais.

---

## A Regra de Ouro

> **Nenhuma linha de código pode existir sem que exista antes um contrato
> arquitetural correspondente.**

O fluxo é sempre:
```
Visão → Princípios → Contratos → Arquitetura → Implementação → Código
```

Nunca:
```
Código → Documentação
```
