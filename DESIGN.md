---
name: CivicOS
description: Infraestrutura de confiança verificada para comunidades reais — uma oficina de arquitetura escura, precisa e sóbria.
colors:
  primary: "oklch(0.58 0.2 260)"
  primary-hover: "oklch(0.5 0.2 260)"
  primary-active: "oklch(0.43 0.18 260)"
  primary-subtle: "oklch(0.93 0.04 260)"
  ink: "oklch(0.2 0.008 250)"
  ink-muted: "oklch(0.44 0.014 250)"
  ink-faint: "oklch(0.7 0.01 250)"
  ink-inverse: "oklch(0.98 0.002 250)"
  paper: "oklch(0.98 0.002 250)"
  surface: "oklch(0.95 0.004 250)"
  workbench: "oklch(0.13 0.006 250)"
  panel: "oklch(0.2 0.008 250)"
  rail: "oklch(0.28 0.01 250)"
  line-strong: "oklch(0.37 0.012 250)"
  line: "oklch(0.44 0.014 250)"
  success: "oklch(0.65 0.18 145)"
  warning: "oklch(0.75 0.16 80)"
  danger: "oklch(0.6 0.22 25)"
  info: "oklch(0.65 0.15 230)"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
  mono:
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
    height: "40px"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
    height: "40px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "40px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.line-strong}"
    rounded: "{rounded.full}"
    padding: "8px 10px"
  nav-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "40px"
---

# Design System: CivicOS

## Overview

**Creative North Star: "A Oficina de Arquitetura"**

O CivicOS é uma oficina de arquitetura em funcionamento: uma mesa de trabalho escura onde cada medida é verificada antes de ser carimbada. A superfície padrão é grafite frio (quase preto, com entonação azulada de luz de luminária), os painéis repousam um degrau acima, e as ações que avançam o trabalho são desenhadas com um único índigo institucional — a tinta da caneta que assina a planta. Nada aqui é decorativo ou clamoroso: a credibilidade vem da precisão, da moderação cromática e da repetição exata das regras.

A densidade é confortável por padrão (alturas mínimas de 40px em controles, ritmo de 16–24px entre blocos), com `compact` disponível para tenants que precisam de mais informação por tela. O modo escuro é a identidade da oficina; o modo claro ("papel") existe e é igualmente suportado pelos tokens, mas o desenho de referência — a mesa à noite — é o que distingue a plataforma. Status são carimbos: verde, âmbar, vermelho e azul em tintas pastéis de fundo, sempre com texto em contraste AA; eles informam, nunca decoram.

Movimento é discreto e físico: 100–300ms, easing padrão, e uma micro-pressão (escala 0.98) nos cliques — o gesto de quem confere um ponto de projeto. Tenants têm um guarda-roupa próprio (camada de marca Layer 1: cor primária, acento, raio, densidade, fonte) injetado em runtime via `#tenant-brand`; esse guarda-roupa pode re-colorir a oficina, mas o piso de contraste e os selos de status são intocáveis.

**Key Characteristics:**
- Mesa de trabalho escura: fundo grafite (oklch 0.13 hue 250), painéis e trilhos em grafites frios de baixa saturação.
- Um único índigo de ação ("The One Ink"), usado com parcimônia (≤10% da tela).
- Tipo única: Inter em toda a hierarquia; JetBrains Mono exclusivo para identidade técnica (IDs, hashes, selos de tempo).
- Cantos medidos, nunca caricaturais: 6/8/12/16px; pills (9999px) reservadas a badges, perfis e scrollbars.
- Elevação híbrida: cartões planos por padrão; sombras aparecem como resposta a estado, não como decoração.
- Selos de status pastéis com piso AA 4.5:1; acessibilidade é regra de obra, não revisão.
- Ritmo de 4px; motion 100–300ms com easing padrão e micro-pressão em ações.
- Guarda-roupa do tenant: re-colorir primário/acento/raio/densidade/fonte via CSS vars — nunca o contraste, nunca os selos.

## Colors

Paleta fria, institucional e de baixa saturação: grafites azulados como corpo, um único índigo como ação e selos pastéis como estado. Cores quentes (âmbar) existem apenas como sinal.

