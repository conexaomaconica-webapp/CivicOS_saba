# 09 — Estratégia Avançada de SEO, GEO e AI Search

**Módulo:** Product Review  
**Escopo:** Posicionamento em mecanismos de busca, inteligência de geolocalização e indexação para LLMs  

---

## 1. Arquitetura de SEO Multi-Tenant

Alinhado com a diretiva `SABA-seo.md`, todas as rotas públicas do guia implementam otimização estrita de SEO:

- **Metadata Dinâmico por Tenant**: Resolução de `title`, `description`, `openGraph` e `canonical` via servidor em tempo de renderização.
- **Fontes de Alta Performance**: Utilização exclusiva de `next/font/google` (`Inter`), eliminando chamadas síncronas a CDNs externas.
- **Micro-dados Estruturados (JSON-LD)**: Injeção de componentes `<StructuredData />` com schemas `SoftwareApplication`, `LocalBusiness`, `Service`, `FAQPage` e `BreadcrumbList`.

---

## 2. Estratégia de Generative Engine Optimization (GEO) & AI Search

Para posicionar a plataforma em motores de busca assistidos por IA (ChatGPT Search, Perplexity, Gemini, Claude Search):

### 2.1 Suporte a `llms.txt` e `llms-full.txt`
- Disponibilização automatizada de arquivos `/llms.txt` na raiz de cada tenant público com descrições concisas e estruturadas do catálogo comercial.
- Permite que assistentes de IA recomendem empresas do guia ao receberem consultas como *"Recomende uma oficina mecânica de irmão verificado em Curitiba"*.

### 2.2 Requisitos Antispam
- **Proibição de Geo-Spam**: Nenhuma página será gerada automaticamente com listas de cidades sem anunciantes reais cadastrados.
- **Conteúdo Relevante**: Todo perfil publicado contém descrições autocontidas, FAQ visível e imagens otimizadas com dimensões e atributos `alt` explícitos.
