# Manifesto CivicOS: O SaaS Operating System

> _"Nós não construímos aplicações. Nós construímos o motor que as executa."_

Este manifesto declara a intenção do CivicOS de ser um **SaaS Operating System (SaaS OS)**. Ele serve como o preâmbulo filosófico para todas as outras leis, diretrizes e implementações.

---

## 1. O Problema: Morte por Acoplamento

A maioria das plataformas de software que escalam morre por acoplamento. À medida que novos recursos, nichos ou integrações são adicionados:
- O Core se torna inchado e frágil.
- Surgem dependências circulares ocultas.
- O tempo de build e a complexidade de testes crescem exponencialmente.
- O código se torna impossível de ser mantido por múltiplos desenvolvedores ou agentes de IA.

---

## 2. A Solução: Inversão de Controle & Composição Dinâmica

O CivicOS resolve esse problema delegando a responsabilidade aos limites do sistema:

1. **Kernel Cego:** A camada de base (Kernel) do sistema não conhece rotas, telas, banco de dados de negócio ou conceitos específicos de domínio.
2. **Platform como Serviço:** Serviços como faturamento, segurança e licenciamento operam apenas sob contratos e capacidades.
3. **Plugins como Células:** Os plugins encapsulam 100% de sua lógica de negócio e se injetam na plataforma declarativamente via Manifestos.
4. **Composição por Slots:** A interface do usuário é um quebra-cabeça cujas peças são fornecidas dinamicamente por plugins em slots nomeados.

---

## 3. Governança de Camadas

O CivicOS é composto por quatro camadas rígidas de controle:

| Camada | Responsabilidade | Quem Governa | Regra de Ouro |
|---|---|---|---|
| **Kernel** | Orquestração de DI, eventos, e ciclo de vida. | Core Team | Nunca importa regras de negócio. |
| **Platform** | Serviços oficiais (Auth, Billing, Licensing, SDK). | Core Team | Nunca conhece entidades de domínio. |
| **Registries** | Compositores em runtime (Rotas, Widgets, Menus). | Core Team | Apenas agregam dados dos manifestos. |
| **Products** | Plugins específicos (Directory, Marketplace, CRM). | Plugin Devs | Totalmente isolados, interagem via contratos. |

---

## 4. O Fluxo de Nascimento de Funcionalidades

Para manter a ordem e a consistência da plataforma, qualquer nova funcionalidade deve seguir o seguinte ciclo de governança:

1. **Aprovação da Lei:** Propor a funcionalidade em um ADR e descrevê-la no `CAPABILITY_CATALOG.md`.
2. **Declaração do Contrato:** Definir os manifestos e interfaces no `PLUGIN_MANIFEST_SPEC.md` ou `REGISTRY_SPEC.md`.
3. **Implementação Guiada:** Implementar no respectivo plugin ou serviço de plataforma em estrito cumprimento com as convenções do código.
4. **Modo Homologação:** Validar isoladamente por meio de testes unitários e de integração antes de expor publicamente.
