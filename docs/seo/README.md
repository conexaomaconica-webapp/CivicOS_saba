# Plano de Implementação SEO, Analytics e Growth
## Conexão Maçônica — Guia Operacional para Antigravity IDE

> Documento de referência para implementação, auditoria e manutenção contínua de SEO técnico, Google Analytics 4, Google Search Console, PageSpeed/Core Web Vitals, dados estruturados, conversão e Growth.
>
> Objetivo: transformar o Conexão Maçônica em uma plataforma tecnicamente preparada para crescer de forma orgânica, mensurável e escalável.

---

# 1. Objetivo do projeto

O Conexão Maçônica não deve ser tratado apenas como um site institucional.

A plataforma deve funcionar como um ecossistema de páginas indexáveis, incluindo:

- página inicial;
- empresas;
- categorias;
- cidades;
- estados;
- eventos;
- benefícios;
- lojas maçônicas;
- páginas individuais de empresas;
- conteúdos futuros;
- páginas comerciais estratégicas.

A arquitetura deve permitir que o crescimento da base de empresas também aumente a presença orgânica da plataforma nos mecanismos de busca.

A regra principal é:

> Google encontra → rastreia → entende → indexa → posiciona → usuário clica → realiza uma ação → a plataforma mede essa ação.

---

# 2. Princípios obrigatórios

Toda implementação deve respeitar estes princípios:

1. SEO faz parte da arquitetura.
2. Não criar páginas apenas para "encher o Google".
3. Evitar conteúdo duplicado.
4. Evitar URLs sem valor de busca.
5. Toda página indexável deve ter propósito.
6. Toda página deve possuir metadata coerente.
7. Canonical deve apontar para a URL oficial.
8. URLs devem ser estáveis e legíveis.
9. Dados estruturados só devem ser usados quando semanticamente corretos.
10. Performance deve ser avaliada principalmente no mobile.
11. Eventos importantes devem ser mensurados no GA4.
12. Alterações críticas devem possuir validação antes e depois.
13. Nunca alterar layout, identidade visual ou regra de negócio durante uma auditoria técnica sem necessidade explícita.

---

# 3. Arquitetura macro

Fluxo recomendado:

```text
Usuário
   ↓
Google / Bing / Social / Direto
   ↓
Landing Page
   ↓
Busca / Categoria / Empresa
   ↓
Interação
   ↓
WhatsApp / telefone / site / rota / compartilhamento / conexão
   ↓
GA4
   ↓
Painel de resultados
```

---

# 4. Fases de implementação

## FASE 0 — Diagnóstico inicial

### Objetivo

Mapear o estado real da plataforma antes de alterar código.

### Verificar

- framework e versão;
- Next.js App Router ou Pages Router;
- estratégia SSR/SSG/ISR;
- estrutura atual de metadata;
- sitemap;
- robots.txt;
- canonical;
- domínio principal;
- redirects;
- páginas indexáveis;
- páginas privadas;
- autenticação;
- performance;
- scripts externos;
- GA4;
- Search Console;
- banco de dados;
- slug das empresas;
- categorias;
- cidades;
- estados;
- eventos;
- ofertas;
- lojas maçônicas.

### Comando sugerido para o Code

```text
Faça uma auditoria técnica da arquitetura atual da aplicação com foco em SEO, Analytics, indexação e performance.

NÃO altere código ainda.

Mapeie:

1. versão do Next.js;
2. App Router ou Pages Router;
3. estrutura de routes;
4. metadata atual;
5. sitemap;
6. robots;
7. canonical;
8. redirects;
9. scripts do Google Analytics;
10. eventos existentes;
11. páginas públicas;
12. páginas privadas;
13. páginas geradas dinamicamente;
14. estratégia SSR/SSG/ISR;
15. imagens críticas;
16. fontes;
17. dependências relacionadas a SEO;
18. problemas evidentes de indexação;
19. possíveis páginas duplicadas;
20. riscos técnicos.

Entregue primeiro um relatório com:
- encontrado;
- problema;
- gravidade;
- recomendação;
- arquivo afetado.

Não implemente nada até concluir o diagnóstico.
```

---

# 5. FASE 1 — Google Analytics 4

## Objetivo

Garantir que toda ação relevante dentro da plataforma seja mensurável.

### Eventos recomendados

