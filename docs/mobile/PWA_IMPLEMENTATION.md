# Documento de Implementação PWA — Conexão Maçônica (CivicOS SABA)

> **Documento Canônico — Fase Mobile 1 (PWA)**  
> **Status:** HOMOLOGADO EM PREVIEW (GO PARA MERGE NA MAIN)  
> **Data:** 07/10/2026  
> **Escopo:** Infraestrutura de PWA leve, instalabilidade em Android/iOS/Desktop, Service Worker seguro e preservação total de SEO.

---

## 1. Contexto & Estado Anterior vs Depois

### Estado Anterior (ANTES)
- Não havia manifesto Web (`manifest.json` ou `manifest.ts`).
- Não havia Service Worker para gerenciamento de instalabilidade PWA.
- Ausência de metadados nativos de suporte iOS (`appleWebApp`) e `theme-color` unificado.
- Risco de navegadores exibirem prompt genérico de navegador sem cores de marca.

### Estado Atual (DEPOIS)
- **Manifesto Web NATIVO Next.js App Router**: Gerado dinamicamente via [`apps/web/src/app/manifest.ts`](file:///c:/saas-platform/apps/web/src/app/manifest.ts).
- **Cores Oficiais Homologadas**: Bordô (`#4B161B`), Dourado (`#C9A227`) e Marfim (`#F3EEDD`).
- **Service Worker Leve & Seguro**: Localizado em [`apps/web/public/sw.js`](file:///c:/saas-platform/apps/web/public/sw.js) com política estrita de segurança e LGPD.
- **Suporte iOS Standalone**: Configurado em [`apps/web/src/lib/seo/root-metadata.ts`](file:///c:/saas-platform/apps/web/src/lib/seo/root-metadata.ts) com `appleWebApp.capable: true` e `theme-color: "#4B161B"`.
- **Registro Não Bloqueante**: Componente cliente [`PwaRegister`](file:///c:/saas-platform/apps/web/src/components/mobile/PwaRegister.tsx) montado no `RootLayout`.

---

## 2. Matriz de Arquivos Alterados e Criados

| Arquivo | Ação | Descrição |
| :--- | :--- | :--- |
| [`apps/web/src/app/manifest.ts`](file:///c:/saas-platform/apps/web/src/app/manifest.ts) | **Criado** | Configuração do Web App Manifest do Next.js (nome, cores, ícones, `start_url: "/guia"`). |
| [`apps/web/public/sw.js`](file:///c:/saas-platform/apps/web/public/sw.js) | **Criado** | Service Worker seguro (Network-First para HTML, bloqueio total de cache em rotas sensíveis). |
| [`apps/web/src/components/mobile/PwaRegister.tsx`](file:///c:/saas-platform/apps/web/src/components/mobile/PwaRegister.tsx) | **Criado** | Componente cliente para registro transparente do Service Worker em produção. |
| [`apps/web/src/lib/seo/root-metadata.ts`](file:///c:/saas-platform/apps/web/src/lib/seo/root-metadata.ts) | **Modificado** | Inclusão de `applicationName`, `appleWebApp`, `formatDetection` e `manifest`. |
| [`apps/web/src/app/layout.tsx`](file:///c:/saas-platform/apps/web/src/app/layout.tsx) | **Modificado** | Adição da tag `<meta name="theme-color" content="#4B161B" />` e montagem do `<PwaRegister />`. |
| [`apps/web/test/pwa-foundation.test.ts`](file:///c:/saas-platform/apps/web/test/pwa-foundation.test.ts) | **Criado** | Suíte de testes unitários validando o manifesto, metadados e regras de segurança do SW. |
| [`docs/mobile/scripts/validate-pwa.ps1`](file:///c:/saas-platform/docs/mobile/scripts/validate-pwa.ps1) | **Criado** | Script PowerShell para validação automatizada de endpoints PWA. |

---

## 3. Taxonomia da Estratégia de Cache & Segurança LGPD

Para garantir que o PWA não exponha dados sensíveis, contratos ou áreas administrativas:

### 3.1. Permissões de Cache (Cacheável)
- Assets estáticos com hash de versão (`/_next/static/...`).
- Ícones e logotipos estáticos (`/icone.png`, `/logo.svg`).
- Fontes otimizadas (`woff2`).
- Estilos CSS e scripts bundle versionados.

### 3.2. Cautela (Network-First)
- Páginas públicas de navegação (`/guia`, `/eventos`, `/guia/lojas`, `/guia/beneficios`).
- **Comportamento**: A requisição tenta sempre a rede primeiro para garantir que novas empresas, selos e cadastros apareçam atualizados imediatamente. O cache só responde em caso de falha total de conexão.

### 3.3. Estritamente PROIBIDO de Cache (Bypass Total)
O Service Worker ignora e vai 100% direto para a rede para as seguintes rotas e padrões:
- `/admin/*`
- `/master/*`
- `/minha-conta/*`
- `/usuario/*`
- `/anunciante/*`
- `/contratacao/*`
- `/cadastro/*`
- `/adesao/*`
- `/api/*`
- Requisições com parâmetro/URL contendo `pagamentos`, `contratos`, `checkpoint` ou `onboarding`.
- Qualquer requisição contendo cabeçalho `Authorization` ou métodos `POST`, `PUT`, `DELETE`.

---

## 4. Preservação de SEO, Analytics e Integridade Web

1. **SEO Intacto**:
   - O Googlebot continua recebendo o HTML SSR original emitido pelo Next.js App Router.
   - Nenhuma alteração nos arquivos `sitemap.xml`, `robots.txt` ou tags `<link rel="canonical">`.
2. **Analytics GA4 Preservado**:
   - O componente `GoogleAnalytics` mantido em `RootLayout` sem duplicação de eventos.
   - O PWA instalado compartilha a mesma coleta GA4 sem inflar métricas com acessos fantasmas.

---

## 5. Validação Automatizada e Suíte de Testes

### Execução dos Testes Unitários e de Integração:
- Suíte `apps/web/test/pwa-foundation.test.ts` adicionada.
- Validação completa do Monorepo via `pnpm --filter web typecheck` e `pnpm test`.

---

## 6. Protocolo de Homologação Obrigatório em Vercel Preview (Pré-Produção)

Antes da promoção da branch `feature/mobile-pwa` para `main` (Produção), a URL do Preview da Vercel DEVE passar pelo seguinte roteiro de validação manual:

1. **Testes de Fluxos Críticos**:
   - [ ] Cadastro de nova empresa.
   - [ ] Login, Logout e troca de perfil de usuário.
   - [ ] Onboarding comercial completo.
   - [ ] Assinatura de Contrato de anunciante.
   - [ ] Navegação pelo Painel do Anunciante e Painel Master.
   - [ ] Upload de logotipos e capas de empresas.
   - [ ] Busca e filtragem pública no guia.
   - [ ] Edição de uma empresa e confirmação imediata dos dados atualizados no PWA (sem presas em cache).

2. **Auditoria de DevTools (Service Worker & Cache Storage)**:
   - [ ] Abrir `DevTools > Application > Service Workers`: Confirmar registro limpo do `sw.js`.
   - [ ] Abrir `DevTools > Application > Cache Storage`: Confirmar que **NENHUMA** resposta de `/admin`, `/master`, `/minha-conta`, `/anunciante`, `/api` ou `/cadastro` foi gravada em cache.
   - [ ] Teste de Troca de Versão: Alterar a versão do SW em `sw.js` e verificar se a versão antiga é expurgada automaticamente sem deixar lixo de cache.
   - [ ] Teste pós-Logout: Efetuar logout e garantir que o navegador não exibe dados do usuário anterior.

---

## 7. Checklist de Aceite Final

- [x] Manifesto PWA gerado com `name: "Conexão Maçônica"`, `short_name: "Conexão"`, `start_url: "/guia"`, `display: "standalone"`.
- [x] Cores oficiais da marca configuradas (`theme_color: "#4B161B"`, `background_color: "#F3EEDD"`).
- [x] Ícones 192x192, 512x512 e maskable vinculados a `/icone.png`.
- [x] Service Worker leve implementado com bloqueio estrito em rotas administrativas/sensíveis.
- [x] Metadata mobile e `apple-touch-icon` configurados no Next.js.
- [x] Typecheck e suíte de testes passando com 0 erros.
- [x] Nenhuma dependência nativa Android/iOS inicializada precocemente.

---
*Fim do Documento de Implementação PWA — Fase Mobile 1*
