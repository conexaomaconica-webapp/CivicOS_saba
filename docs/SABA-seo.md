# Instruções de SEO e Arquitetura de Conteúdo — Saba Studio

Estas instruções valem para todo o projeto. Sempre que você criar, revisar ou
ajustar páginas, componentes de layout, metadata, ou estrutura de rotas, aplique
as regras abaixo. Elas existem para que o sistema performe bem em buscadores
tradicionais (SEO) e em respostas geradas por IA (GEO/AEO), e converta bem, sem
recorrer a táticas frágeis que podem ser penalizadas.

## 0. Contexto do projeto (preencher por projeto)

- **Tipo de projeto**: `[institucional / negócio local]` ou `[SaaS / produto digital]`
  — se não estiver claro pelo código existente, pergunte antes de gerar arquitetura nova.
- **Segmento**: `[preencher]`
- **Serviços / features principais**: `[preencher]`
- **Cidade(s) de atuação real** (só se for negócio local): `[preencher]`
- **Diferencial (USP)**: `[preencher]`

Se este arquivo for reaproveitado num novo projeto, preencha esta seção primeiro —
todas as decisões abaixo dependem dela.

## 1. Antes de propor arquitetura nova: analise uma referência

Se o usuário indicar um site concorrente/benchmark (ou se já houver um registrado
no projeto), use fetch/browsing para analisar a home e 1-2 páginas internas antes
de sugerir estrutura. Extraia: como o site organiza páginas por serviço/keyword,
como usa title/H1/meta description, como faz interlinking, e se usa SEO local
genuíno ou spam de geo-targeting (lista de cidades sem conteúdo real — nunca
replicar isso, ver seção 6).

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
- `Organization` na home, com `sameAs` apontando para os perfis oficiais
  (Google Business Profile, LinkedIn, Instagram) — ajuda tanto SEO quanto GEO
  a confirmar a identidade da entidade (ver seção 5).

Valide sempre com o Rich Results Test antes de considerar a página pronta.

## 5. GEO/AEO — otimização para respostas de IA

Buscas sem clique já passam de 69% do total, e uma fatia crescente delas é
respondida direto por IA (AI Overviews, ChatGPT, Perplexity, Gemini) sem o
usuário nunca visitar o site. O objetivo deixa de ser só "aparecer no link
azul" e passa a incluir "ser a fonte citada dentro da resposta gerada". Isso
não substitui as seções 2-4, complementa — e é obrigatório em todo projeto
novo a partir de agora.

**No conteúdo de cada página-pilar:**

- Logo após o H1, um parágrafo curto (2-4 frases) que responde à pergunta
  central de forma direta e autocontida — sem depender do resto da página
  para fazer sentido. É o trecho que um sistema de IA mais provavelmente vai
  extrair e citar.
- Cada H2 relevante deve poder ser lido isoladamente como uma resposta
  completa ao que o título pergunta — evite parágrafos que só fazem sentido
  no contexto dos anteriores.
- FAQ com perguntas na linguagem literal que alguém usaria (inclusive como
  sub-perguntas de uma busca maior) e respostas objetivas de 1-3 frases antes
  de qualquer elaboração.
- Terminologia consistente com o que a IA provavelmente já usaria para buscar
  sobre o assunto (sinônimos comuns do setor, não só o jargão da empresa).

**Na infraestrutura técnica:**

- `app/robots.ts` deve liberar explicitamente os crawlers de IA
  (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`), não só
  o `Googlebot` tradicional — a menos que o projeto tenha razão explícita
  para bloquear algum.
- Se o projeto usa CDN/proxy (Cloudflare, etc.), confirmar que ele não está
  rejeitando requisições desses bots por padrão.
- Conteúdo essencial nunca deve depender de JavaScript client-side para
  aparecer — reforça a regra de Server Components da seção 7. Crawlers de IA
  têm suporte a JS mais limitado que o Googlebot.
- Considerar um arquivo `llms.txt` na raiz do domínio (padrão emergente,
  ainda não universal) resumindo o que o site oferece e linkando as
  páginas-pilar mais importantes — baixo custo, upside incerto mas crescente.

**Fora do site (não é tarefa de código, mas vale registrar no roadmap):**

- Presença de marca em fontes terceiras (diretórios do setor, avaliações,
  imprensa, listas "melhores empresas de X") pesa mais para GEO do que para
  SEO tradicional, porque IA sintetiza a partir de múltiplas fontes, não só
  do site próprio.
- Google Business Profile, LinkedIn e outros perfis oficiais devem estar
  consistentes com o schema `Organization`/`LocalBusiness` do site (mesmo
  nome, endereço, telefone — sinal de confiança de entidade).

## 6. O que nunca implementar

- Rodapé ou seção com lista extensa de cidades/regiões sem conteúdo real
  associado (geo-spam) — é a prática mais arriscada observada em concorrentes
  antigos e pode gerar penalização.
- Múltiplas páginas com o mesmo conteúdo trocando só a palavra-chave alvo
  (doorway pages / thin content).
- Keyword stuffing — repetição não-natural do termo-alvo no corpo do texto.
- Conteúdo copiado/parafraseado de outro site para preencher página nova.
- Bloquear crawlers de IA no robots.txt sem motivo — hoje isso equivale a se
  excluir das respostas geradas, não só dos rankings tradicionais.

## 7. Performance (Core Web Vitals)

- Sempre usar `next/image` para qualquer imagem de conteúdo, com `width`/`height`
  ou `fill` corretos e `priority` só na imagem acima da dobra.
- Fontes via `next/font`, nunca `<link>` externo direto para Google Fonts.
- Nenhum componente client-side (`"use client"`) em página que não precisa de
  interatividade — priorizar Server Components para páginas de conteúdo/SEO.
- Lazy-load de qualquer seção abaixo da dobra que não seja crítica (carrosséis,
  mapas, widgets de terceiros).

## 8. Infraestrutura técnica obrigatória

- `app/sitemap.ts` gerando sitemap dinâmico a partir das rotas de página-pilar.
- `app/robots.ts` liberando crawlers de busca e de IA (ver seção 5) e
  apontando para o sitemap.
- HTTPS forçado, sem conteúdo misto.
- Todo `<img>`/`<Image>` com `alt` descritivo (não genérico tipo "imagem1").

## 9. Copy de página-pilar nova — checklist

Ao gerar o conteúdo de uma página-pilar nova, sempre entregar:

1. H1 com o termo principal, natural
2. Meta title + meta description (ver seção 3)
3. Parágrafo de abertura respondendo à intenção de busca em 2-3 frases,
   autocontido o suficiente para ser citado por uma IA (ver seção 5)
4. Estrutura de H2s cobrindo subtemas reais do serviço/feature, cada um
   respondível isoladamente
5. 2-3 perguntas de FAQ com resposta curta (alimenta o schema `FAQPage` e a
   extração por IA)
6. CTA adequado ao tipo de projeto — orçamento/WhatsApp (local) ou
   teste grátis/demo (SaaS)

## 10. Antes de finalizar qualquer página nova

Confirme: metadata própria ✓ · JSON-LD aplicável ✓ · imagens otimizadas ✓ ·
abertura autocontida e citável por IA ✓ · robots.txt libera crawlers de IA ✓ ·
sem geo-spam ou conteúdo duplicado ✓ · link interno para 2-3 páginas-pilar
relacionadas ✓ · presente no sitemap ✓.
