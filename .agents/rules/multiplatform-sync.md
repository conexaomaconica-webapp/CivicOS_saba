---
description: Regra de paridade e sincronização obrigatória entre as 4 plataformas (Web Desktop + Web Mobile + App iOS + App Android).
always_on: true
---

# Regra de Paridade e Sincronização Multiplataforma (4 Plataformas Obrigatórias)

Sempre que qualquer correção de bug, ajuste de funcionalidade, alteração de regra de negócio, contrato, cálculo comercial, autenticação ou componente visual for realizado, o agente DEVE garantir e aplicar a sincronização imediata nas **4 plataformas** do ecossistema:

1. **Web Desktop** (`apps/web`): Telas e fluxos para navegadores desktop.
2. **Web Mobile** (`apps/web`): Responsividade em navegadores móveis (`touch`, drawer, modal adaptado, viewport responsivo).
3. **App iOS** (`apps/mobile`): Interface Capacitor para iOS (safe-areas, status bar, styles e overrides em `apps/mobile/ios-overrides/`).
4. **App Android** (`apps/mobile`): Interface Capacitor para Android (hardware back button, splash, styles e overrides em `apps/mobile/android-overrides/`).

## Diretrizes de Execução
- **Regras de Negócio e Contratos:** Regras comerciais, planos, vigências e validações alteradas na Web devem ser refletidas nos fluxos móveis correspondentes.
- **UI / UX:** Ajustes visuais devem ser checados em desktop e no viewport mobile (`apps/web`) e replicados no aplicativo nativo (`apps/mobile/src/App.tsx`, `apps/mobile/src/styles.css`).
- **Validação Cruzada:**
  - `pnpm --filter web typecheck` && `pnpm --filter web exec vitest run`
  - `pnpm --filter mobile typecheck` && `pnpm --filter mobile test`
