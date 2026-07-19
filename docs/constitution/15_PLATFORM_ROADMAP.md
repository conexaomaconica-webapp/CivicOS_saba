# Roadmap da Plataforma (Platform Roadmap) — CivicOS

> _Descreve a jornada de evolução técnica e de negócios da plataforma, indo de
> um MVP para um ecossistema aberto de plugins._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. Fase 1: Fundação & Guia Comercial (Atual)
* **Objetivo:** Estabelecer a infraestrutura básica do monorepo, isolamento multi-tenant via RLS, PIX e o primeiro produto real: o Guia Comercial.
* **Marcos Técnicos:**
  - [x] Resolução de Tenant por subdomínio
  - [x] Integrar ViaCEP para cadastro sem fricção
  - [x] Substituir pop-ups padrão por Modais Premium
  - [x] Lançamento da busca pública com ordenação por tiers (Ouro, Prata, Bronze)

---

## 2. Fase 2: Modularização & Constituição do Core
* **Objetivo:** Implementar o SaaS OS. Separar a lógica do Guia Comercial em um plugin completamente desacoplado e criar o motor de carregamento dinâmico.
* **Marcos Técnicos:**
  - [x] Criar e ratificar os 17 documentos da Constituição do CivicOS
  - [ ] Implementar `CapabilityRegistry` e refatorar Licensing para operar por capabilities
  - [ ] Dividir manifestos do `business-directory` em arquivos especializados
  - [ ] Implementar `RouteRegistry` com Middleware rewrites para suporte a rotas dinâmicas
  - [ ] Criar o `SlotEngine` e modularizar a Home e o Dashboard

---

## 3. Fase 3: Expansão Vertical (Novos Nichos)
* **Objetivo:** Criar e embarcar novos produtos (plugins) para validar a premissa de hot-swapping de recursos do framework.
* **Marcos Técnicos:**
  - [ ] Criar o plugin `masonic-directory` (Diretório Maçônico, Ritos, Lojas, Graus)
  - [ ] Criar o plugin `benefits-club` (Clube de Benefícios com Cupons e Descontos)
  - [ ] Lançar o Painel Administrativo Master para controle de Tenants e faturamento

---

## 4. Fase 4: Marketplace Aberto (Ecossistema)
* **Objetivo:** Abrir a plataforma para desenvolvedores terceiros publicarem seus próprios plugins e monetizarem por meio do CivicOS App Store.
* **Marcos Técnicos:**
  - [ ] Publicar o SDK oficial do Desenvolvedor de Plugins
  - [ ] Implementar a verificação e validação de manifestos online
  - [ ] Lançar a App Store de Plugins para compra de capacidades e add-ons pelos tenants
