# 01 — Auditoria Técnica e Diagnóstico de Maturidade do Produto

**Módulo:** Product Review  
**Escopo:** Avaliação do estado atual da Fundação CivicOS e do Produto Conexão Maçônica  

---

## 1. Diagnóstico do Estado Atual

### 1.1 O Que Já Existe e Está Implementado (`✔ Implementado`)
- **Fundação CivicOS Core**: Kernel de Dependency Injection, Event Bus com isolamento por contexto, Plugin Runtime com ciclo de vida isolado e Presentation Engine com desacoplamento de UI.
- **Navigation Engine (Sprint 1.0)**: Resolução dinâmica de navegação multi-tenant, suporte a guardas de permissão/capability e barramento de web shell.
- **Especificação Técnica Congelada (Docs 00–03 v1.0)**: Especificação Funcional, Arquitetura Técnica, Schema Conceitual DDL e Matriz RBAC aprovados com tag `conexao-maconica-docs-approved`.
- **Estratégia de SEO Multi-Tenant**: Otimização de fontes via `next/font/google`, componentes de `StructuredData` (JSON-LD), sitemap dinâmico e robots.txt via contexto de tenant.
- **Neutralização de Domínio**: Remoção total de termos maçônicos específicos do Kernel da Fundação CivicOS e substituição por contratos genéricos (`customLimits`).

### 1.2 O Que Está Faltando (`🟡 Ponto de Atenção / A Desenvolver`)
- **Documentação de Telas e Jornadas (Docs 04–05)**: Hierarquia visual de componentes, fluxos de onboarding e prototipagem das telas do anunciante e administrador.
- **Auditoria de Preços Versionada (`price_version_id`)**: Snapshot de precificação histórica na assinatura para proteger o anunciante de reajustes retroativos involuntários.
- **Separação Dimensional de Badges**: Desacoplamento entre nível de verificação, tipo de vínculo, selo histórico (Fundador) e plano comercial contratado.
- **CRM do Anunciante**: Pipeline de gestão de oportunidades no painel da empresa para acompanhar conversões de orçamentos e leads recebidos.

---

## 2. Matriz de Riscos Técnicos e de Negócio

| Risco Identificado | Impacto | Severidade | Recomendação Arquitetural |
|---|---|:---:|---|
| Contaminação do Kernel por domínios específicos | Perda da capacidade multi-ecossistema do CivicOS | 🔴 Alta | Manter rigorosamente contratos neutros (`customLimits`) no Core e mover regras específicas para plugins. |
| Inconsistência de preço em renovações anuais | Reclamações comerciais e fricção de cobrança | 🔴 Alta | Implementar `PlanVersion` com `price_snapshot` e `price_version_id` imutáveis na assinatura. |
| Exposição indevida de dados pessoais (LGPD) | Sanções legais e perda de confiança da comunidade | 🔴 Alta | Aplicar preferências de consentimento por campo (`display_name`, `display_contact`, etc.) e URLs assinadas temporárias (15 min). |
| Apagamento em cascata de histórico auditável | Perda de comprovação em contestações institucionais | 🟡 Média | Substituir `ON DELETE CASCADE` por `ON DELETE SET NULL` em atores de histórico e tabelas de auditoria. |

---

## 3. Recomendações Priorizadas para a Engenharia

1. **Prioridade 1 (Imediata)**: Finalizar os Docs 04–08 (Mapa de Telas, Jornadas, Critérios de Aceite, Backlog e Plano de Sprints).
2. **Prioridade 2**: Manter o ambiente Supabase/SQL 100% congelado até a aprovação formal do Plano de Sprints (Sprint 1.1).
3. **Prioridade 3**: Garantir que as migrations da Sprint 1.1 sigam estritamente o Schema Conceitual DDL refinado no Doc 02.
