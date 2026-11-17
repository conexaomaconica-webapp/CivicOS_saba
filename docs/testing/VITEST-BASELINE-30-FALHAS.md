# Referência: 30 falhas pré-existentes do Vitest (`apps/web`)

Registrada em 2026-11-16 a partir da execução completa (`npx vitest run`, em `apps/web`) com as alterações da Etapa 1 do Mural de Conexões (vitrines compactas) e **antes** da Etapa 2.
Resultado de referência: **30 testes falhando em 11 arquivos**, 1.426 passando (1.456 no total).
Nenhuma destas falhas é do Mural de Conexões, do módulo comercial ou da Home do Guia. Qualquer falha FORA desta lista é regressão.

Como comparar: rodar `npx vitest run` em `apps/web` e conferir se o conjunto de falhas é exatamente este.

## Falhas por arquivo

- `test/admin-businesses-list-kpis.test.ts`: 4 teste(s)
- `test/advertiser-results-etapa-c.test.tsx`: 2 teste(s)
- `test/analytics-sprint3-events.test.tsx`: 5 teste(s)
- `test/checkpoint-advertiser-portal-routing-audit.test.ts`: 1 teste(s)
- `test/checkpoint-billing-etapa1.test.ts`: 1 teste(s)
- `test/checkpoint-empresas-360-refinement.test.ts`: 2 teste(s)
- `test/checkpoint6-integrated-e2e.test.ts`: 1 teste(s)
- `test/lodge-potency.test.ts`: 1 teste(s)
- `test/no-silent-db-writes.test.ts`: 2 teste(s)
- `test/phase1-security-and-lgpd.test.ts`: 10 teste(s)
- `test/public-shell-architecture.test.ts`: 1 teste(s)

## Lista completa

- test/admin-businesses-list-kpis.test.ts > KPIs e filtros de /admin/empresas calculados sobre a carteira inteira > conta inadimplentes, incompletas, planos e Pedra Fundamental de toda a carteira
- test/admin-businesses-list-kpis.test.ts > KPIs e filtros de /admin/empresas calculados sobre a carteira inteira > filtra inadimplentes e incompletas e mostra a situação de pagamento real
- test/admin-businesses-list-kpis.test.ts > KPIs e filtros de /admin/empresas calculados sobre a carteira inteira > filtra por Pedra Fundamental e por plano mesmo quando a empresa está depois da primeira página
- test/admin-businesses-list-kpis.test.ts > KPIs e filtros de /admin/empresas calculados sobre a carteira inteira > pagina sobre o resultado filtrado
- test/advertiser-results-etapa-c.test.tsx > Contador de Views por Atualização nos Cards das Empresas > exibe contador de visualizações no BusinessListCard quando views_count estiver definido
- test/advertiser-results-etapa-c.test.tsx > Etapa C — Painel do Anunciante (/anunciante/resultados) > apresenta a Área 2 de Interesse Comercial com os 5 canais e a nota de transparência
- test/analytics-sprint3-events.test.tsx > envio ao GA4 com consentimento estrito e fila > com consentimento, evento disparado antes do GA ficar pronto sai quando ele fica (não se perde o primeiro view_business)
- test/analytics-sprint3-events.test.tsx > envio ao GA4 com consentimento estrito e fila > depois de pronto envia direto e higieniza os parâmetros
- test/analytics-sprint3-events.test.tsx > envio ao GA4 com consentimento estrito e fila > recusar descarta a fila pendente
- test/analytics-sprint3-events.test.tsx > envio ao GA4 com consentimento estrito e fila > sem consentimento nada é enviado nem guardado
- test/analytics-sprint3-events.test.tsx > envio ao GA4 com consentimento estrito e fila > trackGaOnce dispara no máximo uma vez por sessão e não gasta a chance sem consentimento
- test/checkpoint-advertiser-portal-routing-audit.test.ts > Checkpoint de Auditoria Corretiva — Rotas Críticas & Navegação do Portal do Anunciante > 5. Results & Human-Centric Phrasing — Valida DTO de resultados comercial em linguagem humana
- test/checkpoint-billing-etapa1.test.ts > BLOCO 7 — ETAPA 1: Gateway Asaas & Webhook Reconciler Canônico > 1. AsaasBillingAdapter deve parser PAYMENT_RECEIVED para payment_confirmed com campos canônicos
- test/checkpoint-empresas-360-refinement.test.ts > Gestão de Carteira e Prontuário 360º de Empresas (/admin/empresas) > 2. Topo Executivo do Prontuário 360º com cotas e analytics 30d
- test/checkpoint-empresas-360-refinement.test.ts > Gestão de Carteira e Prontuário 360º de Empresas (/admin/empresas) > 5. Criação de Serviço no Prontuário 360º não falha por empresa não localizada
- test/checkpoint6-integrated-e2e.test.ts > CHECKPOINT 6 — SUÍTE E2E INTEGRADA DA V1 ATUALIZADA > 6. Analytics: registro atômico de pageview e clique no WhatsApp
- test/lodge-potency.test.ts > canonicalPotencyCode > não mexe no que não termina em UF
- test/no-silent-db-writes.test.ts > gravações no banco não podem ignorar erro > src/lib/admin/admin-advertiser-create-service.ts
- test/no-silent-db-writes.test.ts > gravações no banco não podem ignorar erro > src/lib/admin/admin-businesses-service.ts
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Aceitar consentimento: armazena "granted" no localStorage
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Expiração: se o consentimento tiver mais de 365 dias, readConsent retorna null para renovação
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Preservação de cookies essenciais: clearGaCookies apaga apenas cookies _ga, preservando tokens essenciais
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Recusar consentimento: armazena "denied" e aciona limpeza de cookies _ga
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Revogar consentimento: remove cookies existentes e atualiza estado para "denied"
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Versão da política: se a versão salva divergir da atual, requer novo consentimento
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Visitante novo: readConsent retorna null e nenhum cookie GA4 é ativado por padrão
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Voltar ao site após aceitar: mantém consentimento "granted"
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > Voltar ao site após recusar: mantém consentimento "denied"
- test/phase1-security-and-lgpd.test.ts > ETAPA 1 — Testes de Segurança, LGPD e Privacidade > 1. GA4 — Consentimento Estrito (Consent Mode Básico) > openCookiePreferences dispara evento CustomEvent("open-cookie-preferences")
- test/public-shell-architecture.test.ts > public shell isolation > mantém a identidade do menu móvel e a cidade da empresa no cabeçalho