```text
view_business
search_business
view_category
view_city
click_whatsapp
click_phone
click_website
click_instagram
click_route
share_business
register_visit
register_connection
view_offer
generate_lead
start_advertiser_signup
complete_advertiser_signup
contract_signed
payment_confirmed
profile_completed
```

### Parâmetros recomendados

```text
business_id
business_name
category_id
category_name
city
state
plan
is_founder
source_page
search_term
offer_id
event_id
user_type
```

### Regras

- evitar enviar dados pessoais sensíveis;
- nunca enviar CPF;
- nunca enviar CNPJ como identificador de usuário;
- nunca enviar telefone;
- nunca enviar e-mail diretamente no evento;
- padronizar nomes em snake_case;
- documentar todos os eventos;
- não duplicar eventos disparados por navegação.

### Estrutura sugerida

```text
lib/
  analytics/
    events.ts
    ga.ts
    types.ts
```

### Exemplo conceitual

```ts
trackEvent("click_whatsapp", {
  business_id,
  business_name,
  category_name,
  city,
  state
})
```

---

# 6. FASE 2 — Search Console

## Objetivo

Garantir rastreamento, indexação e acompanhamento orgânico.

### Validar

- propriedade do domínio;
- sitemap enviado;
- domínio preferencial;
- HTTPS;
- URLs indexadas;
- URLs excluídas;
- "Descoberta, mas não indexada";
- "Rastreada, mas não indexada";
- canonical selecionado pelo Google;
- Core Web Vitals;
- resultados aprimorados;
- ações manuais;
- segurança.

### Rotina

Semanalmente:

- verificar páginas;
- verificar CTR;
- verificar consultas;
- verificar posição média;
- verificar páginas com crescimento;
- verificar páginas perdendo posição;
- verificar novas consultas;
- verificar problemas de indexação.

---

# 7. FASE 3 — robots.txt

## Objetivo

Permitir rastreamento somente do que deve ser público.

### Deve permitir

```text
/
/guia
/guia/{empresa-slug}
/guia/eventos
/guia/beneficios
/guia/lojas
```

### Deve bloquear áreas privadas

Exemplos:

```text
/admin
/dashboard
/api
/anunciar          (funil de cadastro: noindex)
/anunciante
/minha-conta
/diagnostics
```

A lista exata deve ser definida após auditoria das rotas.

### Regras

- não usar robots.txt para esconder dados sensíveis;
- páginas sensíveis devem exigir autenticação;
- não bloquear CSS e JavaScript necessários para renderização;
- não bloquear sitemap.

---

# 8. FASE 4 — Sitemap dinâmico

## Objetivo

Gerar automaticamente URLs públicas relevantes.

### Sitemap deve incluir

- Home;
- Empresas;
- página individual da empresa;
- categorias indexáveis;
- cidades indexáveis;
- eventos publicados;
- benefícios;
- lojas maçônicas públicas.

### Sitemap NÃO deve incluir

- login;
- cadastro;
- admin;
- páginas internas;
- páginas de teste;
- preview;
- onboarding;
- contratos;
- checkout;
- URLs com parâmetros temporários.

### Estrutura possível

```text
/sitemap.xml

ou

/sitemap-index.xml
  /sitemap-pages.xml
  /sitemap-businesses.xml
  /sitemap-categories.xml
  /sitemap-cities.xml
  /sitemap-events.xml
```

Para crescimento futuro, preferir sitemap index.

---

# 9. FASE 5 — URLs

## Arquitetura canônica (decisão de 2026-10-07)

O prefixo **`/guia`** é oficialmente o padrão canônico do projeto (AGENTS.md: `/guia/{businesses.slug}`).
**Não migrar para `/empresas/*`** neste momento. Os exemplos de `/empresas/...` das versões anteriores deste
documento ficam descartados.

### Padrão oficial

```text
/guia                          diretório (hub)
/guia/{empresa-slug}           empresa
/guia/categoria/{slug}         categoria            (padrão alvo, ainda não implementado)
/guia/cidade/{slug}            cidade               (padrão alvo, ainda não implementado)
/guia/lojas                    lojas maçônicas
/guia/lojas/{slug}             loja maçônica
/guia/eventos                  eventos
/guia/beneficios               benefícios
```

### O que existe hoje no código (não alterado na Sprint 1)

