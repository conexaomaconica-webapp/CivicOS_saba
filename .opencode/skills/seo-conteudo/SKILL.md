---
name: seo-conteudo
description: Use when creating, reviewing, or adjusting pages, routes, layout components, metadata, structured data (JSON-LD), sitemap.ts, robots.ts, llms.txt, or content architecture in the Conexão Maçônica web app (CivicOS). Applies SEO, GEO/AEO, page-pillar, interlinking, and metadata rules so pages rank and get cited by AI. Trigger on keywords like SEO, SEO, GEO, AEO, metadata, JSON-LD, StructuredData, página-pilar, sitemap, robots, otimização de busca, rota nova, conteúdo.
---

# SEO e Arquitetura de Conteúdo — Conexão Maçônica

Conjunto de regras obrigatórias para criar, revisar ou ajustar qualquer página,
componente de layout, metadata, rota ou dado estruturado no produto
Conexão Maçônica, construído sobre a plataforma CivicOS.

A fonte de verdade genérica (template reutilizável para outros white-labels) é
`docs/SABA-seo.md`. Este skill é a versão **preenchida** e acionável para este
produto. Ao portar o skill para um novo white-label, atualize a seção 0
(Contexto) e adote o template de `docs/SABA-seo.md`.

## 0. Contexto do produto (fixo para este white-label)

- **Tipo de projeto**: `SaaS / produto digital` (Plataforma Multi-Tenant CivicOS — produto Conexão Maçônica)
- **Segmento**: Plataforma de descoberta, networking e relacionamento comercial para a comunidade maçônica
- **Features principais**: diretório de empresas de irmãos, verificação de vínculo maçônico e credenciais, selos de verificação, programa de empresas fundadoras (primeiros 100), busca por categorias e ritos, mapa interativo, destaques de busca, categorias em destaque, banners, guia de lojas maçônicas com busca
- **Atuação real**: Nacional (Brasil)
- **USP**: ecossistema de confiança com verificação rigorosa de vínculo maçônico e filiação institucional — é esse selo, e não um catálogo genérico, que deve ser comunicado na copy e nos dados estruturados

## 1. Antes de propor arquitetura nova: analise uma referência

Se o usuário indicar um site concorrente/benchmark (ou se já houver um
registrado no projeto), use fetch/browsing para analisar a home e 1-2 páginas
internas antes de sugerir estrutura. Extraia: como o site organiza páginas por
serviço/keyword, title/H1/meta description, interlinking, e se usa SEO local
genuíno ou spam de geo-targeting (lista de cidades sem conteúdo real — nunca
replicar, ver seção 6).

## 2. Arquitetura de páginas — regra de silo

- **Uma página-pilar densa por serviço/feature real** (800–1200 palavras de
  conteúdo genuíno), nunca dezenas de páginas quase idênticas variando só a
  palavra-chave (doorway pages).
- Cada página-pilar cobre variações de busca **dentro do próprio texto e da
  metadata**, não espalhada em URLs redundantes.
- Estrutura de rotas previsível e semântica, slugs em português, sem stopwords
  desnecessárias. Exemplos neste produto: `/guia`, `/guia/[slug]` (empresa),
  `/anunciar`, categorias (`/categorias/[slug]` se criadas), lojas maçônicas.
- Como é um diretório real (dados dinâmicos), **não** inflar páginas-pilar por
  cidade (atuação nacional, sem negócio local fixo) — interligar derivações por
  categoria/rito a partir de páginas reais e densas.
- Se, no futuro, houver páginas de caso de uso (`/casos-de-uso/[slug]`) ou
  comparação (`/vs/[concorrente]`), aplicar as mesmas regras de densidade,
  nunca conteúdo fino.

## 3. Metadata (Next.js App Router)

Toda página precisa exportar `generateMetadata` (ou `metadata` estático quando
não houver dado dinâmico) — **nunca** herdar o title/description genérico do
layout raiz:

```ts
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Termo principal | Nome da empresa", // até ~60 caracteres
    description: "Meta description com CTA implícito", // até ~155 caracteres
    alternates: { canonical: "https://dominio.com.br/rota" },
    openGraph: {
      title: "...",
      description: "...",
      url: "https://dominio.com.br/rota",
      type: "website",
    },
  };
}
```

## 4. Dados estruturados (JSON-LD)

Implemente/manutenha um componente reutilizável (`<StructuredData schema={...} />`
ou `application/ld+json`) e aplique:

- `Organization` na home, com `sameAs` apontando para os perfis oficiais
  (Google Business Profile, LinkedIn, Instagram) — confirma identidade de
  entidade para SEO e GEO.
- `Service` em cada página-pilar de serviço/feature.
- `FAQPage` em toda página-pilar que tiver seção de perguntas frequentes.
- `BreadcrumbList` em páginas internas (`/guia/[slug]` em diante).
- No diretório (empresa/loja): usar subtipos apropriados somente quando a
  entidade for negócio físico com NAP consistente — evite `LocalBusiness`
  genérico sem endereço real consistente (este é um diretório SaaS, não um
  site de negócio local).

