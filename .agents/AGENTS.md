# Directivas Obrigatórias do Projeto (AGENTS.md)

## SEO, Arquitetura de Conteúdo e Marketing de Posicionamento (SABA-seo.md)

Sempre que você criar, refatorar ou ajustar páginas públicas, componentes de layout, metadata ou estruturas de rotas, aplique as regras de SEO e Marketing de Posicionamento consolidadas em `docs/SABA-seo.md`, observando estritamente os seguintes princípios:

1. **Metadata por Rota Pública Indexável (Next.js App Router)**:
   - Toda **rota pública indexável** deve exportar `generateMetadata` (dinâmico) ou `metadata` (estático) resolvido via contexto do tenant (`host -> tenant -> produto -> rota`).
   - Rotas autenticadas, administrativas, modais e operacionais devem utilizar `noindex` ou exclusão no `robots.ts`.
   - NUNCA fixar metadados estáticos de um único tenant no layout raiz global da plataforma.

2. **Dados Estruturados (JSON-LD)**:
   - Toda página pública de conteúdo, serviço ou produto deve incluir o componente `<StructuredData schema={...} />` coerente com o conteúdo real e visível da tela.
   - Utilizar os schemas adequados (`SoftwareApplication`, `Service`, `FAQPage`, `BreadcrumbList`, `LocalBusiness`), sem promessa de rich result garantido.

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
   - Parágrafo de abertura direto e autocontido.
   - H2s cobrindo subtemas e diferenciais reais.
   - Seção de FAQ quando trouxer benefício real ao usuário (alimentando o schema `FAQPage`).
   - CTA claro (Demo/Cadastro para SaaS, Orçamento/WhatsApp para serviços).