```text
/guia/{estado}/{cidade}               cidade (ex.: /guia/bahia/feira-de-santana)
/guia/{estado}/{cidade}/{categoria}   cidade + categoria (ex.: /guia/bahia/feira-de-santana/optica)
```

As páginas de cidade e de cidade + categoria já existem com esses endereços e indexam por limite mínimo de
empresas (cidade: 3; cidade + categoria: 2). Os padrões alvo `/guia/categoria/{slug}` e `/guia/cidade/{slug}`
**não foram implementados**: converter ou manter os endereços atuais é decisão da Sprint 7 (SEO programático),
com redirect 301 se houver troca. Até lá, nenhuma URL muda.

### Fase de pré-lançamento (decisão de 2026-10-07)

```text
/                  landing comercial (capta anunciantes)  — mantida até meados de novembro
/guia              plataforma em formação
/guia/{slug}       empresas já cadastradas
```

Planejado para o lançamento público (virada alguns dias antes, para testar SEO, sitemap, canonical, links
internos e navegação):

```text
/                  página principal da plataforma
/anuncie           landing comercial (a atual)
/anunciar          início do cadastro/onboarding (noindex)
```

### Domínio canônico

```text
https://www.conexaomaconica.com.br
```

O domínio sem `www` redireciona (308) para o canônico. Todas as URLs de canonical, Open Graph, sitemap e
JSON-LD devem sair de `lib/seo/app-url.ts` (`appUrl()`), nunca de endereço escrito à mão.

### Evento e loja

```text
/eventos/{slug}                evento (página pública existente)
/guia/lojas/{slug}             loja maçônica
```

---

# 10. FASE 6 — Metadata dinâmica

Toda página pública relevante deve gerar:

```text
title
description
canonical
openGraph
twitter
robots
```

## Empresa

### Title

```text
{Empresa} | {Categoria} em {Cidade} - Conexão Maçônica
```

### Description

Gerar descrição natural, evitando texto idêntico entre empresas.

### Canonical

```text
https://www.conexaomaconica.com.br/guia/{slug}
```

---

# 11. FASE 7 — Cabeçalhos

Cada página deve possuir apenas um H1 principal.

Estrutura:

```text
H1
  H2
    H3
    H3
  H2
```

Evitar usar heading apenas por tamanho visual.

---

# 12. FASE 8 — SEO programático

## Objetivo

Criar páginas úteis automaticamente a partir dos dados da plataforma.

### Possíveis páginas

```text
Empresas em Feira de Santana
Óticas em Feira de Santana
Advogados em Salvador
Psicólogos em Feira de Santana
Empresas maçônicas na Bahia
Eventos maçônicos na Bahia
```

### Regra de indexação

Uma página só poderá ser indexada quando:

- houver conteúdo suficiente;
- houver empresas ativas;
- houver intenção de busca;
- não for praticamente idêntica a outra página.

### Threshold recomendado

Exemplo inicial:

```text
menos de 3 empresas:
noindex

3 ou mais:
index
```

Esse número pode ser ajustado após análise de crescimento.

---

# 13. FASE 9 — Dados estruturados

Implementar JSON-LD.

## Homepage

```text
Organization
WebSite
```

## Empresa

Quando aplicável:

```text
LocalBusiness
Organization
BreadcrumbList
```

## Evento

```text
Event
BreadcrumbList
```

## Página de categoria

```text
BreadcrumbList
ItemList
```

### Regras

- dados estruturados precisam corresponder ao conteúdo visível;
- não inventar avaliações;
- não inventar preços;
- não usar AggregateRating sem dados reais;
- não usar FAQ schema apenas para manipular resultados.

---

# 14. FASE 10 — Breadcrumbs

Exemplo:

```text
Início
>
Empresas
>
Óticas
>
Feira de Santana
>
Empresa X
```

Benefícios:

- UX;
- navegação;
- links internos;
- arquitetura;
- compreensão semântica.

---

# 15. FASE 11 — Imagens

Toda imagem deve possuir:

- width;
- height;
- alt;
- tamanho otimizado;
- formato moderno;
- lazy loading quando apropriado.

Evitar:

```text
imagem.jpg 5MB
```

Preferir:

```text
WebP
AVIF
Next/Image
```

Hero acima da dobra pode receber prioridade.

---

