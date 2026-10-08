# Auditoria de Arquitetura Mobile — Conexão Maçônica (CivicOS SABA)

> **Documento Canônico de Arquitetura Mobile — Fase 0**  
> **Status:** Homologado (Fase 0 — Análise e Auditoria)  
> **Escopo:** Integração Web + Android + iOS sobre Monorepo, Supabase e Capacitor.

---

## 1. Visão Geral e Princípio Fundamental

A estratégia do **Conexão Maçônica (CivicOS SABA)** para dispositivos móveis não é a criação de um "wrapper isolado de site" nem a reescrita total em uma nova stack (como React Native/Flutter), mas sim a **consolidação de uma plataforma única de triplo canal (Web + Android + iOS)** alimentada pelo mesmo backend Supabase, com banco de dados centralizado e regras de negócio unificadas.

```
                         CONEXÃO MAÇÔNICA
                                │
                      ┌─────────┴─────────┐
                      │                   │
                   BACKEND            DADOS & STORAGE
                   SUPABASE              SUPABASE
                      │                   │
               Auth • RLS • APIs      Empresas • Membros
               Regras • Eventos       Eventos • Conexões
               Analytics • Push       Benefícios • Contratos
                      │
            ┌─────────┼─────────┐
            │         │         │
           WEB      ANDROID     iOS
        Next.js    Capacitor  Capacitor
```

### Papéis Estratégicos dos Canais:
- **Web (`apps/web`)**: Foco em **Aquisição e SEO** (Google, páginas de cidade, guia público de empresas, lojas maçônicas e eventos).
- **Mobile (`apps/mobile` - Android/iOS)**: Foco em **Engajamento e Recorrência** (Notificações Push, biometria, mapa de proximidade, leitor de QR Code para Mural/Conexões, favoritos offline e experiência rápida na ponta dos dedos).
- **PWA (Progressive Web App)**: Ponte intermediária para instalação sem fricção e laboratório de UX móvel.

---

## 2. Auditoria do `apps/mobile` Existente

