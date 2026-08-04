# Directivas Obrigatórias do Projeto (AGENTS.md)

## SEO, Arquitetura de Conteúdo e Marketing de Posicionamento (SABA-seo.md)

Sempre que você criar, refatorar ou ajustar páginas, componentes de layout, metadata ou estruturas de rotas, aplique ESTRITAMENTE as regras de SEO e Marketing de Posicionamento consolidadas em `docs/SABA-seo.md`:

1. **Metadata por Página (Next.js App Router)**:
   - Toda página deve exportar `generateMetadata` (dinâmico) ou `metadata` (estático) próprio com:
     - `title`: Termo principal | Conexão Maçônica (~60 caracteres)
     - `description`: Meta description persuasiva com CTA (~155 caracteres)
     - `alternates.canonical`: URL canônica completa
     - `openGraph`: title, description, url, siteName, locale, type

2. **Dados Estruturados (JSON-LD)**:
   - Toda página de conteúdo ou serviço deve incluir o componente `<StructuredData schema={...} />`.
   - Utilizar os schemas adequados: `SoftwareApplication` / `Product` (SaaS), `Service` (páginas-pilar), `FAQPage` (seções de perguntas), e `BreadcrumbList` (navegação interna).

3. **Performance e Core Web Vitals**:
   - Utilizar fontes via `next/font/google` (`Inter`), NUNCA tags `<link>` externas para Google Fonts.
   - Utilizar `next/image` com `alt` descritivo e dimensões explícitas.
   - Manter Server Components por padrão; limitar `"use client"` apenas a componentes estritamente interativos.

4. **Guardrails Antispam e Qualidade de Conteúdo**:
   - NUNCA implementar geo-spam (listas extensas de cidades sem conteúdo real).
   - NUNCA criar doorway pages / thin content (páginas duplicadas alterando apenas palavras-chave).
   - NUNCA praticar keyword stuffing.

5. **Checklist de Página-Pilar**:
   - H1 natural com termo principal.
   - Parágrafo de abertura direto (2-3 frases).
   - H2s cobrindo subtemas e diferenciais.
   - Seção de FAQ (2-3 perguntas alimentando o schema `FAQPage`).
   - CTA claro (Demo/Cadastro para SaaS, Orçamento/WhatsApp para serviços).