# 16. FASE 12 — Core Web Vitals

## Metas

```text
LCP <= 2,5s
INP <= 200ms
CLS <= 0,1
```

### Investigar

- hero;
- imagens;
- fontes;
- scripts externos;
- hydration;
- componentes client desnecessários;
- bibliotecas grandes;
- CSS;
- chamadas duplicadas;
- queries lentas.

---

# 17. FASE 13 — Fontes

Preferir:

- next/font;
- fontes locais quando possível;
- preload somente das fontes realmente críticas.

Evitar:

- múltiplas famílias;
- muitos pesos;
- fontes remotas bloqueantes.

---

# 18. FASE 14 — JavaScript

Regra:

> Menos JavaScript no cliente = melhor experiência sempre que possível.

Verificar:

- `"use client"` desnecessários;
- imports grandes;
- componentes pesados;
- bibliotecas que podem ser substituídas;
- scripts carregados na Home sem necessidade.

---

# 19. FASE 15 — Links internos

Estrutura mínima:

Empresa deve linkar para:

- categoria;
- cidade;
- ofertas;
- eventos relacionados quando houver.

Categoria deve linkar para:

- empresas;
- cidades.

Cidade deve linkar para:

- categorias;
- empresas.

Home deve destacar:

- categorias;
- cidades;
- empresas;
- eventos;
- benefícios.

---

# 20. FASE 16 — Busca interna

Toda busca deve poder gerar dados.

Evento:

```text
search_business
```

Parâmetros:

```text
search_term
city
category
results_count
```

Isso permitirá descobrir demandas sem oferta.

Exemplo:

```text
"ortopedista"
48 buscas
0 empresas
```

Esse dado pode virar oportunidade comercial.

---

# 21. FASE 17 — Conversão

SEO sem conversão não é suficiente.

Monitorar:

```text
visualização
↓
perfil
↓
interação
↓
WhatsApp
↓
conexão
```

Funil sugerido:

```text
landing_view
business_view
business_interaction
lead
connection
```

---

# 22. FASE 18 — Painel do anunciante

Indicadores futuros:

## Visibilidade

- visualizações;
- aparições;
- buscas;
- alcance de ofertas.

## Interesse

- WhatsApp;
- telefone;
- Instagram;
- site;
- rotas;
- compartilhamentos.

## Conexões

- visitas registradas;
- conexões;
- indicações.

## Resultado

- leads;
- crescimento;
- evolução mensal.

---

# 23. FASE 19 — SEO local

Estratégia:

```text
categoria + cidade
serviço + cidade
empresa + cidade
```

Criar presença orgânica para buscas locais.

Exemplo:

```text
ótica em Feira de Santana
advogado em Feira de Santana
psicólogo em Feira de Santana
```

---

# 24. FASE 20 — Conteúdo

Criar futuramente:

```text
/guias
/blog
/conteudos
```

Conteúdo deve responder dúvidas reais.

Exemplos:

```text
Como escolher uma ótica em Feira de Santana
Onde encontrar empresas de irmãos maçons na Bahia
Guia de profissionais da família maçônica
```

Evitar conteúdo artificial produzido apenas para palavras-chave.

---

# 25. FASE 21 — PageSpeed

Rodar testes principalmente:

```text
mobile
```

Avaliar:

- Performance;
- Accessibility;
- Best Practices;
- SEO.

Não buscar nota 100 sacrificando produto ou UX.

Prioridade:

```text
Core Web Vitals
>
experiência real
>
nota Lighthouse
```

---

# 26. FASE 22 — Monitoramento

## Semanal

Search Console:

- cliques;
- impressões;
- CTR;
- posição;
- indexação.

GA4:

- usuários;
- aquisição;
- eventos;
- leads;
- conversões.

## Mensal

- crescimento orgânico;
- páginas vencedoras;
- páginas perdendo posição;
- categorias com demanda;
- cidades com demanda;
- empresas com maior interação;
- páginas lentas;
- erros técnicos.

---

# 27. Checklist antes de publicar alteração

```text
[ ] npm/pnpm lint
[ ] typecheck
[ ] build
[ ] testes
[ ] metadata
[ ] canonical
[ ] robots
[ ] sitemap
[ ] schema
[ ] responsividade
[ ] mobile
[ ] desktop
[ ] performance
[ ] eventos GA4
[ ] sem dados sensíveis
[ ] sem alteração de regra de negócio
```

