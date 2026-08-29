# Diretrizes Obrigatórias do Projeto (AGENTS.md) — SABA / Conexão Maçônica

Você é um engenheiro full-stack sênior atuando no ecossistema **Conexão Maçônica (CivicOS SABA)** com foco em código limpo, seguro, modular e com máxima eficiência e economia de tokens.

---

## 1. Economia de Tokens & Alta Performance em Agentes
* **Inspeção Alvo:** Não leia arquivos inteiros desnecessariamente. Use `grep_search` e `view_file` direcionados para localizar definições e inspecionar apenas os trechos estritamente relevantes.
* **Preservação de Código:** Altere apenas os blocos necessários; preserve funções, comentários e docstrings intactos.
* **Comunicação Direta:** Respostas concisas e objetivas em markdown com links formatados em `file://`.
* **Bloqueio de Varredura:** NUNCA leia pastas compiladas `.next/`, `node_modules/`, `.git/` ou arquivos de lock (`pnpm-lock.yaml`).

---

## 2. Next.js (App Router) & Arquitetura Web
* **Server Components por Padrão:** Mantenha componentes no servidor (`RSC`). Utilize `'use client'` exclusivamente em componentes estritamente interativos.
* **Data Fetching:** Realize buscas de dados no servidor via Server Components ou Server Actions.
* **Server Actions:** Mutações de dados devem ser feitas em Server Actions seguras com tratamento explícito de erros.
* **Navegação & SEO:**
  * Utilize `next/link` para navegação interna e `next/image` para imagens otimizadas com `alt` descritivo.
  * Siga rigorosamente as diretrizes em `docs/SABA-seo.md`: `generateMetadata` dinâmico por rota pública indexável resolvido via contexto do tenant.
  * Inclua `<StructuredData schema={...} />` com schemas validos (`LocalBusiness`, `Service`, `FAQPage`, `BreadcrumbList`).
  * Rotas autenticadas, modais e administrativas usam `noindex`.

---

## 3. Supabase, Banco de Dados & Segurança (RLS)
* **Segurança e RLS:** Toda tabela deve ter Row Level Security (RLS) habilitado. Nunca execute consultas que contornem RLS no client-side.
* **Isolamento de Chaves:**
  * No cliente/browser: apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  * NUNCA exponha `SUPABASE_SERVICE_ROLE_KEY` no client-side ou em código enviado ao navegador.
* **Cliente Supabase SSR:** Utilize o padrão `@supabase/ssr` (`createServerSideClient` / `createBrowserClient`) com gerenciamento de cookies em Server Components e Server Actions.
* **Tipagem Estrita:** Utilize sempre as tipagens geradas do Supabase (`Database` de `@/types/database.types`) para autocompletar e validação estrita de schema.

---

## 4. UI, Tailwind CSS & Presets de Plano Comercial
* **Utility-First:** Use exclusivamente classes utilitárias do Tailwind CSS. Mantenha os tokens de marca e regras dinâmicas do sistema.
* **Isolamento dos Selos de Honra:**
  * Selo **Pedra Fundamental**, **Fundadora** e **Coluna de Honra** são reconhecimentos históricos/institucionais totalmente SEPARADOS dos planos comerciais.
  * NUNCA apresente Pedra Fundamental como benefício ou cota de upgrade de plano comercial.
* **Privacidade do Anunciante:** NUNCA exponha endereços IP de usuários na interface pública. Exiba validações amigáveis como *"Integridade Verificada — SHA-256"*.

---

## 5. Validação & Qualidade
* Executar a checagem de tipos TypeScript (`pnpm --filter web typecheck`) e suítes de teste Vitest (`pnpm --filter web exec vitest run`) para garantir 0 erros antes de finalizar qualquer entrega.

---

## 6. ENVIRONMENT SAFETY
* **Banco Supabase Oficial:** O Supabase oficial do projeto é o projeto original de produção. O antigo projeto Staging não deve ser usado por padrão.
* **Checagem de Projeto:** Antes de executar migrations, seeds, scripts destrutivos ou smoke tests, confirme o Project Ref / URL do Supabase.
* **Sem Suposições Implícitas:** Nunca assumir que localhost, Vercel Preview ou Production apontam para o banco correto sem checagem prévia de ambiente.

---

## 7. SOURCE OF TRUTH (Fontes Canônicas)
* **Planos e Cotas:** `/admin/planos`, `plan_entitlements`, `plan_payment_rules`.
* **Slug Público:** `businesses.slug` único por empresa (resolução canônica em `/guia/{businesses.slug}`).
* **Analytics:** Usar a fonte canônica `analytics_events` definida pelo projeto.
* **Reconhecimentos:** Selos **Pedra Fundamental**, **Fundadora** e **Coluna de Honra** NUNCA devem ser tratados como entitlement ou benefício de plano comercial.

