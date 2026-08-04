# 05 — Ranking Engine & Organic/Sponsored Search Algorithm

**Módulo:** Community Framework  
**Escopo:** Algoritmo multi-dimensional de ordenação em 10 níveis, rotação determinística e desempate  

---

## 1. Estado Atual

O motor de ranking calcula a ordenação dos resultados das buscas combinando critérios objetivos de relevância, geolocalização, qualidade do perfil e engajamento.

---

## 2. O Que Já Existe

- Regra de ordenação em 10 níveis onde o vínculo da comunidade opera exclusivamente como fator secundário de desempate no nível 9.

---

## 3. Pontos Fortes

- **Justiça Comercial e SEO Interno**: Impede que empresas irrelevantes apareçam no topo apenas por terem contratado o plano mais alto ou possuírem um vínculo específico.
- **Randomização Determinística por Sessão (`seed`)**: Garante que estabelecimentos com a mesma pontuação se alternem no topo das listagens, evitando vícios de visibilidade.

---

## 4. Problemas Encontrados

- Risco de monopolização das primeiras posições por grandes estabelecimentos. Resolvido pela rotação determinística por sessão.

---

## 5. Oportunidades

- Integração com algoritmos de recomendação baseados em hábitos de busca e relevância por vizinhança.

---

## 6. Benchmark

- **Airbnb / Algolia Search**: Ranking ponderado por relevância + distância + reputação + rotação justa entre parceiros qualificados.

---

## 7. Recomendação

Consolidar a ordem em 10 níveis: Patrocinados ──> Relevância do Termo ──> Proximidade ──> Status Ativo ──> Completude ──> Trust Score ──> Tempo de Resposta ──> Ofertas Ativas ──> Vínculo (Desempate) ──> Randomização por Sessão.

---

## 8. Impacto

Experiência de busca superior para os membros e justiça comercial garantida para os anunciantes.

---

## 9. Prioridade

**P1 — Crítica**.

---

## 10. Sprint Sugerida

Sprint 1.1 (Engenharia de Busca).

---

## 11. Arquivos Afetados

- `docs/community-framework/05-ranking-engine.md`

---

## 12. Dependências

Índices de busca em PostgreSQL com pg_trgm e PostGIS para geolocalização.

---

## 13. Riscos

Baixo.

---

## 14. Decisão Recomendada

Aprovar a especificação do motor de ranking multi-dimensional em 10 níveis.
