# Instruções de SEO e Arquitetura de Conteúdo — Saba Studio

Estas instruções valem para todo o projeto. Sempre que você criar, revisar ou
ajustar páginas, componentes de layout, metadata, ou estrutura de rotas, aplique
as regras abaixo. Elas existem para que o sistema performe bem em buscadores
(SEO) e converta bem, sem recorrer a táticas frágeis que podem ser penalizadas.

## 0. Contexto do projeto (preencher por projeto)

- **Tipo de projeto**: `SaaS / produto digital` (Plataforma Multi-Tenant CivicOS — Produto Conexão Maçônica)
- **Segmento**: Plataforma de Descoberta, Networking e Relacionamento Comercial para a Comunidade Maçônica
- **Serviços / features principais**: Diretório de Empresas e Serviços de Irmãos, Selos de Verificação e Credenciais Maçônicas, Programa de Empresas Fundadoras, Busca por Categorias e Ritos, Mapeamento Institucional de Lojas e Potências, Parcerias e Convênios.
- **Cidade(s) de atuação real**: Atuação Nacional (Brasil)
- **Diferencial (USP)**: Ecossistema de confiança exclusivo com verificação rigorosa de identidade maçônica e vínculo institucional com Lojas/Potências, estimulando a prosperidade e o apoio comercial mútuo entre irmãos.

Se este arquivo for reaproveitado num novo projeto, preencha esta seção primeiro —
todas as decisões abaixo dependem dela.

## 1. Antes de propor arquitetura nova: analise uma referência

Se o usuário indicar um site concorrente/benchmark (ou se já houver um registrado
no projeto), use fetch/browsing para analisar a home e 1-2 páginas internas antes
de sugerir estrutura. Extraia: como o site organiza páginas por serviço/keyword,
como usa title/H1/meta description, como faz interlinking, e se usa SEO local
genuíno ou spam de geo-targeting (lista de cidades sem conteúdo real — nunca
replicar isso, ver seção 5).

## 2. Arquitetura de páginas — regra de silo

- **Uma página-pilar densa por serviço/feature real** (800–1200 palavras de
  conteúdo genuíno), nunca dezenas de páginas quase idênticas variando só a
  palavra-chave (doorway pages).
- Cada página-pilar cobre variações de busca **dentro do próprio texto e da
  metadata**, não espalhada em URLs redundantes.
- Estrutura de rotas previsível e semântica: `/servicos/[slug]` ou
  `/solucoes/[slug]` (SaaS) — slugs em português, sem stopwords desnecessárias,
  refletindo o termo de busca principal.
- Se for negócio local: adicionar rota de área de atendimento
  (`/atendemos/[cidade]`) só para cidades reais de atuação, cada uma com
  conteúdo específico — nunca uma lista genérica de cidades copiada.
- Se for SaaS: adicionar páginas de caso de uso (`/casos-de-uso/[slug]`) e,
  quando fizer sentido, páginas de comparação (`/vs/[concorrente]`).

## 3. Metadata (Next.js App Router)

Toda página-pilar precisa exportar `generateMetadata` (ou `metadata` estático
quando não houver dado dinâmico) com:

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

Nunca deixe uma página nova sem metadata própria — não herdar o title/description
genérico do layout raiz.

## 4. Dados estruturados (JSON-LD)

Implemente um componente reutilizável de JSON-LD (`<StructuredData schema={...} />`)
e aplique:

- `LocalBusiness` (ou subtipo mais específico) na home e páginas de área de
  atendimento — **só para projetos locais**.
- `SoftwareApplication` ou `Product` na home/pricing — **só para SaaS**.
- `Service` em cada página-pilar de serviço/feature.
- `FAQPage` em toda página-pilar que tiver seção de perguntas frequentes.
- `BreadcrumbList` em páginas internas.

Valide sempre com o Rich Results Test antes de considerar a página pronta.

## 5. O que nunca implementar

- Rodapé ou seção com lista extensa de cidades/regiões sem conteúdo real
  associado (geo-spam) — é a prática mais arriscada observada em concorrentes
  antigos e pode gerar penalização.
- Múltiplas páginas com o mesmo conteúdo trocando só a palavra-chave alvo
  (doorway pages / thin content).
- Keyword stuffing — repetição não-natural do termo-alvo no corpo do texto.
- Conteúdo copiado/parafraseado de outro site para preencher página nova.

## 6. Performance (Core Web Vitals)

- Sempre usar `next/image` para qualquer imagem de conteúdo, com `width`/`height`
  ou `fill` corretos e `priority` só na imagem acima da dobra.
- Fontes via `next/font`, nunca `<link>` externo direto para Google Fonts.
- Nenhum componente client-side (`"use client"`) em página que não precisa de
  interatividade — priorizar Server Components para páginas de conteúdo/SEO.
- Lazy-load de qualquer seção abaixo da dobra que não seja crítica (carrosséis,
  mapas, widgets de terceiros).

## 7. Infraestrutura técnica obrigatória

- `app/sitemap.ts` gerando sitemap dinâmico a partir das rotas de página-pilar.
- `app/robots.ts` liberando crawlers e apontando para o sitemap.
- HTTPS forçado, sem conteúdo misto.
- Todo `<img>`/`<Image>` com `alt` descritivo (não genérico tipo "imagem1").

## 8. Copy de página-pilar nova — checklist

Ao gerar o conteúdo de uma página-pilar nova, sempre entregar:

1. H1 com o termo principal, natural
2. Meta title + meta description (ver seção 3)
3. Parágrafo de abertura respondendo à intenção de busca em 2-3 frases
4. Estrutura de H2s cobrindo subtemas reais do serviço/feature
5. 2-3 perguntas de FAQ com resposta curta (alimenta o schema `FAQPage`)
6. CTA adequado ao tipo de projeto — orçamento/WhatsApp (local) ou
   teste grátis/demo (SaaS)

## 9. Antes de finalizar qualquer página nova

Confirme: metadata própria ✓ · JSON-LD aplicável ✓ · imagens otimizadas ✓ ·
sem geo-spam ou conteúdo duplicado ✓ · link interno para 2-3 páginas-pilar
relacionadas ✓ · presente no sitemap ✓.
