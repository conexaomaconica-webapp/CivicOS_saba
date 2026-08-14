# Design Record: Conexão Maçônica

> Fonte executável do preset v1: `src/domain/theme.ts`. A arquitetura normativa
> do ecossistema está em
> `docs/products/conexao-maconica/engineering/FASE_1B_DESIGN_SYSTEM_WHITE_LABEL.md`.
> Para o preset v1, `#7A1F2E` é a primária e `#4A0E1A` a secundária. Este arquivo
> não autoriza cores ou conceitos maçônicos no White Label Core.

<!-- This is the Layer 1 (client brand) record. Layer 0 (the CivicOS platform) lives in the root DESIGN.md and is the system's normative source; the root .impeccable/design.json is the platform sidecar. This file documents the brand seed applied to the `grande-oriente-sp` tenant at seed time and enforced by the Brand Studio runtime injection. -->

## Overview

**Creative North Star: "A Sala de Pedra"**

A Conexão Maçônica veste o guarda-roupa da plataforma com a identidade de uma instituição que se prova pelo tempo: bordô profundo como a pedra das paredes, dourado como metal de insígnia. A identidade herda da Oficina a precisão e a sobriedade — e acrescenta gravidade: este é um espaço de relação entre irmãos, não uma vitrine.

A tela vive em modo claro (marfim/papel), com o bordô ocupando a tinta de ação institucional e o dourado reservado a selos, marcas de destaque e detalhes de insígnia — nunca em massa, nunca como cor de call-to-action contínuo. O contraste é o da plataforma: AA 4.5:1 como piso, com o ouro aplicado apenas sobre bordô profundo ou como acento com fundo validado pelo Brand Studio.

