# Eventos do Google Analytics 4 — Conexão Maçônica

Atualizado na Sprint 3 (2026-10-08). Fonte única dos nomes e parâmetros: `apps/web/src/lib/analytics/events.ts`
(`GA_EVENT_CATALOG`). Os testes garantem que o código e este catálogo não se separem.

## Regras

- Nomes em `snake_case`. Um evento é disparado em **um único lugar** (sem listener global duplicado).
- **Consentimento estrito:** nada é enviado, e o script do Google nem é baixado, antes do "Aceitar" (`cm_analytics_consent`).
  Eventos disparados antes de o GA ficar pronto esperam numa fila curta (máx. 25) e saem quando ele fica pronto.
- **Nenhum dado pessoal.** Só os parâmetros da lista abaixo são aceitos; qualquer outra chave é descartada. O termo de busca
  é higienizado (e-mail, telefone, CPF/CNPJ e textos com 6+ dígitos viram "sem termo"). Formulários enviam só o tipo
  (`lead_type`) e o plano de interesse, nunca nome, e-mail, WhatsApp ou empresa da pessoa.
- **Onde o GA roda:** site público e funil de cadastro. **Não roda** em `/admin`, `/master`, `/platform`, `/dashboard`,
  `/anunciante`, `/minha-conta`, `/usuario`, `/perfil`, `/diagnostics`, `/health`, `/api`, `/auth` e nas rotas com token na
  URL (`/c/`, `/cadastro/`, `/contratacao/`, `/adesao/`): mandar essas URLs ao Google vazaria o token. Lista em
  `lib/analytics/ga-paths.ts`.
