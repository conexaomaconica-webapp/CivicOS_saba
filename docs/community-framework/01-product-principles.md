# 01 — Product Principles & Architectural Audit

**Módulo:** Community Framework  
**Escopo:** Princípios de produto, auditoria do ecossistema e neutralidade de domínio  

---

## 1. Estado Atual

O **Community Framework** encontra-se em fase de consolidação estratégica. A Fundação CivicOS já fornece os pilares de software (Kernel DI, Event Bus, Plugin Runtime), enquanto a especificação técnica do primeiro produto vertical (Conexão Maçônica v1.0) está congelada com a tag `conexao-maconica-docs-approved`.

---

## 2. O Que Já Existe

- **CivicOS Kernel**: Injeção de dependência via tokens e barramento de eventos desacoplado.
- **Plugin Runtime**: Carregamento dinâmico de extensões e validação de manifestos.
- **Presentation Engine**: Resolução dinâmica de navegação e isolamento de rotas.
- **Modelagem Neutra no Core**: Subscrição de contratos específicos por interfaces agnósticas (`customLimits`).

---

## 3. Pontos Fortes

- **Agnosticismo Total do Core**: O Kernel não possui acoplamento com nenhuma terminologia fraterna ou corporativa.
- **Prontidão Multi-Ecossistema**: Permite plugar novas verticais (Rotary, Lions, CREA, OAB) sem alterar uma linha do código base da Fundação.
- **SEO & Performance Nativa**: Otimização de renderização via Next.js App Router e Server Components por padrão.

---

## 4. Problemas Encontrados

- **Débito de Abstração no Documento Mestre**: Especificações anteriores misturavam regras genéricas de marketplace com terminologias específicas do primeiro produto vertical.
- **Falta de Padronização no Framework**: Ausência de um contrato formal declarando como novas comunidades declaram suas entidades institucionais.

---

## 5. Oportunidades

- **Reutilização de 90% da Documentação**: Criar novos produtos verticais exigirá apenas a redação da camada de domínio específico (`docs/products/[product_name]/domain/`).
- **White Label Enterprise**: Venda de instâncias do Community Framework para grandes confederações e conselhos de classe.

---

## 6. Benchmark

- **Shopify / WordPress Core**: Separação clara entre a plataforma base, o ecossistema de temas/plugins e a customização final da loja.
- **Slack / Discord Communities**: Estruturas de permissões e canais genéricos reaproveitados por milhões de comunidades distintas.

---

## 7. Recomendação

Separar rigorosamente a documentação em 3 camadas:
1. `docs/foundation/` (Plataforma CivicOS)
2. `docs/community-framework/` (Inteligência Reutilizável de Comunidades)
3. `docs/products/[product_id]/` (Engenharia e Domínio Específico do Produto Vertical)

---

## 8. Impacto

- Redução do tempo de lançamento (Time-to-Market) de novas verticais de 6 meses para 3 semanas.
- Eliminação total de retrabalho documental e técnico.

---

## 9. Prioridade

**P1 — Crítica (Imediata)**.

---

## 10. Sprint Sugerida

Sprint 1.0.5 (Refatoração da Arquitetura de Documentação).

---

## 11. Arquivos Afetados

- `docs/community-framework/*`
- `docs/products/conexao-maconica/engineering/*`
- `docs/products/conexao-maconica/domain/masonic-domain.md`

---

## 12. Dependências

Aprovação formal da reestruturação documental em 3 camadas.

---

## 13. Riscos

Mínimo (trabalho 100% focado em governança documental e arquitetura de produto sem alteração no Kernel).

---

## 14. Decisão Recomendada

Aprovar a criação permanente do **Community Framework** como camada intermediária do ecossistema CivicOS.
