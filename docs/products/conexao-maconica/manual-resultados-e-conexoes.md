# Manual — Análise de Resultados, Conexões e Mural

Guia de uso e referência técnica das funções de **prova de valor para o anunciante** (migrations 168 a 186).
Princípio que guia tudo: em vez de medir só "quantas pessoas acessaram", medir **quantas conexões a plataforma ajudou a gerar**.

> A cadeia de valor: **aconteceu → foi registrado → foi validado → virou indicador → virou recomendação → virou argumento de renovação.**

---

## 1. Visão geral (o que existe)

| Função | Quem usa | Onde |
|---|---|---|
| Registrar conexão (visita, compra, serviço, parceria) | Membro | Página da empresa; QR da empresa |
| Confirmação pela empresa | Anunciante | `/anunciante/conexoes` |
| Mural de Conexões | Público | Página da empresa e feed do Guia |
| Indicações e compartilhamentos | Membro / visitante | Botão Indicar; botão Compartilhar nos cards |
| Resgate de benefício | Membro e anunciante | `/anunciante/beneficios/validar` |
| QR Code da empresa | Anunciante (gera) / Membro (lê) | `/anunciante/qr` → `/guia/{slug}/qr` |
| Painel de resultados | Anunciante | `/anunciante/resultados` |
| Resumo do mês e marcos | Anunciante | Topo de `/anunciante/resultados` |
| Avisos e marcos | Anunciante | `/anunciante/notificacoes` |
| Empresas em risco | Administrador | `/admin/risco` |

---

## 2. Registrar conexão (membro)

O membro abre **"Comprei na Conexão"** na página da empresa e escolhe o tipo: **visita, compra, serviço ou parceria**.

Campos:
- **O que comprou ou contratou** — opcional.
- **Sua experiência** — opcional, até 400 caracteres.
- **Como essa conexão aconteceu?** — opcional: busca, oferta, indicação, evento, compartilhamento, QR da empresa, já conhecia, outro.
- **Valor aproximado** — opcional, por faixa (até R$ 250 · 251–500 · 501–1.000 · 1.001–5.000 · acima de 5.000 · prefiro não informar). Não aparece para visita.
- **Compartilhar no Mural** — checkbox, **desmarcado por padrão**.
- **Foto** — só aparece se marcar o Mural. Passa por moderação antes de aparecer.

Regras:
- Exige login. Máximo de 5 registros por usuário a cada 24 h.
- Não pode registrar conexão com a própria empresa.
- Não pode ter duas conexões pendentes do mesmo tipo com a mesma empresa.
- **Valor é declaratório.** Nos painéis aparece como "negócios declarados", **nunca como faturamento**.

## 3. Confirmação pela empresa

Todo registro nasce **pendente**. A empresa **confirma** ou **recusa** em `/anunciante/conexoes`.

Estados: `pendente → confirmada | recusada` (e `removida`, por moderação).

Por que importa: a diferença entre "18 registros recebidos" e "15 confirmados pela empresa" é a prova mais forte do painel.

## 4. Mural de Conexões

- Mostra apenas conexões **confirmadas pela empresa** **e** com **consentimento do membro** (`share_on_mural`).
- Exibe só o **primeiro nome** do membro, o relato e a foto aprovada.
- Visitas aparecem à parte e **não contam como negócio**.
- Há curtidas, denúncia e moderação de fotos em `/admin/conexoes`.
- Registros sem consentimento **continuam valendo** para métricas, painel e funil, mas não aparecem publicamente.
- Conexões criadas antes da migration 184 ficam como compartilhadas, para ninguém sumir do Mural.

## 5. Indicações e compartilhamentos

- **Indicação:** o membro gera um link pessoal. Quem abre o link entra no funil da indicação: abriu → entrou em contato → usou benefício → registrou conexão.
- **Compartilhamento:** botão de compartilhar nos cards do Guia grava o evento `share`.
- Ver o funil em `/anunciante/indicacoes`.

## 6. Resgate de benefício

- O membro gera um código; a empresa valida em **Validar benefício**.
- Eventos gravados: `benefit_claim` (código gerado) e `benefit_redeemed` (uso validado).
- É opcional para a empresa: o sistema está pronto, a adesão depende do empresário.

## 7. QR Code da empresa

1. O anunciante abre **QR da empresa** no portal, baixa PNG (impressão) ou SVG e coloca no balcão.
2. Quem lê o QR cai em `/guia/{slug}/qr`: **Registrar visita · Registrar compra ou serviço · Ver benefícios · Conhecer a empresa**.
3. Cada leitura grava `qr_scan`. Registros feitos por ali já vêm com a origem **"QR da empresa"**.
4. Quem não estiver logado é levado ao login e volta para a mesma página.

## 8. Painel de resultados (anunciante)

Hierarquia, de cima para baixo: **Resultado → Oportunidade → Interesse → Visibilidade.**

1. **Resumo do mês** — texto em linguagem de resultado, variação contra o mês anterior, oportunidade (por exemplo, sem benefício ativo) e marcos.
2. **Sua Conexão** (7/30/90 dias) — conexões registradas, compras e serviços, confirmadas, negócios declarados; como as conexões aconteceram; faixas de valor; indicações, compartilhamentos, resgates e aparições na busca.
3. **Interesse e visibilidade** — visualizações, cliques (WhatsApp, rota, site), funil, evolução diária.