---

# 28. Checklist de nova página pública

```text
[ ] URL amigável
[ ] Title
[ ] Description
[ ] H1
[ ] Canonical
[ ] Open Graph
[ ] Schema
[ ] Breadcrumb
[ ] Links internos
[ ] Imagem otimizada
[ ] ALT
[ ] Sitemap
[ ] GA4
[ ] Mobile
[ ] Index/noindex correto
```

---

# 29. Checklist de nova empresa

Quando uma nova empresa for aprovada:

```text
Empresa aprovada
↓
slug criado
↓
página pública
↓
metadata gerada
↓
schema gerado
↓
sitemap atualizado
↓
links categoria/cidade
↓
indexação permitida
```

Tudo deve ocorrer automaticamente.

Nenhum comando manual deve ser necessário.

---

# 30. Checklist de empresa removida

Antes de remover URL:

Verificar:

```text
empresa encerrada?
empresa suspensa?
empresa mudou de slug?
empresa saiu da plataforma?
```

Possíveis respostas:

```text
301 → URL substituta
410 → removida definitivamente
noindex → temporária
```

Nunca gerar milhares de 404 sem controle.

---

# 31. Padrão para solicitar alterações ao Code

Utilizar este modelo:

```text
CONTEXTO

Estamos implementando SEO técnico no Conexão Maçônica.

OBJETIVO

[descrever objetivo]

ANTES DE ALTERAR

1. localize os arquivos envolvidos;
2. analise a implementação atual;
3. identifique riscos;
4. preserve regras existentes.

IMPLEMENTAÇÃO

[descrever mudança]

NÃO ALTERAR

- identidade visual;
- regras comerciais;
- autenticação;
- pagamentos;
- onboarding;
- banco fora do escopo.

VALIDAÇÃO

Executar:

- lint;
- typecheck;
- build;
- testes relacionados.

ENTREGA

Informar:

1. arquivos alterados;
2. motivo;
3. implementação;
4. riscos;
5. testes executados.
```

---

# 32. Prompt de auditoria SEO

```text
Atue como engenheiro de software especialista em SEO técnico para Next.js.

Audite a aplicação atual sem alterar arquivos.

Analise:

- metadata;
- title;
- descriptions;
- canonical;
- robots;
- sitemap;
- redirects;
- H1/H2;
- links internos;
- imagens;
- structured data;
- URLs;
- páginas duplicadas;
- páginas privadas indexáveis;
- SSR/SSG/ISR;
- performance;
- Core Web Vitals;
- hydration;
- JavaScript;
- fontes;
- acessibilidade relacionada a SEO.

Classifique cada problema:

CRÍTICO
ALTO
MÉDIO
BAIXO

Informe:

arquivo;
problema;
impacto;
correção recomendada.

Não altere código.
```

---

# 33. Prompt de auditoria GA4

```text
Audite toda implementação do Google Analytics 4.

Não altere código.

Verifique:

- Measurement ID;
- carregamento do script;
- duplicidade;
- consentimento;
- eventos;
- parâmetros;
- navegação SPA;
- page_view;
- cliques;
- busca;
- leads;
- cadastro;
- compartilhamentos.

Identifique eventos inexistentes ou inconsistentes.

Crie uma tabela:

evento
arquivo
gatilho
parâmetros
status
recomendação
```

---

# 34. Prompt de auditoria PageSpeed

```text
Analise a aplicação com foco em performance mobile.

Procure possíveis causas para:

- LCP;
- INP;
- CLS;
- TTFB.

Audite:

- hero;
- imagens;
- fontes;
- scripts;
- componentes client;
- hydration;
- bundles;
- dependências;
- chamadas de API;
- carregamento de dados;
- CSS.

Não altere código.

Entregue os 10 maiores gargalos em ordem de impacto.
```

---

# 35. Prompt para corrigir LCP

```text
Identifique o elemento responsável pelo LCP na página.

Antes de alterar:

- informe o elemento;
- arquivo;
- causa provável;
- impacto.

Depois implemente a correção mínima possível.

Avaliar:

- next/image;
- priority;
- fetchPriority;
- preload;
- dimensões;
- WebP/AVIF;
- SSR;
- CSS;
- fontes.

Não alterar layout.
```