### Primary
- **Índigo de Tinta** (`oklch(0.58 0.2 260)`): a única cor de ação da plataforma. Botão primário, link, foco e item de navegação ativo. Hover escurece para `oklch(0.5 0.2 260)`, active para `oklch(0.43 0.18 260)`; o fundo sutil `oklch(0.93 0.04 260)` marca seleção e hover de superfícies.
- **Atenção de obra:** os componentes hoje usam Tailwind `blue-600` (`#2563eb`, ~`oklch(0.546 0.245 263)`) nos botões — mesma família, leitura equivalente; a fonte normativa é a escala `--color-primary-*` do tokens.css.

### Neutral
- **Grafite Noite** (`oklch(0.13 0.006 250)`): fundo de página no modo escuro.
- **Grafite Painel** (`oklch(0.2 0.008 250)`): cartões, sidebar, dialogs e fundo de inputs.
- **Grafite Trilho** (`oklch(0.28 0.01 250)`): botão secundário, trilhas e hover de superfícies.
- **Grafite Aço** (`oklch(0.37 0.012 250)`): borda forte, texto de selo neutro.
- **Grafite Meia** (`oklch(0.44 0.014 250)`): borda padrão e texto secundário.
- **Pérola** (`oklch(0.98 0.002 250)`): fundo de página no modo claro e texto inverso no escuro.
- **Tinta Alta / Média / Baixa** (`oklch(0.2 0.008 250)` / `oklch(0.44 0.014 250)` / `oklch(0.7 0.01 250)`): hierarquia de texto. Tipos nunca ganham cor — só o degrau de tinta.

### Status (selos)
- **Verde Selo** (`oklch(0.65 0.18 145)`): sucesso/aprovado. **Âmbar de Sinal** (`oklch(0.75 0.16 80)`): atenção/pendência. **Vermelho Perigo** (`oklch(0.6 0.22 25)`): erro, ação destrutiva. **Azul Navegação** (`oklch(0.65 0.15 230)`): informação. Cada selo tem par de fundo/texto/borda pastel (tintas `--status-*-bg` em ~oklch 0.22–0.24 com texto claro no escuro; ~0.95 com texto escuro no claro).

### Camada do tenant (The Tenant Wardrobe)
Tenants recebem em runtime um bloco `#tenant-brand` de CSS vars: escala primária (10 passos gerada do `primaryColor` hex), `accentColor`, radius (sm/md/lg/xl), density (comfortable/compact), `fontFamily`, `logoUrl`/`faviconUrl`/`appName` e `colorMode` (light/dark/auto). O guarda-roupa re-colorir e re-medir a oficina; ele **não** altera os selos de status, o piso de contraste AA nem a tipografia de identidade técnica.

### Named Rules
**The One Ink Rule.** O índigo primário ocupa ≤10% de qualquer tela. Sua raridade é o ponto: quando o azul aparece, é porque algo pede ação.
**The Status Shield Rule.** Selos de status são blindados contra branding de tenant — jamais re-coloridos ou re-iluminados; o AA 4.5:1 é o piso de obra.
**The AA Floor Rule.** Todo texto — inclusive o inverso, o de selo e o de placeholder — respeita contraste ≥4.5:1 contra o fundo. Não se "afina" tinta para efeito.

## Typography

