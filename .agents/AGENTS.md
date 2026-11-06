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

---

## Paridade e Sincronização Obrigatória nas 4 Plataformas (Web + Web Mobile + App iOS + App Android)

Toda e qualquer correção, ajuste funcional, alteração de regras de negócio, dados contratuais, fluxos de autenticação, telas ou layouts deve ser obrigatoriamente replicada e verificada de forma consistente nas **4 plataformas**:

1. **Web Desktop** (`apps/web`): Telas e fluxos em resolução desktop / widescreen.
2. **Web Mobile** (`apps/web`): Responsividade em navegadores móveis (`touch`, drawers, viewport adaptativo).
3. **App iOS** (`apps/mobile`): Aplicação Capacitor empacotada para iOS (`apps/mobile/ios-overrides/`, safe-areas, status bar).
4. **App Android** (`apps/mobile`): Aplicação Capacitor empacotada para Android (`apps/mobile/android-overrides/`, hardware back, splash).

### Checklist de Execução Obrigatório
* Ao corrigir uma regra de negócio ou lógica na Web, inspecionar e atualizar imediatamente o módulo equivalente no Mobile (`apps/mobile`), garantindo paridade em iOS e Android.
* Ao realizar ajustes de interface, validar no viewport desktop e mobile (Web Mobile) e aplicar os estilos correspondentes no app móvel (`apps/mobile/src/styles.css`).
* Garantir 0 erros nos dois ecossistemas antes de finalizar qualquer entrega:
  - `pnpm --filter web typecheck` && `pnpm --filter web exec vitest run`
  - `pnpm --filter mobile typecheck` && `pnpm --filter mobile test`
