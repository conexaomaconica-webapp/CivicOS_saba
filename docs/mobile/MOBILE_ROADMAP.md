# Roadmap de Implementação Mobile — Conexão Maçônica (CivicOS SABA)

> **Documento Canônico do Roadmap Mobile — Fases 0 a 11**  
> **Status:** Homologado (Fase 0 — Arquitetura Concluída)  
> **Estratégia:** Evolução incremental em 12 fases sem interrupção do sistema Web em produção.

---

## Estrutura Geral das Fases

```
[ Fase 0: Arquitetura ] ➔ [ Fase 1: PWA ] ➔ [ Fase 2: Base Capacitor ] ➔ [ Fase 3: Auth Mobile ]
                                                                                  │
[ Fase 7: Analytics ] ◄─ [ Fase 6: Push ] ◄─ [ Fase 5: Rec. Nativos ] ◄─ [ Fase 4: UX Mobile ]
        │
        ▼
[ Fase 8: LGPD/Stores ] ➔ [ Fase 9: Android Beta ] ➔ [ Fase 10: iOS TestFlight ] ➔ [ Fase 11: Launch ]
```

---

### FASE MOBILE 0 — Auditoria e Alinhamento de Arquitetura (CONCLUÍDA)
- **Objetivo**: Mapear a estrutura existente em `apps/mobile`, auditar o monorepo, backend Supabase, autenticação e conformidade LGPD.
- **Arquivos Envolvidos**: [`docs/mobile/MOBILE_ARCHITECTURE_AUDIT.md`](file:///c:/saas-platform/docs/mobile/MOBILE_ARCHITECTURE_AUDIT.md), [`docs/mobile/MOBILE_ROADMAP.md`](file:///c:/saas-platform/docs/mobile/MOBILE_ROADMAP.md).
- **Dependências**: Nenhuma.
- **Riscos**: Baixo (apenas análise e documentação).
- **Testes Necessários**: `pnpm --filter web typecheck`.
- **Critério de Aceite**: Documentos de auditoria e roadmap gerados e validados com 0 erros de compilação.

---

### FASE MOBILE 1 — PWA (Progressive Web App)
- **Objetivo**: Habilitar a instalabilidade imediata do sistema via navegador no Android e iOS com manifesto web, tema de marca e Service Worker.
- **Arquivos Envolvidos**:
  - `apps/web/public/manifest.json` ou `manifest.ts` (Novo manifesto com `theme_color: "#4B161B"` e `background_color: "#F3EEDD"`)
  - `apps/web/src/app/layout.tsx` (Metadados PWA)
  - `apps/web/public/sw.js` (Service Worker para cache offline mínimo)
  - `apps/web/public/icons/*` (Ícones em resoluções 192x192 e 512x512)
- **Dependências**: Logos e ícones existentes em `apps/web/public`.
- **Riscos**: Cache excessivo de HTML por Service Worker mal configurado. Mitigar ativando estrategia Network-First para documentos HTML.
- **Testes Necessários**: Teste do Lighthouse PWA no Chrome DevTools, verificação do prompt "Adicionar à Tela Inicial" no Android e iOS Safari.
- **Critério de Aceite**: Pontuação PWA > 90 no Lighthouse e manifesto válido.

---

### FASE MOBILE 2 — Configuração e Shell Base do Capacitor
- **Objetivo**: Atualizar as configurações centrais do Capacitor em `apps/mobile` e preparar o contêiner de navegação híbrida.
- **Arquivos Envolvidos**:
  - [`apps/mobile/capacitor.config.ts`](file:///c:/saas-platform/apps/mobile/capacitor.config.ts) (Atualizar `appId` para `com.conexaomaconica.app` e `appName` para `Conexão Maçônica`)
  - [`apps/mobile/package.json`](file:///c:/saas-platform/apps/mobile/package.json)
- **Dependências**: Fase 1 (PWA base).
- **Riscos**: Incompatibilidade de portas em ambiente local. Mitigar apontando `server.url` condicionalmente durante desenvolvimento.
- **Testes Necessários**: `pnpm --filter @saas/mobile sync`.
- **Critério de Aceite**: Projeto `@saas/mobile` compila sem erros no Turborepo.

---

### FASE MOBILE 3 — Autenticação Mobile e Armazenamento Seguro
- **Objetivo**: Adaptar a autenticação Supabase GoTrue para persistência de sessão em armazenamento seguro nativo e implementar a exclusão de conta física/URL pública.
- **Arquivos Envolvidos**:
  - [`apps/mobile/src/adapters.ts`](file:///c:/saas-platform/apps/mobile/src/adapters.ts) (`CapacitorStorageAdapter`)
  - `apps/web/src/app/(public)/excluir-conta/page.tsx` (Página pública de solicitação LGPD/Stores)
  - `apps/web/src/components/profile/DeleteAccountModal.tsx` (Modal de exclusão dentro do app)
- **Dependências**: RPC Supabase `request_account_deletion` (já existente).
- **Riscos**: Perda de sessão ao fechar o app mobile. Mitigar utilizando o plugin `@capacitor/preferences` com chaveamento de refresh token.
- **Testes Necessários**: Teste de login, permanência da sessão após reboot do app, logout e disparo de exclusão de conta.
- **Critério de Aceite**: Sessão mantida com sucesso no app e requisição de exclusão de conta funcionando via App e URL pública.

---

### FASE MOBILE 4 — Interface e Navegação Mobile (Bottom Navigation)
- **Objetivo**: Implementar a barra de navegação inferior (*Bottom Navigation Bar*) e adaptar a UX para celulares (Início, Explorar, QR Code, Conexões, Perfil).
- **Arquivos Envolvidos**:
  - `apps/web/src/components/mobile/MobileBottomNav.tsx` (Novo)
  - `apps/web/src/components/mobile/MobileHeader.tsx` (Novo)
  - `apps/web/src/app/layout.tsx` (Inclusão condicional da barra móvel para telas de aplicativo)
- **Dependências**: Tokens de cores (`#6B1D2F`, `#D4AF37`) e componentes da UI.
- **Riscos**: Barra inferior sobrepor conteúdos ou formulários. Mitigar ajustando `padding-bottom: env(safe-area-inset-bottom)` para notch do iOS.
- **Testes Necessários**: Teste de navegação em viewport mobile (390px x 844px) em Chrome/Safari móvel.
- **Critério de Aceite**: Navegação fluida entre as 5 seções principais sem quebra de layout.

---

### FASE MOBILE 5 — Recursos Nativos (Câmera, QR Code, Geolocalização, Share, Haptics)
- **Objetivo**: Completar os adaptadores nativos pendentes em `apps/mobile` e integrar os recursos do dispositivo.
- **Arquivos Envolvidos**:
  - [`apps/mobile/src/adapters.ts`](file:///c:/saas-platform/apps/mobile/src/adapters.ts) (Implementar `CapacitorGeolocationAdapter` e `CapacitorPushAdapter`)
  - `apps/web/src/components/qr/QRCodeScannerModal.tsx` (Integração com Câmera/QR)
  - `apps/web/src/components/directory/ShareBusinessButton.tsx` (Share Nativo)
- **Dependências**: Permissões de câmera e localização no sistema operacional.
- **Riscos**: Usuário negar permissão de câmera/localização. Mitigar com fallbacks amigáveis (digitação manual de código ou busca por cidade).
- **Testes Necessários**: Testes unitários dos adaptadores em `apps/mobile/src/adapters.ts`.
- **Critério de Aceite**: Leitor de QR Code funcional, geolocalização capturando coordenadas e compartilhamento disparando a API nativa.

---

### FASE MOBILE 6 — Push Notifications e Segmentação
- **Objetivo**: Configurar o serviço de Notificações Push via Firebase Cloud Messaging (FCM) para Android e Apple Push Notification Service (APNs) para iOS.
- **Arquivos Envolvidos**:
  - `supabase/functions/send-push/index.ts` (Edge Function de disparo)
  - `apps/web/src/lib/notifications/push-service.ts`
  - [`apps/mobile/src/adapters.ts`](file:///c:/saas-platform/apps/mobile/src/adapters.ts)
- **Dependências**: Credenciais do FCM (google-services.json) e chave APNs da Apple.
- **Riscos**: Notificações bloqueadas em background no iOS. Mitigar configurando o payload APNs adequado com `content-available: 1`.
- **Testes Necessários**: Disparo de push de teste por ID de usuário e por segmento de cidade.
- **Critério de Aceite**: Notificação entregue e clicável em dispositivo de teste, direcionando para a rota interna correspondente.

---

### FASE MOBILE 7 — Analytics Unificado
- **Objetivo**: Garantir o registro de eventos de telemetria e conversão com a identificação unificada da plataforma (`web`, `android`, `ios`).
- **Arquivos Envolvidos**:
  - `apps/web/src/lib/analytics/tracker.ts`
  - `apps/web/src/components/analytics/GoogleAnalytics.tsx`
- **Dependências**: Tabela `analytics_events` no Supabase.
- **Riscos**: Contagem duplicada de eventos em navegações internas. Mitigar mantendo o controle de navegação de página única (SPA).
- **Testes Necessários**: Disparo de eventos `view_business`, `click_whatsapp` e `register_connection` filtrados por plataforma.
- **Critério de Aceite**: Eventos registrados no banco de dados e no GA4 com o parâmetro `platform` correto.

---

### FASE MOBILE 8 — Compliance, LGPD e Preparação para Lojas
- **Objetivo**: Finalizar as políticas de privacidade, manifestos de privacidade da Apple (Privacy Manifest) e formulário de Data Safety do Google Play.
- **Arquivos Envolvidos**:
  - `apps/web/src/app/(public)/privacidade/page.tsx`
  - `apps/web/src/app/(public)/excluir-conta/page.tsx`
  - `docs/security/LGPD_SECURITY_AUDIT.md`
- **Dependências**: Conclusão da Fase 3 (Exclusão de Conta).
- **Riscos**: Rejeição na revisão da Apple/Google por divergência entre o que o app coleta e o que é declarado. Mitigar com auditoria estrita.
- **Testes Necessários**: Verificação de todos os formulários e termos legais em navegadores desktop e móvel.
- **Critério de Aceite**: Documentação legal completa e formulários de Data Safety pré-preenchidos.

---

### FASE MOBILE 9 — Build e Testes Android (Google Play Console)
- **Objetivo**: Gerar o projeto nativo Android (`npx cap add android`), compilar o arquivo `.aab` assinado e disponibilizar para testes internos na Play Store.
- **Arquivos Envolvidos**:
  - `apps/mobile/android/*` (Gerado pelo CLI)
  - `apps/mobile/android/app/build.gradle`
- **Dependências**: Android Studio, Chave de Assinatura (Keystore) e Conta Google Play Console.
- **Riscos**: Falha de compilação por versão de SDK do Gradle. Mitigar fixando o Android SDK no Gradle 8+.
- **Testes Necessários**: Instalação em dispositivos Android físicos (Samsung, Motorola, Xiaomi).
- **Critério de Aceite**: App homologado na faixa de Testes Internos do Google Play Console.

---

### FASE MOBILE 10 — Build e Testes iOS (Apple TestFlight)
- **Objetivo**: Gerar o projeto nativo iOS (`npx cap add ios`), assinar com Certificado Apple Developer e distribuir via TestFlight.
- **Arquivos Envolvidos**:
  - `apps/mobile/ios/*` (Gerado pelo CLI)
  - `apps/mobile/ios/App/App/Info.plist` (Descrições de uso de Câmera, Localização, etc.)
- **Dependências**: Computador Mac com Xcode 15+, Conta Apple Developer Program ($99/ano).
- **Riscos**: Rejeição do TestFlight por chaves de descrição de permissão (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`) ausentes. Mitigar preenchendo todos os textos justificativos em português claro.
- **Testes Necessários**: Testes em iPhones reais via TestFlight.
- **Critério de Aceite**: Build aprovado no TestFlight e distribuído para os beta testers.

---

### FASE MOBILE 11 — Lançamento Oficial Sincronizado
- **Objetivo**: Enviar os aplicativos para revisão final nas lojas (Google Play Store e Apple App Store) e coordenar o lançamento público.
- **Arquivos Envolvidos**: Assets de Loja (Screenshots 6.5", 5.5", 10", Ícones de Loja, Textos Promocionais).
- **Dependências**: Aprovação nos testes das Fases 9 e 10.
- **Riscos**: Tempo de revisão estendido pela equipe da Apple (podendo levar de 24h a 72h). Mitigar enviando para aprovação com margem de segurança.
- **Testes Necessários**: Smoke test pós-publicação baixando o app diretamente das lojas oficiais.
- **Critério de Aceite**: Aplicativo **Conexão Maçônica** publicado e disponível para download na Google Play Store e Apple App Store.

---

## Tabela Resumo do Roadmap

| Fase | Título | Foco | Dependências Principais |
| :--- | :--- | :--- | :--- |
| **0** | Arquitetura | Análise e Documentação | Nenhuma |
| **1** | PWA | Instalabilidade Web | Assets de Imagem |
| **2** | Base Capacitor | Ajuste de Configurações | Fase 1 |
| **3** | Auth & LGPD | Persistência e Exclusão de Conta | Supabase Auth RPC |
| **4** | UX Mobile | Bottom Navigation | Design Tokens |
| **5** | Rec. Nativos | Câmera, QR, Geo, Haptics | Plugins Capacitor |
| **6** | Push | FCM + APNs | Firebase + Apple Keys |
| **7** | Analytics | Eventos Unificados | Tabela `analytics_events` |
| **8** | Compliance | Submissão de Termos/Data Safety | Exclusão de Conta |
| **9** | Android Beta | Play Console / `.aab` | Android Studio |
| **10** | iOS TestFlight | Apple App Store / `.ipa` | Mac + Xcode |
| **11** | Lançamento | Publicação nas Lojas | Fases 9 e 10 |

---
*Fim do Documento do Roadmap Mobile — Fases 0 a 11*
