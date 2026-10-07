# Diagnóstico inicial de SEO — Fase 0

Data: 2026-10-07 · Tipo: auditoria somente leitura (nenhum arquivo do projeto foi alterado) ·
Domínio canônico: `https://www.conexaomaconica.com.br`

Método: leitura do código, requisições HTTP ao site em produção (com user agent do Googlebot), consultas de leitura ao
banco oficial (`rwvztwsjcjljphqttiws`). Não medido: Core Web Vitals reais (PageSpeed devolveu 429 por limite sem chave
de API; não há dados de campo/CrUX ainda), hydration e INP (exigem navegador), tamanho de bundles (não foi executado
`next build`).

## 1. Stack

- Next 15.5.20, React 19.2, App Router, Metadata API nativa (sem next-seo / next-sitemap).
- 149 arquivos de rota: admin 44, anunciante 18, `(public)` 15, design-lab/visual-lab 24, api 5.
- Fonte: Inter via `next/font/google`. Imagens remotas liberadas só do Supabase Storage.
- Redirects: apex -> www (308); `/guia/` -> `/guia` (308); `/anunciar` -> `/anunciar/passo-1` (307).

## 2. Problemas encontrados

### CRÍTICO

1. **Diagnóstico interno público e indexável** — `app/diagnostics/page.tsx`, `app/health/page.tsx`. Páginas client que
   exibiam o JSON do kernel (versão, linha do tempo de boot), com `index, follow`. O diagnóstico também era serializado no
   HTML de todas as páginas (layout raiz). Correção: ver Sprint 1.

### ALTO

2. **Funil de cadastro indexável e no sitemap** — `/anunciar`, `/anunciar/passo-1` (`index, follow`) e `sitemap.ts`.
3. **Nenhuma página pública cacheável** — `app/layout.tsx` (cookies/headers) e `src/middleware.ts` (`auth.getUser()` em toda
   requisição). `Cache-Control: private, no-store`, `X-Vercel-Cache: MISS`, TTFB 0,6–2,8 s.
4. **GA4 só no layout `(public)`** — sem GA em `/login`, `/register`, `/anunciar/*`, `/cadastro`, `/contratacao`,
   `/eventos/[slug]`, `/presenca`.
5. **Eventos GA4: 7 de 19 do README**; só `business_slug` como parâmetro; `click_directions` x `click_route`.
6. **Categorias inconsistentes** na tabela `categories` (49 linhas, com/sem acento) x texto livre `businesses.category`.
7. **Páginas de loja** (6.898 registros em `organizations`): indexáveis, sem canonical, ~120 palavras, fora do sitemap.

### MÉDIO

8. Canonical ausente em `/guia/eventos`, `/guia/beneficios`, `/termos`, `/privacidade`, `/guia/lojas/{slug}`, `/login`.
9. Canonical sem `www` em `/guia/empresas`, `/guia/lojas`, `/guia/lojas/{slug}` (endereço fixo no código).
10. Título com marca duplicada e longo (65–88 caracteres) em eventos, benefícios, termos, privacidade, login, cadastro,
    contratação, 404; `/register` com título "Entrar".
11. `/guia` (309 KB de HTML, 4.126 palavras, 39 de 42 imagens sem dimensões) e `/guia/lojas` (602 KB, 10.685 palavras).
12. 132 `<img>` em 63 arquivos contra 22 arquivos com `next/image`.
13. Perfil da empresa com `BreadcrumbList` em JSON-LD sem breadcrumb visível e sem links para cidade/categoria.
14. Sitemap: `lastModified: now` nas estáticas; sem eventos, benefícios e lojas; sem sitemap index.
15. `robots.txt` bloqueia só `/admin/`, `/dashboard/`, `/api/`, `/diagnostics/`.
16. Duplicação: `/guia` x `/guia/empresas`. **Correção (2026-10-07):** `/presenca` NÃO duplica `/eventos/conexao-empresarial-2026`; é só um redirect 307 para ele (o rastreador seguia o redirect e media a página final).
17. Páginas finas: `/guia/eventos`, `/guia/beneficios` (~100 palavras), `/guia/empresas` sem filtro (197 palavras).
18. `/pesquisa` (redirect para `/pesquisas/perfil-e-negocios`) indexável.
19. 227 de 400 arquivos `.tsx` são `'use client'` (53 de 76 em `components/public`).
20. Home: JSON-LD válido, mas `Organization` sem `sameAs` e `Event` sem `endDate`/`image`/`offers`.

### BAIXO

21. Cadeia de redirect `http://apex` -> `https://apex` -> `https://www`.
22. `/guia/OpticaCirculo` responde 200 (canonical correto).
23. Selos `.webp` de 306–347 KB (1254x1254) usados em 112–224 px; `capafallback.png` 254 KB.
24. ESLint ignorado no build (`eslint.ignoreDuringBuilds`).
25. Imagens sem `alt` em `/guia` (3) e `/guia/empresas` (3).

### Decisão

26. **Padrão de URL**: README previa `/empresas/*`; decidido em 2026-10-07 manter `/guia/*` como canônico.

## 3. O que já estava correto

Empresa com title/canonical/OG/`LocalBusiness`; cidade e categoria com limite mínimo de empresas; filtros e busca
`noindex, follow`; rotas privadas redirecionam ao login (`noindex`); design-lab/visual-lab dão 404 em produção; 404 com
status 404; HSTS; `lang="pt-BR"`; redirect 308 de slug alterado; robots liberando crawlers de IA; GA4 sem envio
duplicado e com consentimento negado por padrão.

## 4. Dados (banco oficial)

- `businesses`: 4 (3 publicadas, 1 rascunho sem slug). Slugs sem duplicata; estado `BA`; cidade `Feira de Santana`.
- 2 das 3 publicadas com descrição < 50 caracteres; nenhuma descrição repetida.
- Eventos: 1 evento público em `platform_events`; `business_events` não têm slug nem página própria.
- Benefícios: 1 ativo, sem página própria. Lojas: 6.898 registros em `organizations`.

## 5. Ordem recomendada de implementação

- **Sprint 1 — Crítico**: itens 1, 2, 9, 18 (e sitemap).
- **Sprint 2 — Indexação e rastreamento**: 8, 10, 14, 15, 16, 21, 22 e política das lojas (7).
- **Sprint 3 — Analytics**: 4, 5.
- **Sprint 4 — Metadata e SEO técnico**: 13, 17, 25, 6.
- **Sprint 5 — Dados estruturados**: 20.
- **Sprint 6 — Performance**: 3, 11, 12, 19, 23, medição real de CWV.
- **Sprint 7 — SEO programático**: 6, 7, páginas de estado/loja/evento/oferta, sitemap index.
- **Sprint 8 — Growth e conversão**: funil GA4, Search Console API, conteúdo, perfis oficiais.