**Marcos:** 100/500/1.000/5.000 visualizações · 1ª/10ª/25ª/50ª indicação · 1ª/10ª/25ª/50ª/100ª conexão · 3/6/12/24 meses na Conexão. Cada um é gravado uma única vez e gera aviso no portal. Empresas antigas recebem aviso só do maior marco de cada categoria.

## 9. Empresas em risco (administrador)

Em `/admin/risco`. Pontuação por sinais; mostra a partir de 3 pontos:

| Sinal | Pontos |
|---|---|
| Perfil sem atualização há mais de 60 dias | 1 |
| Perfil sem atualização há mais de 120 dias | 2 |
| Nenhum benefício ativo | 1 |
| Nenhuma conexão em 90 dias | 2 |
| Menos de 10 visualizações em 30 dias | 1 |
| Nenhum contato (WhatsApp, rota, site) em 30 dias | 1 |
| Conexão pendente há mais de 7 dias | 1 |

**Alto:** 5 ou mais. **Médio:** 3 ou 4. Cada empresa vem com os motivos, para a equipe agir antes da renovação.
*Os pesos são uma proposta inicial. Ajuste em `181_admin_businesses_at_risk.sql`.*

---

## 10. Eventos analíticos (fonte canônica: `analytics_events`)

Gravados desde o primeiro dia, porque o histórico não se reconstrói depois.

| Evento | Quando |
|---|---|
| `view` | Perfil da empresa visto |
| `search_impression` | Card visível no Guia (1 por empresa por sessão) |
| `whatsapp_click`, `phone_click`, `website_click`, `directions_click`, `social_click`, `instagram_click` | Cliques de contato |
| `share` | Compartilhamento do card |
| `qr_scan` | Leitura do QR da empresa |
| `connection_visit`, `connection_purchase`, `connection_service`, `connection_partnership` | Conexão registrada |
| `connection_confirmed`, `connection_declined` | Decisão da empresa |
| `referral`, `referral_contact`, `referral_benefit`, `referral_connection` | Etapas da indicação |
| `benefit_claim`, `benefit_redeemed` | Resgate de benefício |
| `event_checkin`, `event_connection` | Reservados; ainda **não são emitidos** |

Campos novos: `source` (origem), `ref_type` e `ref_id` (registro relacionado) e `device` (reservado, ainda não preenchido). **Nenhum IP ou ID de usuário em claro.**

---

## 11. Referência técnica

### Migrations (aplicar em ordem)
| Nº | Conteúdo |
|---|---|
| 178 | Contexto em `analytics_events`; `origin` e `value_range`; triggers do funil |
| 179 | Registro aceita origem e faixa de valor |
| 180 | `business_results_summary` (resultado do período) |
| 181 | `admin_businesses_at_risk` |
| 182 | Resgate de benefício → eventos do funil |
| 183 | `business_value_summary` (resumo do mês e contadores) |
| 184 | `share_on_mural` (consentimento do Mural) |
| 185 | Marcos (`business_milestones`) e avisos |
| 186 | `mark_my_notification_read` |

### Arquivos principais
- Registro e Mural: `apps/web/src/components/public/business/sections/BusinessConnectionsCard.tsx`, `apps/web/src/app/actions/connections.ts`, `apps/web/src/lib/connections/labels.ts`
- Eventos: `apps/web/src/lib/analytics/analytics-service.ts`, `use-search-impression.ts`
- Painel: `apps/web/src/lib/advertiser/advertiser-results-service.ts`, `value-summary.ts`, `apps/web/src/app/anunciante/resultados/results-client.tsx`
- QR: `apps/web/src/app/(public)/guia/[slug]/qr/`, `apps/web/src/app/anunciante/qr/`
- Admin: `apps/web/src/app/admin/risco/`, `apps/web/src/lib/admin/admin-risk-service.ts`
- Avisos: `apps/web/src/lib/advertiser/advertiser-notifications-service.ts`

### Regras de produto que não podem ser quebradas
- Valor declarado ≠ faturamento. Nunca usar o termo "faturamento gerado".
- Selos **Pedra Fundamental, Fundadora e Coluna de Honra** são reconhecimentos institucionais, separados dos planos comerciais.
- Nunca exibir IP de usuário. Integridade aparece como "Integridade Verificada — SHA-256".

---

## 12. Pendências conhecidas

1. **Pós-evento:** "Fez alguma conexão no encontro?" ainda não existe (`event_checkin` e `event_connection` estão reservados).
2. **Notificações por e-mail e card compartilhável dos marcos** — só há aviso in-app.
3. **Preferências de e-mail** no portal são valores fixos; não salvam.
4. **Segurança:** `notification-service.ts` (sino) usa chave de serviço sem checar o dono do aviso e traz avisos de exemplo como fallback. Corrigir antes do lançamento.
5. **Tipos do Supabase** (`database.types.ts`) não incluem as colunas e RPCs novas; o código usa `as any` nesses pontos.
6. **Uma empresa por dono:** o portal do anunciante localiza a empresa por `owner_id`; equipes com várias pessoas ou empresas por dono não estão cobertas.
7. **Tabelas de analytics duplicadas** (`business_analytics_events`, `directory_analytics_events`) ainda existem. Consolidar em `analytics_events` quando for seguro.
8. **Índice Conexão (0–100), relatório mensal automático e benchmarking** — planejados, não implementados.
