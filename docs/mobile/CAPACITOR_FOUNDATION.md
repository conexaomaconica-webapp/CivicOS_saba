# Documento de Implementação — Fase Mobile 2 (Base Capacitor & Contêiner Android)

> **Documento Canônico — Fase Mobile 2 (Divisão 2A & 2B)**  
> **Status:** Fase 2A & 2B Concluídas (Branch `feature/mobile-capacitor`)  
> **Data:** 08/10/2026  
> **Escopo:** Configuração central do Capacitor CLI v7, inicialização do App ID congelado `com.conexaomaconica.app`, adaptadores nativos e geração do projeto Android nativo (`apps/mobile/android`).

---

## 1. Estrutura e Divisão da Fase Mobile 2

Para garantir homologação rigorosa sem promover código incompleto para a `main`:

- **Fase 2A (Fundação Capacitor & Adapters)**:
  - Definir `appId: 'com.conexaomaconica.app'` e `appName: 'Conexão Maçônica'`.
  - Implementar e testar adaptadores nativos para Câmera, Geolocalização, Push Notifications, Haptics e Preferences em `@saas/mobile`.
- **Fase 2B (Runtime Android Container)**:
  - Adicionar o pacote `@capacitor/android` ao `package.json`.
  - Executar `npx cap doctor` e `npx cap add android` gerando a pasta física [`apps/mobile/android`](file:///c:/saas-platform/apps/mobile/android).
  - Executar `pnpm --filter @saas/mobile sync` para vinculação de assets nativos.

---

## 2. Esclarecimento Conceitual de Armazenamento (Preferences vs Secure Storage)

Em estrito alinhamento com os padrões de segurança LGPD e revisão das lojas:

### 2.1. `@capacitor/preferences` (Preferências de Interface)
Utilizado **exclusivamente** para dados não sensíveis:
- Tema visual (`light` / `dark`).
- Flags de UI e status do onboarding local.
- Última cidade/filtro selecionado no diretório.

### 2.2. Secure Storage / Keychain & Keystore (Sensível — Fase 3)
A ser utilizado na **Fase Mobile 3 (Autenticação)** para dados protegidos por criptografia de hardware:
- **iOS**: Keychain da Apple.
- **Android**: Keystore / EncryptedSharedPreferences do Android.
- **Dados salvos**: Token JWT de sessão, Refresh Token, segredos e credenciais temporárias.

---

## 3. Identificação Congelada do Aplicativo

```typescript
// apps/mobile/capacitor.config.ts
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

> **INVARIANTE**: O `appId` (`com.conexaomaconica.app`) é a identidade definitiva do aplicativo Android e iOS perante a Google Play Store e Apple App Store e **NÃO deve ser alterado**.

---

## 4. Adaptadores Nativos Homologados (`apps/mobile/src/adapters.ts`)

Todas as capacidades da interface `PlatformCapabilities` possuem implementações ativas em `@saas/mobile`:

1. **Storage (`CapacitorStorageAdapter`)**: Preferências de interface via `@capacitor/preferences`.
2. **Câmera (`CapacitorCameraAdapter`)**: Acesso a foto/galeria via `@capacitor/camera`.
3. **Geolocalização (`CapacitorGeolocationAdapter`)**: Coordenadas e rastreamento de proximidade via `@capacitor/geolocation`.
4. **Push Notifications (`CapacitorPushAdapter`)**: Registro de tokens e listeners via `@capacitor/push-notifications`.
5. **Haptics (`CapacitorHapticsAdapter`)**: Respostas táteis via `@capacitor/haptics`.

---

## 5. Matriz de Scripts e Testes do Pacote `@saas/mobile`

| Comando | Função / Status |
| :--- | :--- |
| `pnpm --filter @saas/mobile typecheck` | Validação de tipos estritos TypeScript (**Aprovado 0 erros**). |
| `pnpm --filter @saas/mobile test` | Suíte de testes unitários dos adaptadores (**Aprovado 1/1 passou**). |
| `pnpm --filter @saas/mobile sync` | Sincroniza webDir e plugins nativos com o Android Studio. |
| `pnpm --filter @saas/mobile open:android` | Abre a pasta `apps/mobile/android` no Android Studio. |

---

## 6. Próximo Passo (Fase Mobile 3 — Autenticação & Keychain/Keystore)

Com a **Fase 2A & 2B** concluídas na branch `feature/mobile-capacitor`, a próxima etapa será criar a branch `feature/mobile-auth` para implementar a **Fase Mobile 3 (Autenticação Mobile)** com suporte a Secure Storage criptografado.

---
*Fim do Documento de Implementação — Fase Mobile 2 (Base & Contêiner Android)*