**Key Characteristics:**
- Modo claro por padrão; Bordô Profundo (#4A0E1A) como cor de ação e identidade.
- Bordô Real (#7A1F2E) como passo intermediário: gradientes, estados de hover, elementos secundários.
- Dourado (#C9A227) como acento cerimonial em superfícies pequenas; Dourado Claro (#E8C767) apenas como realce sobre fundo escuro (títulos em itálico, brilhos, selos sobre bordô).
- Raio generoso (lg, 12px) sobre o raio padrão da Oficina — a recepção é um salão, não um corredor.
- Densidade confortável; Inter segue como única voz tipográfica.
- Selos de status e piso de contraste AA: intocados, herança da plataforma.

## Colors

Paleta de três camadas — uma pedra, um metal e um papel — sobre o fundo neutro da plataforma. A fonte normativa é o seed do tenant (`primaryColor`/`accentColor` em hex); a escala de 10 passos é gerada em runtime pelo motor de tokens da plataforma, e o Bordô Real é o passo secundário derivado para gradientes e hover.

### Primary
- **Bordô Profundo** (#4A0E1A): tinta de ação e identidade. Botões primários, links, item de navegação ativo, marca, app bar, textos de destaque. Nos passos escuros da escala gerada, é usado como fundo com texto claro; nos passos claros, como fundo sutil sobre marfim.
- Contraste de texto sobre o bordô: sempre branco/pérola (AA ≥ 4.5:1; na prática os passos 600–900 do bordô passam AA com texto claro).

### Secondary
- **Bordô Real** (#7A1F2E): passo intermediário da família. Gradientes, estados de hover, elementos secundários e fundos institucionais com necessidade de profundidade (hero com gradiente). Contraste com texto claro: AA ≥ 4.5:1.

### Accent
- **Dourado de Insígnia** (#C9A227): acento cerimonial. Uso restrito a selos de assinatura, bordas de destaque, logo/favicon, CTAs de honra e marcações de prestígio. Nunca como fill de botão principal em marfim e nunca em texto corrido — o Brand Studio valida o par com badge AA antes de aprovar.
- **Dourado Claro** (#E8C767): realce sobre fundo escuro — títulos em itálico, brilhos e selos sobre bordô. Não usar sobre marfim (abaixo de AA).

### Neutral
- **Marfim** (#F3EEDD): fundo de página e respiro entre seções; painéis em `--bg-secondary` (marfim mais claro / branco). Tinta Alta/Média/Baixa da plataforma para texto e bordas, sem alteração.

### Named Rules
**The Pedra e Ouro Rule.** Bordô é ação; ouro é distinção. Se um elemento precisa de ação, usa bordô; se precisa de honra, usa um toque de ouro (≤5% da tela).
**The Sala Limpa Rule.** Fundo claro e calmo: o bordô não vira superfície de página inteira (campos, listas e painéis permanecem em marfim/branco), exceto em hero, footer, app bar e diálogos de recepção.
**The Hover Rule.** Hover e gradientes usam Bordô Real (#7A1F2E) — nunca um dourado escurecido nem um bordô esmaecido em massa.

## Typography

**Display/Body:** Inter (herança da plataforma, stack completa de `--font-sans`). **Mono:** JetBrains Mono para identidade técnica.

**Character:** A voz tipográfica não muda: Inter em toda a hierarquia. A gravidade maçônica vem da composição (mais espaço, títulos em bordô, linhas mais lentas), não de uma fonte nova.

### Hierarchy
- **Display** (700, 2.25rem, 1.25, tight): hero da recepção e páginas públicas; cor bordô quando em papel.
- **Headline** (600, 1.875rem, 1.25, tight): títulos de página internos.
- **Title** (600, 1.25rem, 1.3, tight): cabeçalhos de painel.
- **Body** (400, 1rem, 1.5): texto corrente, 65–75ch.
- **Label** (500, 0.75rem): rótulos e helpers.
- **Mono** (400, 0.875rem): IDs, hashes, carimbos de tempo.

**The Pedra-Escrita Rule.** Títulos que falam pela instituição usam bordô; textos de apoio usam tinta da plataforma. Ouro jamais tipográfico em massa; Dourado Claro (itálico) apenas sobre fundo bordô.

## Layout

Herança integral da plataforma: ritmo de 4px, rail de navegação de 256px, densidade confortável. O cliente adiciona um respiro cerimonial — mais `gap` (8–24px) em telas de recepção e hero — e, se ativado no Brand Studio, o preset de raio `lg` (12px) para painéis.

## Elevation & Depth

**The Flat-By-Default Rule** da plataforma vale aqui em dobro: sobre papel claro, profundidade vem do layering (marfim > branco > bordô) e das hairlines da plataforma; `shadow-lg/xl` apenas para dialogs e dropdowns.

## Shapes

Herança da plataforma com uma concessão do guarda-roupa: raio `lg` (12px) em painéis e cartões (contra 8px do padrão), cantos de botão permanecem em 8px, pills restritas a badges/avatares — **The Measured Corner Rule** continua valendo.

## Components

Ausente por design: a Conexão Maçônica não define componentes próprios. Ela herda o catálogo da plataforma (botões, campos, cartões, badges, navegação) e aplica a camada de marca — bordô nos primários e links, selos com acento dourado validado — via a camada `#tenant-brand` runtime do Brand Studio.

## Do's and Don'ts

### Do:
- **Do** usar Bordô Profundo (#4A0E1A) como única tinta de ação e de identidade da marca.
- **Do** usar Bordô Real (#7A1F2E) em gradientes e estados de hover.
- **Do** reservar o ouro (#C9A227) para acentos cerimoniais pequenos: selo, borda de destaque, logo, marcação de honra; e o Dourado Claro (#E8C767) para realces sobre bordô.
- **Do** manter o piso AA 4.5:1 e os selos de status intocados, como manda a plataforma.
- **Do** usar Marfim (#F3EEDD) como fundo claro e respiro entre seções.
- **Do** compor gravidade com espaço e composição quando precisar de tom cerimonioso.
- **Do** atualizar este registro quando o tenant mudar de marca no Brand Studio (escala, raio, densidade, fonte).

### Don't:
- **Don't** usar ouro como fill de botão principal em marfim, link corrido ou texto em massa (faixa abaixo de AA no papel).
- **Don't** usar Dourado Claro (#E8C767) sobre fundo claro — reservado a superfícies bordô.
- **Don't** pintar a página inteira de bordô; a sala fica limpa em marfim, com bordô em hero/footer/app bar/recepção.
- **Don't** introduzir uma quarta cor de marca sem aprovar o par de contraste no Brand Studio.
- **Don't** criar fontes ou componentes exclusivos da marca; a camada é de pele, não de estrutura.