- **page_view** (inclusive navegação sem recarregar a página) vem da Medição otimizada do GA4 ("Mudanças de página com base
  em eventos do histórico do navegador"). O código **não** envia `page_view` manual, para não duplicar. Conferir que essa
  opção está ligada no fluxo de dados.
- A medição própria (`analytics_events`, usada no painel do anunciante) continua separada. Os dois caminhos de compartilhar da página da empresa (botão Compartilhar e modal Indicar: copiar link, WhatsApp, menu do aparelho) agora também gravam o evento `share` nela, uma vez por ação, ao lado do `share_business` do GA4.

## Eventos

| Evento | Arquivo | Gatilho | Parâmetros | Status |
|---|---|---|---|---|
| `view_business` | `components/public/business/BusinessContactTracker.tsx` | Abrir a página da empresa | business_id, business_slug, business_name, category_name, city, state, plan, is_pedra_fundamental, source_page | Implementado |
| `click_whatsapp` | `BusinessContactTracker.tsx` | Clique em link `wa.me`/WhatsApp com número | (mesmos da empresa) | Implementado |
| `click_phone` | `BusinessContactTracker.tsx` | Clique em `tel:` | (mesmos da empresa) | Implementado |
| `click_instagram` | `BusinessContactTracker.tsx` | Clique em link do Instagram | (mesmos da empresa) | Implementado |
| `click_website` | `BusinessContactTracker.tsx` | Clique em link externo (site) | (mesmos da empresa) | Implementado |
| `click_directions` | `BusinessContactTracker.tsx` | Clique em rota/mapa | (mesmos da empresa) | Implementado. Nome mantido porque já é evento-chave no GA4; `click_route` do README é só alias |
| `share_business` | `components/public/business/BusinessShareActions.tsx` e `sections/ReferBusinessModal.tsx` | Botão Compartilhar (layout bronze) e, em qualquer layout, copiar link / WhatsApp / menu do aparelho no modal "Indicar" (também nos cards do guia, só com o slug) | (mesmos da empresa) | Implementado |
| `favorite_business` | `lib/directory/favorites-context.tsx` | Adicionar aos favoritos (só ao adicionar) | business_slug, source_page | Implementado |
| `view_offer` | `components/public/business/sections/BusinessBenefits.tsx` | Clicar para ver/resgatar um benefício | business_*, offer_id, source_page | Implementado |
| `register_visit` | `components/public/business/sections/BusinessConnectionsCard.tsx` | Conexão do tipo visita registrada | business_*, connection_type, source_page | Implementado |
| `register_connection` | `BusinessConnectionsCard.tsx` | Conexão (compra, serviço, parceria) registrada | business_*, connection_type, source_page | Implementado |
| `search_business` | `app/(public)/guia/empresas/page.tsx` | Busca com texto no guia | search_term (higienizado), city, category_name, results_count, source_page | Implementado. Busca sem resultado = `results_count` 0 |
| `select_city` | `guia/empresas/page.tsx` | Filtro de cidade aplicado | city, results_count, source_page | Implementado |
| `select_category` | `guia/empresas/page.tsx` | Filtro de categoria aplicado | category_name, results_count, source_page | Implementado |
| `view_city` | `app/(public)/guia/[slug]/[cidade]/page.tsx` | Página de cidade | city, state, results_count, source_page | Implementado |
| `view_category` | `.../[cidade]/[categoria]/page.tsx` | Página de cidade + categoria | category_name, city, state, results_count, source_page | Implementado |
| `generate_lead` | `components/landing/LandingLeadCapture.tsx` | Formulário de contato da home enviado | lead_type=`advertiser_interest`, plan_interest, source_page | Implementado |
| `generate_lead` | `components/events/EventRSVPForm.tsx` | Presença confirmada no evento | lead_type=`event_rsvp`, event_id, source_page | Implementado (recusa não conta) |
| `start_advertiser_signup` | `app/anunciar/passo-1/page.tsx` | Abrir o passo 1 do cadastro (1x por sessão) | source_page | Implementado |
| `complete_advertiser_signup` | `app/anunciar/passo-2/business-form.tsx` | Responsável e empresa salvos (passo 2) | source_page | Implementado. Definição: cadastro concluído = conta + empresa |
| `contract_signed` | `passo-5/contract-signing-client.tsx` e `passo-7/contract-step-client.tsx` | Contrato assinado (1x por sessão) | plan, source_page | Implementado |
| `payment_confirmed` | `passo-6/checkout-payment-client.tsx` | Cartão autorizado (1x por sessão) | plan, payment_method=`credit_card`, source_page | Parcial: veja pendências |

Os passos do funil (`/anunciar/passo-1` a `passo-7`) aparecem como `page_view`, o que já dá o funil de etapas no GA4.

## Pendências (não implementadas nesta sprint)

| Item | Motivo | Para destravar |
|---|---|---|
| `payment_confirmed` por **Pix** | O Pix só é confirmado depois, no servidor (webhook); o navegador não sabe | Medição por servidor (Measurement Protocol) com `GA_API_SECRET` |
| `business_published` | Acontece no admin/servidor, sem navegador do anunciante | Idem (Measurement Protocol) |
| `profile_completed` | Falta definir o critério (ex.: nota de SEO >= 85) | Decisão de produto |
| Eventos de `contract_signed` por link de contrato (`/contratacao/{token}`) | Rota com token fica fora do GA de propósito | Evento por servidor |

## O que configurar no GA4 (Administrador)

1. **Eventos-chave** (conversões): já marcados `click_whatsapp`, `click_phone`, `click_directions`, `click_website`. Acrescentar:
   `generate_lead`, `register_visit`, `register_connection`, `contract_signed`, `payment_confirmed`,
   `complete_advertiser_signup`. Contagem sugerida: "uma vez por sessão" para contatos; "uma vez por evento" para
   `generate_lead` e `payment_confirmed`.
2. **Dimensões personalizadas** (escopo Evento, nome do parâmetro igual ao da lista): `business_slug` (já criada),
   `category_name`, `city`, `state`, `plan`, `source_page`, `search_term`, `results_count`, `lead_type`, `plan_interest`,
   `connection_type`, `payment_method`. (O GA4 permite 50 dimensões de evento.)
3. **Medição otimizada:** manter ligada "Visualizações de página" e "Mudanças de página com base em eventos do histórico".

## Por que um parâmetro "não aparece" nos relatórios do GA4

O GA4 só lista nos relatórios e no Tempo real os parâmetros **cadastrados como dimensão personalizada** (Administrador >
Definições personalizadas). Parâmetro não cadastrado **é enviado e coletado**, mas fica invisível na interface. Para
conferir o que realmente sai do navegador, abra as Ferramentas do Desenvolvedor (F12) > Network, filtre por `collect`
e olhe o Payload: cada parâmetro vai como `ep.nome` (texto) ou `epn.nome` (número), por exemplo `ep.category_name=Óptica`.
Para ver nos relatórios, cadastre as dimensões da lista acima (escopo Evento).

## Como validar

1. Abra o site, **aceite** o aviso de cookies e use **Administrador > DebugView** (ou o relatório Tempo real).
2. Página de uma empresa: `view_business` com os parâmetros da empresa; clique em WhatsApp/telefone/Instagram/site/rota:
   o evento `click_*` correspondente, **uma vez por clique**.
3. `/guia/empresas?q=otica`: `search_business` com `search_term` e `results_count`. Teste `?q=joao@email.com`: o evento
   sai **sem** `search_term`.
4. `/anunciar/passo-1`: `start_advertiser_signup` (só uma vez por sessão do navegador).
5. Em `/admin`, `/anunciante` e `/contratacao/...`: **nenhum** evento nem aviso de cookies.
6. Recuse o aviso (aba anônima): nenhum evento e nenhum cookie `_ga`.