---

# 36. Prompt para sitemap

```text
Analise a arquitetura atual e implemente sitemap dinâmico.

Incluir apenas URLs públicas e canônicas.

Fontes:

- páginas estáticas;
- empresas ativas;
- categorias válidas;
- cidades válidas;
- eventos publicados;
- lojas públicas.

Excluir:

- admin;
- dashboard;
- login;
- onboarding;
- checkout;
- contrato;
- preview;
- API;
- páginas internas.

Definir lastModified quando houver dado confiável.

Antes de implementar, apresente a lista de tipos de URL que entrarão no sitemap.
```

---

# 37. Prompt para dados estruturados

```text
Implemente JSON-LD somente onde semanticamente válido.

Homepage:
Organization
WebSite

Empresa:
LocalBusiness ou Organization
BreadcrumbList

Evento:
Event
BreadcrumbList

Categoria:
BreadcrumbList
ItemList

Não inventar:
- rating;
- reviews;
- preços;
- informações inexistentes.

Gerar os dados a partir das informações reais do banco.
```

---

# 38. Métricas principais do projeto

## SEO

```text
Impressões
Cliques
CTR
Posição
URLs indexadas
Consultas
```

## Growth

```text
Novos usuários
Retorno
Busca
Perfil visualizado
WhatsApp
Telefone
Compartilhamento
Conexão
Lead
```

## Performance

```text
LCP
INP
CLS
TTFB
```

---

# 39. North Star Metric

Sugestão:

```text
Conexões geradas entre usuários e empresas
```

Métricas auxiliares:

```text
buscas
visualizações
interações
leads
conexões
```

---

# 40. Roadmap recomendado

## Sprint SEO 01

Auditoria.

## Sprint SEO 02

GA4 e eventos.

## Sprint SEO 03

Search Console + sitemap + robots.

## Sprint SEO 04

Metadata + canonical.

## Sprint SEO 05

Structured Data.

## Sprint SEO 06

Core Web Vitals.

## Sprint SEO 07

SEO de empresas.

## Sprint SEO 08

Categorias e cidades.

## Sprint SEO 09

SEO programático.

## Sprint SEO 10

Growth Analytics.

---

# 41. Ordem de prioridade

```text
1. Medição
2. Indexação
3. Arquitetura
4. Metadata
5. Dados estruturados
6. Performance
7. Conteúdo
8. Autoridade
9. Growth
10. Otimização contínua
```

---

# 42. Regra operacional

Antes de qualquer grande implementação:

```text
AUDITAR
↓
DOCUMENTAR
↓
PLANEJAR
↓
IMPLEMENTAR
↓
TESTAR
↓
MEDIR
↓
AJUSTAR
```

---

# 43. Arquivos recomendados no repositório

```text
docs/
  seo/
    README.md
    arquitetura-seo.md
    eventos-ga4.md
    schemas.md
    checklist-seo.md
    auditorias/
```

Este arquivo pode ser salvo como:

```text
docs/seo/README.md
```

---

# 44. Status

Utilizar no final de cada sprint:

```text
[ ] Planejado
[ ] Em andamento
[ ] Implementado
[ ] Homologado
[ ] Produção
```

---

# 45. Definição de pronto

Uma tarefa SEO só é considerada concluída quando:

- código implementado;
- build aprovado;
- comportamento homologado;
- página validada;
- GA4 validado quando aplicável;
- Search Console validado quando aplicável;
- documentação atualizada.

---

# 46. Observação final

SEO é um processo contínuo.

O objetivo do Conexão Maçônica não deve ser apenas atingir uma nota alta em ferramentas automáticas.

O objetivo é criar uma plataforma:

- fácil de encontrar;
- fácil de entender;
- rápida;
- útil;
- relevante;
- mensurável;
- capaz de gerar conexões reais;
- escalável para centenas ou milhares de empresas.

---

# 47. Status de execução

Legenda: [x] concluído · [ ] pendente.

## Fase 0 — Diagnóstico inicial

[x] Executada em 2026-10-07. Relatório: `docs/seo/auditorias/2026-10-07-diagnostico-inicial.md`.

## Sprint 1 — Correções críticas (implementada e validada em produção em 2026-10-07)

Escopo exato: `/diagnostics`, `/health`, `/anunciar*`, `/pesquisa`, sitemap e canonicals pendentes.

