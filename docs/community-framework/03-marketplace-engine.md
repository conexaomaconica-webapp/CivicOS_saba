# 03 — Marketplace Engine & Profile Architecture

**Módulo:** Community Framework  
**Escopo:** Arquitetura de perfil comercial, catálogo desacoplado e extensão por comunidades  

---

## 1. Estado Atual

O perfil comercial de qualquer empresa no ecossistema é desacoplado em 3 camadas funcionais:

```text
Business (Foundation) ──> Marketplace Profile (Framework) ──> Community Extension (Vertical Product)
```

---

## 2. O Que Já Existe

- Modelo conceitual neutro de empresa (`Business`) com dados cadastrais de mercado.
- Suporte a geolocalização (latitude/longitude), endereço estruturado e categorias.

---

## 3. Pontos Fortes

- **Desacoplamento Total**: O produto vertical adiciona seus atributos de afiliação (ex: Lojas na Maçonaria, Clubes no Rotary, Registros no CREA) sem alterar o cadastro neutro da empresa.

---

## 4. Problemas Encontrados

- Necessidade de garantir RLS rigorosa para que dados comerciais privados não vazem entre tenants.

---

## 5. Oportunidades

- Ativação de busca por proximidade geográfica e catálogo de serviços recomendados por IA.

---

## 6. Benchmark

- **Google Business Profile / Yelp**: Estrutura cadastral base sobre a qual se adicionam camadas de avaliações, selos de verificação e ofertas.

---

## 7. Recomendação

Manter a tabela `businesses` limpa e estender funcionalidades de marketplace via `business_marketplace_profiles` e tabelas de extensão por plugin.

---

## 8. Impacto

Reutilização imediata do módulo de marketplace em qualquer novo produto vertical.

---

## 9. Prioridade

**P1 — Crítica**.

---

## 10. Sprint Sugerida

Sprint 1.1.

---

## 11. Arquivos Afetados

- `docs/community-framework/03-marketplace-engine.md`
- `packages/core/src/tokens.ts`

---

## 12. Dependências

Business Directory Domain Foundation.

---

## 13. Riscos

Baixo.

---

## 14. Decisão Recomendada

Aprovar a arquitetura de perfil de marketplace em 3 camadas.