Valide sempre com o Rich Results Test antes de considerar a página pronta.

## 5. GEO/AEO — otimização para respostas de IA

Buscas sem clique já passam de 69% do total, e uma fatia crescente é respondida
direto por IA (AI Overviews, ChatGPT, Perplexity, Gemini). Objetivo inclui ser a
fonte citada na resposta, além de rankear no link azul. Complementa as seções
2-4, é obrigatório.

**No conteúdo de cada página-pilar:**

- Logo após o H1, um parágrafo curto (2-4 frases) que responde à pergunta
  central de forma direta e autocontida — sem depender do resto da página.
- Cada H2 relevante deve poder ser lido isoladamente como resposta completa.
- FAQ com a linguagem literal que alguém usaria e respostas objetivas de 1-3
  frases antes de qualquer elaboração.
- Terminologia consistente com o setor maçônico (rito, loja, potência, irmão),
  não só o jargão interno da plataforma.

**Na infraestrutura técnica:**

- `app/robots.ts` deve liberar explicitamente os crawlers de IA (`GPTBot`,
  `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`), não só o Googlebot.
- Confirmar que CDN/proxy (Cloudflare etc.) não rejeitam esses bots.
- Conteúdo essencial nunca depende de JavaScript client-side — reforça Server
  Components (seção 7).
- Considerar `llms.txt` na raiz do domínio resumindo o que o site oferece e
  linkando as páginas-pilar. Se não puder ser criado agora, registrar como item
  de roadmap (baixo custo, upside incerto mas crescente).

**Fora do site (registrar no roadmap, não é tarefa de código):**

- Presença de marca em fontes terceiras (diretórios do setor, avaliações,
  imprensa) pesa para GEO porque IA sintetiza de múltiplas fontes.
- Google Business Profile, LinkedIn e outros perfis oficiais consistentes com
  o schema `Organization` (mesmo nome, domínio, descrição).

## 6. O que nunca implementar

- Rodapé/seção com lista extensa de cidades/regiões sem conteúdo real (geo-spam) — prática mais arriscada vista em concorrentes antigos.
- Múltiplas páginas com o mesmo conteúdo trocando só a palavra-chave (doorway pages / thin content).
- Keyword stuffing — repetição não-natural do termo-alvo no corpo do texto.
- Conteúdo copiado/parafraseado para preencher página nova.
- Bloquear crawlers de IA no robots.txt sem motivo — equivale a se excluir das respostas geradas.

## 7. Performance (Core Web Vitals)

- Sempre usar `next/image` para imagens de conteúdo, com `width`/`height` ou
  `fill` corretos e `priority` só na imagem acima da dobra.
- Fontes via `next/font`, nunca `<link>` externo direto para Google Fonts.
- Nenhum componente client-side (`"use client"`) em página que não precisa de
  interatividade — priorizar Server Components para páginas de conteúdo/SEO.
- Lazy-load de seções abaixo da dobra não críticas (carrosséis, mapas,
  widgets de terceiros). Mapas interativos de lojas: lazy-load e sem render
  que bloqueie o LCP.

## 8. Infraestrutura técnica obrigatória

- `app/sitemap.ts` gerando sitemap dinâmico a partir das rotas públicas
  relevantes (guia, páginas-pilar; incluir empresas/lojas se os dados forem
  públicos e canônicos).
- `app/robots.ts` liberando crawlers de busca e IA (ver seção 5) e apontando
  para o sitemap.
- HTTPS forçado, sem conteúdo misto.
- Todo `<img>`/`<Image>` com `alt` descritivo (não genérico tipo "imagem1").

## 9. Copy de página-pilar nova — checklist

Ao gerar conteúdo de página-pilar nova, sempre entregar:

1. H1 com o termo principal, natural
2. Meta title + meta description (seção 3)
3. Parágrafo de abertura respondendo à intenção de busca em 2-3 frases, autocontido o suficiente para ser citado por IA (seção 5)
4. Estrutura de H2s cobrindo subtemas reais, cada um respondível isoladamente
5. 2-3 perguntas de FAQ com resposta curta (alimenta `FAQPage` e extração por IA)
6. CTA adequado — demo/teste grátis (SaaS), ligando ao selo de verificação como prova de confiança

## 10. Antes de finalizar qualquer página nova

Confirme: metadata própria ✓ · JSON-LD aplicável ✓ · imagens otimizadas ✓ ·
abertura autocontida e citável por IA ✓ · robots.txt libera crawlers de IA ✓ ·
sem geo-spam ou conteúdo duplicado ✓ · link interno para 2-3 páginas-pilar
relacionadas ✓ · presente no sitemap ✓.