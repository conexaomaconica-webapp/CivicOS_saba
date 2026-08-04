# 04 — Estratégia de Monetização, Preços e Tiers

**Módulo:** Product Review  
**Escopo:** Tiers comerciais, Founder Badge desacoplado e add-ons de monetização  

---

## 1. Tiers de Assinatura Comercial

A monetização principal ocorre via assinatura anual dividida em 3 planos comerciais estruturados:

| Recurso / Benefício | Plano Bronze | Plano Prata | Plano Ouro |
|---|:---:|:---:|:---:|
| **Listagem no Guia** | 🟢 Sim | 🟢 Sim | 🟢 Sim |
| **Página Exclusiva da Empresa** | 🟢 Básica | 🟢 Completa | 🟢 Premium |
| **Fotos da Galeria** | Até 3 fotos | Até 10 fotos | Ilimitadas |
| **Links Redes Sociais & WhatsApp** | 🟢 Sim | 🟢 Sim | 🟢 Sim |
| **Gestão de Cupons Promocionais** | 🔴 Não | Até 3 cupons | Cupons Ilimitados |
| **Banners em Destaque** | 🔴 Não | 🔴 Não | 🟢 Rotativo por Categoria |
| **Prioridade de Suporte** | Padrão | Prioritário | VIP Dedicado |
| **Analytics Comercial** | Básico | Intermediário | Dashboard Avançado |

---

## 2. A Condição de "Fundador" como Badge Independente (`FounderBadge`)

> [!IMPORTANT]
> **Decisão de Arquitetura Financeira**: A condição de **Empresa Fundadora** NÃO é um plano comercial de assinatura e NÃO concorre com os tiers Bronze, Prata ou Ouro.

### 2.1 Conceituação do `FounderBadge`
- **Distinção Histórica**: O selo de Fundador é um reconhecimento concedido às primeiras empresas apoiadoras do tenant.
- **Acoplamento Independente**: Uma empresa pode contratar o **Plano Prata** e ostentar o **FounderBadge**, ou contratar o **Plano Ouro** e ostentar o **FounderBadge**.
- **Independência Financeira**: O selo de Fundador permanece no perfil como marco histórico mesmo em renovações futuras de tabela, enquanto o valor da assinatura é gerido normalmente pelos planos comerciais vigentes.

---

## 3. Fontes Adicionais de Receita (Add-Ons & Patrocínios)

1. **Slots de Banners Patrocinados**: Venda de espaços de destaque na home do tenant e no topo de categorias específicas.
2. **Destaque em Busca (Sponsored Boost)**: Opção de posicionamento destacado claramente identificado como *"Patrocinado"*.
3. **Módulo de Vendas de Artigos e Eventos**: Taxas sobre transações ou publicação de eventos patrocinados pela comunidade.