- [x] `/diagnostics`: em produção só administrador de plataforma; os demais recebem 404. `noindex, nofollow` na página.
- [x] `/health`: agora é uma rota que devolve apenas `{ "ok": true }` (HTTP 200, `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`).
- [x] Diagnóstico do kernel deixou de ser serializado no HTML de todas as páginas (layout raiz envia só dados seguros).
- [x] `/anunciar` e `/anunciar/*`: `noindex, follow` (metadata no layout + `X-Robots-Tag` no middleware, inclusive em redirects). Fluxo, redirects e formulários inalterados.
- [x] `/pesquisa` (redirect) e `/pesquisas/{slug}` (página final): `noindex, follow`.
- [x] Sitemap: removido `/anunciar/passo-1`. Não há onboarding, pesquisa, áreas privadas nem rotas técnicas.
- [x] Canonical: `/guia/empresas`, `/guia/lojas` e `/guia/lojas/{slug}` passam a usar `appUrl()` (www). Padrão de `lib/seo/app-url.ts` agora é `https://www.conexaomaconica.com.br`.
- [x] Validação em produção (checklist da seção 48): `/diagnostics` deslogado 404, `/health` `{"ok":true}`, sem "Kernel Boot Started" em home/login, `noindex, follow` com `X-Robots-Tag` em `/anunciar*` e `/pesquisa*`, sitemap sem onboarding, canonical com www.

## Decisões registradas em 2026-10-07

- `docs/SABA-seo.md` foi **deixado de lado** por decisão do responsável: a execução segue os sprints deste README
  (SEO e Growth). Páginas-pilar densas, rota `/solucoes/...` e `SoftwareApplication` ficam fora do plano até nova
  decisão. (O `AGENTS.md` ainda cita `docs/SABA-seo.md`; ajustar lá é decisão separada.)
- Correção do diagnóstico da Fase 0, item 16: `/presenca` **não** é página duplicada; é um redirect (307) para
  `/eventos/conexao-empresarial-2026`. Nada a unificar.

## Sprint 2 — Indexação e rastreamento (implementada e validada em produção em 2026-10-07)

- [x] Canonical (via `appUrl()`, domínio com www) em `/guia/eventos`, `/guia/beneficios`, `/termos`, `/privacidade` e `/guia/lojas/{slug}`.
- [x] Títulos sem a marca duplicada (`title.absolute`) em eventos, benefícios, termos, privacidade, lojas, evento, pesquisas, cadastro, contratação, adesão, QR, 404, login e área logada. `/register`, `/forgot-password` e `/update-password` ganharam título próprio (`/register` se chamava "Entrar").
- [x] `/guia/eventos` com filtros: `noindex, follow` e canonical da lista limpa.
- [x] `robots.txt`: bloqueia `/anunciante/`, `/minha-conta/`, `/usuario/`, `/master/`, `/platform/`, `/auth/`, `/c/`, `/cadastro/`, `/contratacao/` e `/adesao/` (além dos anteriores). `/anunciar` e `/pesquisa*` **não** são bloqueados de propósito, para o Google ler o `noindex`.
- [x] Sitemap: sem `lastmod` artificial (páginas fixas só têm data quando há dado real: `/guia` e `/guia/empresas` usam a última edição de empresa); inclui `/guia/eventos`, `/guia/beneficios` e eventos publicados (`/eventos/{slug}`).
- [x] Lojas (`/guia/lojas/{slug}`): `noindex, follow` + canonical, até terem conteúdo próprio. Seguem fora do sitemap.
- [x] `/guia/OpticaCirculo` (maiúsculas) redireciona de forma permanente para a forma minúscula.
- [x] `llms.txt` atualizado, com o domínio com www e as páginas reais.
- [x] Migration `201_public_seo_events.sql` aplicada: eventos publicados entram no sitemap.
- [x] Migration `202_move_launch_event_to_conexao_tenant.sql` aplicada: o evento de lançamento e as 6 inscrições estavam no tenant da "Loja Luz do Oriente" (seed antigo com `LIMIT 1` sem `ORDER BY`) e foram para o tenant da Conexão.
- [ ] Ajuste do redirect `http://conexaomaconica.com.br` -> `https://www...` em um salto (configuração do domínio na Vercel, manual).
- [x] Validação em produção (seção 49): `validate-sprint2.ps1` terminou com "SPRINT 2 VALIDADA".

