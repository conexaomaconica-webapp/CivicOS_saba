# 05 — Algoritmo Multi-Dimensional de Ranking Orgânico e Patrocinado

**Módulo:** Product Review  
**Escopo:** Motor de busca, ordenação justa, desempate ético e slots patrocinados  

---

## 1. Algoritmo Hierárquico do Ranking

Para evitar a viciação das buscas e garantir que o guia permaneça relevante para os usuários, a ordenação dos resultados aplica um **algoritmo multi-dimensional em 10 fatores**:

```text
1. Sponsored Slots (Patrocinados rotulados transparentemente no topo)
   ↓
2. Search Query Relevance (Precisão do termo pesquisado no título, tags e serviços)
   ↓
3. Geo Distance (Proximidade física do usuário quando busca geolocalizada ativada)
   ↓
4. Publication & Activity Status (Apenas empresas publicadas e ativas)
   ↓
5. Profile Completeness (Qualidade dos dados, fotos, horário e descrição)
   ↓
6. Trust Score & Reputation Rating (Pontuação ética de confiança de 0 a 100)
   ↓
7. Response Time & Interaction Rate (Velocidade de atendimento e leads convertidos)
   ↓
8. Active Offers / Benefits (Existência de cupons e descontos válidos)
   ↓
9. Relationship Type (Vínculo maçônico como CRITÉRIO SECUNDÁRIO DE DESEMPATE)
   ↓
10. Randomization Tiebreaker (Rotação aleatória entre empresas com mesma pontuação)
```

---

## 2. Garantias Anticoncorrenciais e Ética Comercial

### 2.1 O Vínculo como Critério Secundário de Desempate
- O tipo de vínculo maçônico (`owner`, `equity_partner`, `institutional_partner`, etc.) jamais substitui a relevância do serviço ou a localização da empresa.
- Ele atua exclusivamente no nível 9 como fator de desempate entre duas empresas que empataram em relevância, distância e reputação.

### 2.2 Transparência em Slots Patrocinados
- Anúncios pagos recebem obrigatoriamente a tag visual de destaque **"Patrocinado"**.
- O motor de ranking impede que resultados pagos alterem a pontuação orgânica dos estabelecimentos nas posições não patrocinadas.

### 2.3 Rotação Dinâmica para Evitar Monopólio de Visibilidade
No fator 10, o sistema aplica um algoritmo de **randomização determinística por sessão (`seed = tenant_id + date + session_id`)**, garantindo que empresas de mesma pontuação se alternem no topo das listagens a cada nova consulta.
