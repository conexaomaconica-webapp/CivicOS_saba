# Documento de Implementação — Fase Mobile 2 (Base Capacitor)

> **Documento Canônico — Fase Mobile 2**  
> **Status:** Concluído & Homologado (Branch `feature/mobile-capacitor`)  
> **Data:** 07/10/2026  
> **Escopo:** Configuração central do Capacitor CLI v7, inicialização do App ID oficial e adaptadores nativos completos em `@saas/mobile`.

---

## 1. Visão Geral e Alterações de Configuração

### 1.1. Identificação Oficial do Aplicativo
- **App ID**: `com.conexaomaconica.app` (Anteriormente `com.saas.platform`).
- **App Name**: `Conexão Maçônica` (Anteriormente `SaaS Platform`).
- **Arquivo de Configuração**: [`apps/mobile/capacitor.config.ts`](file:///c:/saas-platform/apps/mobile/capacitor.config.ts).

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.conexaomaconica.app',
  appName: 'Conexão Maçônica',
  webDir: '../web/out',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

---

## 2. Adaptadores Nativos Homologados (`apps/mobile/src/adapters.ts`)

Todas as capacidades definidas na interface `PlatformCapabilities` de `@saas/core` possuem agora implementações ativas via adaptadores nativos do Capacitor v7:

1. **Storage (`CapacitorStorageAdapter`)**: Armazenamento nativo seguro via `@capacitor/preferences`.
2. **Câmera (`CapacitorCameraAdapter`)**: Acesso a foto/galeria via `@capacitor/camera`.
3. **Geolocalização (`CapacitorGeolocationAdapter`)**: Coordenadas de proximidade em tempo real e rastreamento via `@capacitor/geolocation`.
4. **Push Notifications (`CapacitorPushAdapter`)**: Registro de tokens e tratamento de payloads via `@capacitor/push-notifications`.
5. **Haptics (`CapacitorHapticsAdapter`)**: Respostas táteis de vibração/impacto via `@capacitor/haptics`.

---

## 3. Matriz de Scripts do Pacote `@saas/mobile`

| Comando | Descrição |
| :--- | :--- |
| `pnpm --filter @saas/mobile sync` | Sincroniza plugins e configurações do `capacitor.config.ts` com os projetos nativos. |
| `pnpm --filter @saas/mobile open:android` | Abre o projeto Android no Android Studio (disponível quando a pasta `android/` for gerada na Fase 9). |
| `pnpm --filter @saas/mobile open:ios` | Abre o projeto iOS no Xcode (disponível quando a pasta `ios/` for gerada na Fase 10). |

---

## 4. Próximos Passos (Fase Mobile 3 — Autenticação Mobile)

Com a base do Capacitor e os adaptadores nativos concluídos na **Fase Mobile 2**, a próxima etapa será a **Fase Mobile 3 (Autenticação Mobile)**, focada na persistência de sessão seguro via hardware nativo (*Keychain/Keystore*) e solicitação de exclusão de conta em conformidade com as diretrizes das lojas.

---
*Fim do Documento de Implementação — Fase Mobile 2*