Inspeção dos arquivos atuais da pasta [`apps/mobile`](file:///c:/saas-platform/apps/mobile):

### 2.1. Arquivos Auditados
- **[`package.json`](file:///c:/saas-platform/apps/mobile/package.json)**:
  - Dependências principais: `@capacitor/core` (^7.0.0), `@capacitor/preferences` (^7.0.0), `@capacitor/camera` (^7.0.0), `@capacitor/geolocation` (^7.0.0), `@capacitor/push-notifications` (^7.0.0), `@capacitor/haptics` (^7.0.0).
  - CLI: `@capacitor/cli` (^7.0.0).
  - Scripts: `sync`, `open:android`, `open:ios`.
- **[`capacitor.config.ts`](file:///c:/saas-platform/apps/mobile/capacitor.config.ts)**:
  - `appId`: `com.saas.platform` (DEVE ser atualizado para `com.conexaomaconica.app`).
  - `appName`: `SaaS Platform` (DEVE ser atualizado para `Conexão Maçônica`).
  - `webDir`: `../web/out` (Configuração para static export ou runtime shell).
- **[`src/adapters.ts`](file:///c:/saas-platform/apps/mobile/src/adapters.ts)**:
  - Implementa a interface `PlatformCapabilities` de `@saas/core`.
  - **Pronto / Funcional**: `CapacitorStorageAdapter` (via Preferences), `CapacitorCameraAdapter` (Galeria/Câmera), `CapacitorHapticsAdapter`.
  - **Incompleto (Gaps)**: `geolocation` está apontando para `null` (comentário `TODO: Implement CapacitorGeolocationAdapter`), `pushNotifications` está apontando para `null` (comentário `TODO: Implement CapacitorPushAdapter`).

### 2.2. Diagnóstico de Prontidão do `apps/mobile`
| Componente | Status Atual | Ação Necessária |
| :--- | :--- | :--- |
| Estrutura de Monorepo | Pronta | Manter vinculação no Turborepo |
| Dependências Capacitor v7 | Prontas | Atualizar manifestos de permissões nativas |
| Configuração de App ID | Inadequada (`com.saas.platform`) | Atualizar para `com.conexaomaconica.app` |
| Adaptador de Storage | Operacional | Migrar dados sensíveis para Secure Storage no Android/iOS |
| Adaptador de Câmera | Operacional | Conectar ao leitor de QR Code e upload de foto de perfil/mural |
| Adaptador de Haptics | Operacional | Utilizar em feedbacks táteis de botões e confirmação de conexões |
| Adaptador de Geolocalização | **Pendente (null)** | Implementar `CapacitorGeolocationAdapter` |
| Adaptador de Push | **Pendente (null)** | Implementar `CapacitorPushAdapter` integrado com FCM/APNs |
| Pastas Nativas (`android/` e `ios/`) | Não geradas | Gerar apenas nas Fases 2/9 do Roadmap |

---

## 3. Auditoria do Monorepo & Pacotes Compartilhados

### 3.1. Diagnóstico do Acoplamento Atual (`apps/web/src/lib`)
Atualmente, diversas regras de negócio estão em [`apps/web/src/lib`](file:///c:/saas-platform/apps/web/src/lib):
- `auth/`, `business/`, `connections/`, `events/`, `lodges/`, `masonic/`, `member/`, `notifications/`, `privacy/`, `security/`, `seo/`, `surveys/`.

Estas funções utilizam diretamente `@supabase/ssr` via `cookies()` do Next.js App Router, tornando-as dependentes de Server Components ou Server Actions.

### 3.2. Proposta de Desacoplamento e Evolução Gradual dos Pacotes

Para evitar *overengineering* imediato, a migração será gradual. Não moveremos todo o código de uma vez; criaremos as abstrações compartilhadas conforme o consumo mobile for exigindo:

```
packages/
├── core/             → Interfaces de plataforma, Kernel, EventBus, Capabilities
├── shared/           → Utilitários puros (formatadores, validações, constantes)
├── sdk/              → Cliente de dados Supabase unificado (Web + Mobile)
├── ui/               → Design System (Tokens de marca, botões, cards, selos)
└── business/ (Novo)  → Serviços puros de negócio (empresas, membros, conexões, eventos)
```

#### Pacotes Sugeridos e Responsabilidade:
1. **`@saas/sdk`**: Abstrai chamadas ao Supabase (RPCs, seleções, mutações) sem dependência de `next/headers` ou `cookies()`. Pode ser consumido pelo Web (Client Components / SWR) e pelo App Mobile.
2. **`@saas/business` (Gradual)**: Concentra regras de validação de elegibilidade de anúncios, cálculo de selos (Pedra Fundamental, Fundadora), regras do Mural de Conexões e Benefícios.
3. **`@saas/ui`**: Exporta os componentes de UI reutilizáveis (tokens de cor Bordô `#6B1D2F` e Dourado `#D4AF37`, cards de empresas, selos institucionais).

---

## 4. Backend Único & Estratégia de APIs (Supabase)

### 4.1. Fonte Única da Verdade
Web, Android e iOS consultarão a mesma instância do **Supabase**:
- **Banco de Dados PostgreSQL**: Tabelas `businesses`, `lodges`, `profiles`, `connections`, `events`, `benefits`, `analytics_events`.
- **Row Level Security (RLS)**: Regras de segurança nativas garantindo isolamento de dados do usuário e do anunciante em todas as plataformas.
- **Supabase Storage**: Buckets `business-logos`, `event-covers`, `user-avatars`, `mural-photos`.
- **Auth**: Supabase GoTrue emitindo JWTs unificados.

### 4.2. Adaptação de Server Actions para Consumo Mobile
Server Actions de Next.js não devem ser consumidas diretamente por um app móvel. Para garantir interoperabilidade:
1. **Consultas e Mutações Simples**: O app móvel utilizará o `@supabase/supabase-js` diretamente, aproveitando as RLS já validadas.
2. **Operações Complexas / Transacionais**: Serão expostas via **Route Handlers (`/api/v1/...`)** no Next.js ou **Supabase Edge Functions** protegidas por Bearer Token JWT.

---

## 5. Autenticação Mobile & Armazenamento Seguro

### 5.1. Fluxo de Autenticação Móvel (PKCE Flow)
O aplicativo mobile utilizará a estratégia PKCE (*Proof Key for Code Exchange*) para autenticação segura no Supabase GoTrue:

```
[ App Mobile ] ──( 1. Login Email/Senha ou Magic Link )──> [ Supabase Auth ]
               <──( 2. Access Token JWT + Refresh Token )─── [ Supabase Auth ]
[ Secure Storage ] <──( 3. Persiste Refresh Token )
```

### 5.2. Armazenamento de Tokens e Sessão
- **Web**: Usa cookies `httpOnly`, `sameSite=Lax` via `@supabase/ssr`.
- **Mobile (Android/iOS)**: O token de sessão e refresh token serão armazenados em hardware seguro via **Capacitor Preferences / Secure Storage** (Keystore no Android e Keychain no iOS). NUNCA em `localStorage` desprotegido.

### 5.3. Solicitação de Exclusão de Conta (LGPD / Apple / Google)
Para atender às diretrizes da Apple (App Store Review Guideline 5.1.1(v)) e da Google Play (Data Safety Policy):
- **No Aplicativo**: Rota física `Perfil > Privacidade e Dados > Excluir Minha Conta`. Ao clicar, aciona a RPC Supabase `request_account_deletion`.
- **URL Pública Externa**: Disponibilizar o formulário público em `https://www.conexaomaconica.com.br/excluir-conta` para usuários que excluíram o app mas desejam apagar seus dados.

---

## 6. Recursos Nativos e Adaptadores de Plataforma

| Recurso Nativo | Plugin Capacitor | Uso no Conexão Maçônica |
| :--- | :--- | :--- |
| **Push Notifications** | `@capacitor/push-notifications` | Avisos de novas conexões, novos benefícios na cidade, eventos futuros e mensagens administrativas. |
| **Câmera & QR Code** | `@capacitor/camera` + `@zxing/library` / `html5-qrcode` | Validação de presença em eventos, leitura de QR do membro no Mural e envio de foto de perfil/comprovante. |
| **Geolocalização** | `@capacitor/geolocation` | Filtro de "Empresas e Serviços Próximos a Mim" (raio em km). |
| **Compartilhamento** | `@capacitor/share` | Compartilhamento nativo de empresas, eventos e lojas pelo WhatsApp, Instagram e e-mail. |
| **Feedback Tátil** | `@capacitor/haptics` | Vibração ao registrar conexão, favoritar empresa e ler QR code. |
| **Deep Links** | `@capacitor/app` | Abertura direta do app ao clicar em links `https://conexaomaconica.com.br/guia/empresa-xyz`. |
| **Abertura Externa** | `@capacitor/browser` / Intent Native | Disparo de chamada telefônica (`tel:`), conversa no WhatsApp (`https://wa.me/...`) e rotas no Google Maps/Waze. |

---

## 7. Arquitetura de Navegação Mobile

A interface mobile utilizará os tokens visuais consagrados da marca (Bordô `#4B161B`, Dourado `#C9A227`, Marfim `#F3EEDD`), porém adaptada para **usabilidade por toque** com barra inferior de navegação (*Bottom Navigation*):

```
┌─────────────────────────────────────────────────────────┐
│                     CONEXÃO MAÇÔNICA                    │
│ [ Localização: Feira de Santana - BA ]        [ Notif ] │
├─────────────────────────────────────────────────────────┤
│ 🔍 Buscar empresas, serviços, eventos...                │
│                                                         │
│ 📌 Destaques Próximos          📍 Empresas no Mapa       │
│ [ Card Empresa 1 ]             [ Card Empresa 2 ]       │
│                                                         │
│ 🎁 Benefícios Exclusivos      📅 Próximos Eventos       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [🏠 Início]  [🔍 Explorar]  [📷 QR]  [🤝 Conexões]  [👤 Perfil] │
└─────────────────────────────────────────────────────────┘
```

### Seções do Menu Inferior:
1. **Início**: Feed principal personalizado, anúncios em destaque, Atalhos rápidos e benefícios do dia.
2. **Explorar**: Busca avançada com sub-abas (Empresas, Benefícios, Eventos, Lojas Maçônicas, Mapa Interativo).
3. **QR Code (Ação Central)**: Leitor de QR Code para registrar conexões rápidas e validar vouchers.
4. **Conexões & Mural**: Histórico de interações da rede, selos de apoio e depoimentos de membros.
5. **Perfil**: Dados do usuário, empresas salvas como favoritas, histórico de benefícios e central de privacidade (exclusão de conta).

---

## 8. Estratégia de Pacotes Compartilhados vs APIs/Route Handlers

Para proteger o sistema Web que já se encontra em produção e recebendo cadastros de empresas:
- **NÃO refatorar o núcleo Web desnecessariamente**: As Server Actions, rotas e serviços existentes em `apps/web/src/lib` continuarão operando sem alterações.
- **Extração por Necessidade Real**: Apenas criaremos pacotes compartilhados (`packages/`) quando houver reutilização direta entre Web e Mobile de lógica pura (ex: calculadoras de selos, formatadores, validadores Zod, DTOs).
- **APIs & Route Handlers**: Regras complexas de servidor e consultas autenticadas para os apps móveis serão expostas via Route Handlers do Next.js (`/api/v1/...`) ou chamadas diretas com Supabase RLS via `@saas/sdk`, preservando a Trilha A (Web Produção).

---

## 8. Sincronização de Dados & Cache

### 8.1. Estratégia de Sincronização
Para evitar consumo excessivo de dados e garantir resposta rápida:
- **Alterações de Cadastro / Admin**: Ao alterar uma empresa no Painel Master Web, os dados são atualizados no Supabase Postgres.
- **Invalidação de Cache**: O app móvel consultará dados com estratégias de cache **Stale-While-Revalidate (SWR)**.
- **Realtime Seletivo**: O Supabase Realtime será ativado **apenas** nas telas de Notificações em Tempo Real e Confirmações do Mural de Conexões. Consultas de diretório e busca usarão requisições HTTP REST normais.

### 8.2. Suporte Parcial Offline
O aplicativo manterá em cache local (via Preferences/Storage):
- Perfil do usuário logado.
- Lista de empresas favoritadas.
- Código QR estático do membro.
- Últimas 20 empresas visualizadas.

---

## 9. Arquitetura de Notificações Push

```
[ Painel Master / Backend ]
           │
           ▼
[ Supabase Edge Function: send-push ]
           │
     ┌─────┴─────┐
     ▼           ▼
  [ FCM ]     [ APNs ]  (Firebase Cloud Messaging / Apple Push Notification)
     │           │
     ▼           ▼
[ Android ]   [ iOS ]
```

### Segmentação de Mensagens:
- **Por Localização**: Notificar membros de Feira de Santana sobre novos benefícios na região.
- **Por Interação**: Notificar o anunciante quando um usuário clicar no seu WhatsApp ou registrar uma conexão.
- **Institucional**: Lembretes de eventos de Lojas Maçônicas cadastradas.

---

## 10. Analytics Unificado (Web + Mobile)

A plataforma registrará eventos em uma única tabela canônica (`analytics_events`) e via Google Analytics 4 (GA4):

### Matriz de Eventos Unificada:
- `view_business`: Visualização de perfil de empresa.
- `search_business`: Busca por termo/categoria/cidade.
- `click_whatsapp`: Clique no botão de WhatsApp da empresa.
- `click_phone`: Clique para ligar para a empresa.
- `click_route`: Clique para abrir rotas no Maps/Waze.
- `share_business`: Compartilhamento nativo da empresa.
- `favorite_business`: Adição à lista de favoritos.
- `register_connection`: Registro de interação no Mural.
- `app_open`: Abertura do aplicativo.

Cada evento registrará a coluna `platform` (`web`, `android`, `ios`) mantendo a integridade sem duplicar métricas de receita ou conversão.

---

## 11. Conformidade LGPD & Requisitos das Lojas (Stores)

### 11.1. Google Play Console (Data Safety)
Declarar no formulário de Segurança dos Dados:
- **Dados Coletados**: Nome, e-mail, telefone, localização aproximada/exata (se autorizada), fotos enviadas, interações e identificadores do dispositivo.
- **Finalidade**: Funcionalidade do app, personalização e prevenção a fraudes.
- **Exclusão de Dados**: Link direto para a página web de exclusão e botão interno no app.

### 11.2. Apple App Store (App Privacy & Guidelines)
- **Guideline 4.2 (Functionality)**: Garantir que o app ofereça busca nativa, geolocalização, leitor de QR Code, Push e favoritos localmente para evitar a rejeição por "simples WebView/Wrapper".
- **Guideline 5.1.1 (Account Deletion)**: Garantir que a exclusão da conta apague o perfil do GoTrue Auth e solicite a remoção dos dados pessoais do banco Postgres.

---

## 12. Auditoria PWA (Progressive Web App)

### Estado Atual:
- O projeto `apps/web` possui imagens de logo e selos em `public/`, mas **não possui** o arquivo `manifest.json` ou `manifest.webmanifest`.
- Não há Service Worker configurado para controle de cache e exibição do banner de instalação.

### Plano para Fase 1 (PWA):
1. Criar `apps/web/public/manifest.json` ou `manifest.ts` especificando `display: "standalone"`, `theme_color: "#4B161B"`, `background_color: "#F3EEDD"` e ícones em resoluções 192x192 e 512x512.
2. Implementar Service Worker leve para instalação rápida na tela inicial do celular.

---

## 13. Síntese do Diagnóstico de Arquitetura

| Critério | Diagnóstico Atual | Estado Alvo (Pós-Fase 0) |
| :--- | :--- | :--- |
| **Arquitetura Geral** | Monorepo pnpm + Turbo | Mantido e otimizado |
| **Base Mobile** | [`apps/mobile`](file:///c:/saas-platform/apps/mobile) com Capacitor v7 | Estrutura pronta, necessita ajustes de config |
| **Adaptadores Nativos** | Câmera, Storage e Haptics ok. Geolocation e Push pendentes. | Implementar adaptadores pendentes |
| **Backend** | Supabase (Postgres + Auth + Storage + RLS) | Fonte única para Web, Android e iOS |
| **Regras de Negócio** | Acopladas a Server Actions no Web | Expostas via APIs REST / `@saas/sdk` |
| **Exclusão de Conta** | RPC `request_account_deletion` pronta no Supabase | Criar tela no app e URL pública |
| **PWA** | Faltando `manifest.json` | Criar na Fase 1 |

---

## 14. Veredito da Fase 0

> **VEREDITO: GO COM RESSALVAS**  
> 
> **Ressalvas Obrigatórias Antes dos Builds Nativos:**  
> 1. NÃO executar `npx cap add android` ou `npx cap add ios` até a conclusão da Fase 1 (PWA) e Fase 2 (Base de Navegação Capacitor).  
> 2. Atualizar o `appId` de `com.saas.platform` para `com.conexaomaconica.app` no [`capacitor.config.ts`](file:///c:/saas-platform/apps/mobile/capacitor.config.ts).  
> 3. Implementar os adaptadores nativos pendentes (`CapacitorGeolocationAdapter` e `CapacitorPushAdapter`) em [`apps/mobile/src/adapters.ts`](file:///c:/saas-platform/apps/mobile/src/adapters.ts).  
> 4. Garantir que o app utilize uma interface otimizada com navegação inferior (*Bottom Bar*) nativa para afastarmos qualquer risco de rejeição por "wrapper de site".

---
*Fim do Documento de Auditoria Mobile — Fase 0*
