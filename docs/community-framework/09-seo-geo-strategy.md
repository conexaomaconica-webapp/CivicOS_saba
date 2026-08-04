# 09 — SEO, GEO & AI Search Engine Optimization

**Módulo:** Community Framework  
**Escopo:** Otimização para buscadores tradicionais, motores de IA generativa (GEO) e fontes locais  

---

## 1. Estado Atual

A estratégia de SEO/GEO aplica os requisitos de `SABA-seo.md`, com renderização dinâmica de metadata no Next.js App Router, schemas JSON-LD e suporte a assistentes de IA.

---

## 2. O Que Já Existe

- Fontes via `next/font/google` (`Inter`), `StructuredData` configurado por rota e robots.txt/sitemaps via contexto do tenant.

---

## 3. Pontos Fortes

- **Prontidão para Busca por IA (ChatGPT, Perplexity, Gemini)**: Geração automatizada de arquivos `/llms.txt` por tenant.

---

## 4. Problemas Encontrados

- Risco de geo-spam se páginas fossem geradas em massa sem anunciantes. Mitigado pela regra estrita de guardrails antispam.

---

## 5. Oportunidades

- Recomendações de serviços via chatbots de comunidades e assistentes virtuais de busca fraterna.

---

## 6. Benchmark

- **Vercel SEO Best Practices / Perplexity AI Search Indexing Guidelines**.

---

## 7. Recomendação

Manter a otimização Server-Side por padrão e estender a injeção de schemas JSON-LD nas rotas dos guias.

---

## 8. Impacto

Posicionamento orgânico dominante nas buscas locais das cidades atendidas.

---

## 9. Prioridade

**P1 — Crítica**.

---

## 10. Sprint Sugerida

Sprint 1.0 (Concluída no Core) & Sprint 1.1 (Rotas do Produto).

---

## 11. Arquivos Afetados

- `docs/community-framework/09-seo-geo-strategy.md`

---

## 12. Dependências

Next.js Metadata API.

---

## 13. Riscos

Baixo.

---

## 14. Decisão Recomendada

Aprovar as diretrizes de SEO/GEO e AI Search para todo o Community Framework.