## Sprint 3 — Analytics (implementada em 2026-10-08; aguardando deploy e validação no GA4)

Detalhes: `docs/seo/eventos-ga4.md`.

- [x] GA4 no **layout raiz** (antes só no layout público): o funil `/anunciar/*`, `/login` e `/register` passam a ser medidos. Áreas internas e rotas com token na URL ficam fora (`lib/analytics/ga-paths.ts`).
- [x] Consentimento estrito preservado (nenhum script do Google antes do "Aceitar"); fila de eventos até o GA ficar pronto (o `view_business` da primeira página não se perde mais).
- [x] Dicionário único de eventos e parâmetros (`lib/analytics/{types,events,ga}.ts`) com lista permitida de parâmetros e higienização do termo de busca.
- [x] Eventos novos: `search_business`, `select_category`, `select_city`, `view_city`, `view_category`, `favorite_business`, `view_offer`, `register_visit`, `register_connection`, `generate_lead`, `start_advertiser_signup`, `complete_advertiser_signup`, `contract_signed`, `payment_confirmed` (cartão).
- [x] Eventos de contato e `view_business` agora levam os dados da empresa (id, nome, categoria, cidade, estado, plano); sem listener global duplicado.
- [x] `click_directions` mantido (já é evento-chave no GA4); `click_route` do README é alias.
- [ ] `payment_confirmed` por Pix, `business_published` e `profile_completed` (exigem medição por servidor ou decisão de produto; ver pendências em `eventos-ga4.md`).
- [ ] Validação no GA4 (DebugView) e marcação dos novos eventos-chave após o deploy.

## Sprint 4 em diante



[ ] Sprint 4 — Metadata e SEO técnico (próxima)
[ ] Sprint 5 — Dados estruturados
[ ] Sprint 6 — Performance
[ ] Sprint 7 — SEO programático
[ ] Sprint 8 — Growth e conversão

Itens conhecidos que ficam para sprints seguintes: breadcrumb visível, links internos, headings e alts (Sprint 4); JSON-LD completo (Sprint 5); cache/ISR, `<img>` e
JavaScript do cliente (Sprint 6); normalização de categorias e política de lojas/eventos/ofertas em larga escala
(Sprint 7).

---

# 48. Checklist de validação da Sprint 1 (após o deploy)

```text
[ ] /diagnostics deslogado          -> 404
[ ] /diagnostics como admin         -> mostra o diagnóstico
[ ] /health                         -> {"ok":true}
[ ] HTML da home/login              -> sem "Kernel Boot Started"
[ ] /anunciar/passo-1               -> meta robots "noindex, follow" e cabeçalho X-Robots-Tag
[ ] /pesquisas/perfil-e-negocios    -> noindex, follow
[ ] /sitemap.xml                    -> sem /anunciar e sem /pesquisa
[ ] canonical de /guia/empresas     -> https://www.conexaomaconica.com.br/guia/empresas
[ ] canonical de /guia/lojas        -> https://www.conexaomaconica.com.br/guia/lojas
[ ] Search Console                  -> reenviar o sitemap
```

---

# 49. Checklist de validação da Sprint 2 (após o deploy e a migration 201)

```text
[ ] /sitemap.xml                 -> inclui /guia/eventos, /guia/beneficios e /eventos/conexao-empresarial-2026
[ ] /sitemap.xml                 -> páginas fixas sem <lastmod> (exceto /guia, /guia/empresas e /guia/eventos)
[ ] /robots.txt                  -> Disallow de /anunciante/, /minha-conta/, /auth/, /c/ ...; /anunciar NÃO bloqueado
[ ] /guia/eventos                -> título "Agenda de Eventos e Comunicados | Conexão Maçônica" e canonical
[ ] /guia/eventos?type=lojas     -> noindex, follow e canonical sem parâmetro
[ ] /guia/beneficios, /termos, /privacidade -> título sem marca duplicada e canonical com www
[ ] /guia/lojas/{slug}           -> noindex, follow e canonical
[ ] /register                    -> título "Criar conta | Conexão Maçônica"
[ ] /guia/OpticaCirculo          -> 308 para /guia/opticacirculo
[ ] /llms.txt                    -> links com www
```