**Display/Body Font:** Inter, de `--font-sans` no tokens.css (stack completa: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`).
**Label/Mono Font:** JetBrains Mono (fallbacks Fira Code, Cascadia Code, monospace).

**Character:** Uma voz tipográfica única, utilitária e sem floreios — a letra de quem desenha planta, não de quem faz convite. Hierarquia por peso e tamanho com `tracking-tight` em títulos; o texto nunca compete com a cor.

### Hierarchy
- **Display** (700, 2.25rem, 1.25, tight): páginas de destino e cabeçalhos de landings; raro no produto.
- **Headline** (600, 1.875rem, 1.25, tight): títulos de página internos.
- **Title** (600, 1.25rem, 1.3, tight): títulos de seção e cabeçalhos de painéis.
- **Body** (400, 1rem, 1.5): texto corrente; manter 65–75ch por linha para leitura contínua.
- **Label** (500, 0.75rem): rótulos de campo, helper e botões small; labels de grupo na navegação usam 10px bold uppercase com `tracking-widest`.
- **Mono** (400, 0.875rem): IDs, hashes, carimbos de tempo e qualquer cadeia de identidade técnica — nunca para texto corrente.

### Named Rules
**The Single Voice Rule.** Inter em tudo. Não há display serifada, não há fonte de créditos; distinção é peso, nunca família.
**The Mono-For-Identity Rule.** Se é um identificador (ID, hash, timestamp), é JetBrains Mono. Se é prosa, é Inter.

## Layout

Ritmo de 4px derivado da escala `--space-*` (4, 8, 12, 16, 20, 24, 32, 40, 48px). A aplicação usa um rail de navegação fixo de 256px (`w-64`) com cabeçalho de 64px (`h-16`), conteúdo fluido com `gap-2` (8px) entre itens e `gap-4` (16px) entre grupos.

- **Densidade:** confortável por padrão — controles com `min-h-40px`, padding de campo 12/14px, cartões `p-5` (20px). Density `compact` reduz passos de espaço para telas densas de tenant.
- **Breakpoints** (tailwind): sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536px. O rail colapsa abaixo de `md` para overlay com backdrop blur; conteúdo empilha em coluna única no mobile.
- **Formulários e dialogs:** colunas de formulário e diálogos modais usam largura medida (cerca de 560–640px de painel), campos `w-full` empilhados com `space-y-1.5`.
- **Grades:** `grid gap-0.5/2` para listas de ações e `gap-4/6` para seções; sem grades "decorativas" — cada coluna existe porque um dado pede.

## Elevation & Depth

Híbrido deliberado: cartões e superfícies são **planos na medida do possível** — profundidade primária vem do layering tonal (Noite > Painel > Trilho), com sombras reservadas a estados e sobreposição. O modo claro usa o mesmo vocabulário, com sombras mais suaves.

### Shadow Vocabulary
- **xs** (`0 1px 2px oklch(0 0 0 / 0.05)`): separação de linha; raro.
- **sm** (`0 1px 3px oklch(0 0 0 / 0.10), 0 1px 2px oklch(0 0 0 / 0.06)`): hover sutil de itens clicáveis.
- **md** (`0 4px 6px oklch(0 0 0 / 0.10), 0 2px 4px oklch(0 0 0 / 0.06)`): sombra de suporte em botões primários e perigosos (`shadow-{color}/20`).
- **lg** (`0 10px 15px oklch(0 0 0 / 0.10), 0 4px 6px oklch(0 0 0 / 0.05)`): dropdowns, popovers, toasts.
- **xl** (`0 20px 25px oklch(0 0 0 / 0.10), 0 8px 10px oklch(0 0 0 / 0.04)`): dialogs e cartões elevados (`shadow-black/40` no modo escuro).
- No modo escuro as mesmas sombras intensificam para alphas 0.30/0.40 — a oficina à noite tem luz própria.

### Named Rules
**The Flat-By-Default Rule.** Superfícies são planas em repouso. Sombra aparece como resposta a estado (hover, foco, diálogo, elevação explícita) — nunca como decoração permanente.

## Shapes

Corners medidos e funcionais, da família 6→24px: `sm` 6px (elementos pequenos), `md` 8px (botões, inputs, itens de nav, selects), `lg` 12px (cartões, painéis, dialogs), `xl` 16px (agrupamentos maiores), `2xl` 24px (cartões de destaque/seção hero). Pills (`9999px`) apenas para badges, avatares, chips de perfil e handles de scrollbar. Form language: suave o bastante para parecer instrumento, não brinquedo.

**The Measured Corner Rule.** Botão nunca é pill. Se um canto vira pill fora de badge/avatar, a peça saiu da oficina.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px); sizes sm (min 32px), md (min 40px, padrão), lg (min 48px), icon (40×40px quadrado).
- **Primary:** fundo Índigo de Tinta, texto Pérola, `shadow-md` do próprio azul a 20% (px-4/24px de padding). Hover clareia um degrau, active escurece; clique comprime para `scale-[0.98]` com transição 200ms.
- **Hover/Focus:** foco visível é anel de 2px no índigo com `ring-offset-2`; disabled em `opacity-50` sem cursor.
- **Secondary:** Grafite Trilho + texto Pérola + borda Grafite Aço. **Outline:** transparente + borda de trilho, texto Pérola. **Ghost:** texto Pérola dim, hover com fundo `slate-800/50`. **Danger:** Vermelho Perigo + texto Pérola + sombra do próprio vermelho.
- Nenhum botão usa gradiente; texto do botão é curto e imperativo.

### Inputs / Fields
- **Style:** fundo Grafite Painel, borda de 1px Grafite Meia, `rounded-lg` (8px), padding 12/14px, texto 14px. Labels acima em Label (12px, 500); helper em tinta baixa; placeholder em tinta baixa — nunca abaixo do AA.
- **Focus:** anel de 2px Índigo com `outline-none`; hover sobe a borda um degrau (Grafite Aço).
- **Error/Disabled:** borda Vermelho Perigo + anel vermelho no foco, mensagem 12px no vermelho; disabled `opacity-50` com fundo Noite.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px). **Background:** Grafite Painel (Padrão); variante `elevated` ganha `shadow-xl shadow-black/40`; `bordered` usa fundo Noite com borda Aço; `glass` usa Painel a 60% + `backdrop-blur-md`.
- **Border:** 1px Grafite Trilho (padrão). **Internal Padding:** `p-5` (20px) no corpo, `p-5 pb-3` no header, `pt-0` no content; footer com `border-t` de trilho a 60% sobre Noite a 40%.
- Títulos de card: 16px, semibold, `tracking-tight`, branco; descrição: 12px tinta média, `leading-relaxed`.

### Badges
- **Style:** pill (`rounded-full`), `font-medium`, borda de 1px, com fundo/texto/borda por selo (`--status-*`): neutral (Pérola/grafite Aço), info, success, warning, danger e accent (fundo `--accent-subtle`, texto `--accent`, borda foco). Sizes: sm (10px, px-2) e md (12px, px-2.5 py-1).

### Navigation
- Rail fixo 256px, fundo Painel, `border-r` de grafite; cabeçalho de marca com 64px e `border-b`; item ativo em Índigo com texto Pérola; hover em `muted`; ícones lucide 16px com micro-escala 1.1 no hover; labels de grupo em 10px bold uppercase `tracking-widest`; subitens recuados com `border-l`.
- **Nota de obra (drift):** o `Sidebar` atual referencia tokens legados shadcn (`bg-primary`, `text-muted-foreground`, `bg-muted`) que não existem mais no config — o item ativo e o hover não resolvem cor. Navegação nova deve usar o conjunto semântico (`accent`, `bg-secondary`, `text-secondary`, `border-default`).

### Signature: Brand Studio (Guarda-roupa do Tenant)
O Brand Studio (`/admin/marca`) é o painel onde o tenant remonta sua camada de identidade: paleta primária com escala gerada de 10 passos, acento de contraste validado por badge AA, logo/favicon por URL, raio, densidade, fonte e modo de cor — com preview ao vivo global e `#brand-preview` escopado. Padrão da plataforma para qualquer página de identidade white-label.

## Do's and Don'ts

### Do:
- **Do** manter o corpo da tela no grafite frio (hue 250–264, saturação baixa) e o azul de ação na família índigo — verde, rosa ou violeta nunca são ação.
- **Do** usar o degrau de tinta (High/Média/Baixa) para hierarquia de texto; cor para texto é reservada a links e erros.
- **Do** entregar contraste AA 4.5:1 em todo texto, inclusive placeholder, helper, selo e texto em botão.
- **Do** usar os tokens semânticos (`--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--status-*`) e a escala `--color-primary-*`; não introduzir famílias de cor novas.
- **Do** tratar o guarda-roupa do tenant como camada: re-colorir primário/acento/raio/densidade/fonte via `#tenant-brand` sem tocar selos, foco AA e mono.
- **Do** micro-pressão (scale 0.98) e transições de 200ms como gramática de clique padrão.

### Don't:
- **Don't** usar pill em botões ou cantos maiores que 16px em controles de 40px de altura.
- **Don't** re-colorir selos de status por tenant, tema ou humor de página — eles são o piso informacional.
- **Don't** adicionar fontes decorativas; se não é Inter (ou mono para identidade), não é do sistema.
- **Don't** criar profundidade com sombras permanentes; superfícies planas em repouso, layering tonal como meio de contraste.
- **Don't** reintroduzir classes legadas shadcn (`bg-primary`, `text-muted-foreground`, `bg-card` sem definição); resolver contra o config atual.
- **Don't** deixar placeholder, disabled ou helper abaixo de AA "porque é secundário".