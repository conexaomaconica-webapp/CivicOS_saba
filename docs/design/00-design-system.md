# 00 — Design System CivicOS

**Plataforma:** CivicOS (Foundation & Community Framework)  
**Escopo:** Especificação do Design System Neutro da Plataforma CivicOS, Mapeamento de Tokens Primitivos e Semânticos, Abstração Tipográfica, Elevação, Motion, Estados, Densidade Visual, Mapeamento Tailwind CSS, Stack `shadcn/ui` + Radix UI, Governança de Overrides (`ADM-021`), i18n/Labels e Componentes Compostos.

---

## 1. Arquitetura de Design Neutra & Temas por Tenant

O **Design System CivicOS** é a linguagem visual neutra da infraestrutura white label. Ele separa rigorosamente os **Tokens Primitivos e Semânticos da Plataforma** dos **Temas Específicos das Comunidades** (gerenciados via arquivo de tema da comunidade).

### 1.1 Stack de Implementação de Interface
- **Base Técnica**: Next.js App Router (React).
- **Engine de Estilização**: **Tailwind CSS v3+** mapeado para CSS Custom Properties (`var(--...)`).
- **Biblioteca de Componentes**: **`shadcn/ui`** baseado em primitivos acessíveis do **Radix UI**.
- **Ícones**: **Lucide Icons** (`lucide-react`).

---

## 2. Separação de Tokens Primitivos e Semânticos

### 2.1 Tokens Primitivos da Plataforma

```css
:root {
  /* Escala Primitiva de Cores Neutras */
  --color-slate-50:  #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-400: #94a3b8;
  --color-slate-500: #64748b;
  --color-slate-600: #475569;
  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  --color-slate-850: #151c2e;
  --color-slate-900: #0f172a;
  --color-slate-950: #0b0f19;

  /* Escala Primitiva de Cores de Funcionalidade */
  --color-blue-500:  #3b82f6;
  --color-green-500: #10b981;
  --color-amber-500: #f59e0b;
  --color-red-500:   #ef4444;
  --color-cyan-500:  #06b6d4;

  /* Spacing Scale (Base 4px) */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.50rem;  /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1.00rem;  /* 16px */
  --space-6: 1.50rem;  /* 24px */
  --space-8: 2.00rem;  /* 32px */
  --space-12: 3.00rem; /* 48px */
  --space-16: 4.00rem; /* 64px */

  /* Border Radius */
  --radius-sm: 0.25rem; /* 4px */
  --radius-md: 0.50rem; /* 8px */
  --radius-lg: 0.75rem; /* 12px */
  --radius-full: 9999px;

  /* Elevação e Sombras */
  --shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
  --shadow-dropdown: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.5);

  /* Z-Index Hierarchy */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}
```

### 2.2 Contrato Semântico Obligatório Light / Dark

```css
/* Contrato Semântico Dark Mode (Padrão) */
[data-theme="dark"], :root {
  --background: var(--color-slate-950);
  --foreground: var(--color-slate-50);
  --surface: var(--color-slate-850);
  --surface-hover: var(--color-slate-800);
  --muted: var(--color-slate-800);
  --muted-foreground: var(--color-slate-400);
  --border: #2a364f;
  --ring: var(--color-blue-500);

  --primary: var(--color-blue-500);
  --primary-foreground: #ffffff;
  --secondary: var(--color-slate-600);
  --secondary-foreground: var(--color-slate-50);

  --success: var(--color-green-500);
  --success-foreground: #ffffff;
  --warning: var(--color-amber-500);
  --warning-foreground: #ffffff;
  --danger: var(--color-red-500);
  --danger-foreground: #ffffff;
  --info: var(--color-cyan-500);
  --info-foreground: #ffffff;
}

/* Contrato Semântico Light Mode */
[data-theme="light"] {
  --background: var(--color-slate-50);
  --foreground: var(--color-slate-900);
  --surface: #ffffff;
  --surface-hover: var(--color-slate-100);
  --muted: var(--color-slate-100);
  --muted-foreground: var(--color-slate-500);
  --border: var(--color-slate-200);
  --ring: var(--color-blue-500);

  --primary: var(--color-blue-500);
  --primary-foreground: #ffffff;
  --secondary: var(--color-slate-200);
  --secondary-foreground: var(--color-slate-900);

  --success: var(--color-green-500);
  --success-foreground: #ffffff;
  --warning: var(--color-amber-500);
  --warning-foreground: #ffffff;
  --danger: var(--color-red-500);
  --danger-foreground: #ffffff;
  --info: var(--color-cyan-500);
  --info-foreground: #ffffff;
}
```

---

## 3. Densidade Visual e Mapeamento Tailwind CSS

### 3.1 Padrão de Densidade Visual (`density`)

A plataforma suporta dois níveis de densidade visual baseados no contexto de uso:

| Nível de Densidade | Caso de Uso | Tabela / Grid Padding | Target Size |
|---|---|---|---|
| **`density = comfortable`** | Páginas públicas (`PUB-001..008`), perfis, landing pages | Padding amplo (16px–24px) | 44px (touch friendly) |
| **`density = compact`** | Dashboards administrativos (`ADM-001..021`), Torre de Controle (`CTL-001..007`) | Padding denso (8px–12px) | 36px |

```css
[data-density="compact"] {
  --component-padding-y: 0.375rem; /* 6px */
  --table-row-height: 2.25rem;     /* 36px */
  --input-height: 2.25rem;         /* 36px */
}
```

### 3.2 Exemplo Conceitual de Mapeamento Tailwind (`tailwind.config.ts`)

```typescript
// Mapeamento de CSS Custom Properties para Tailwind CSS
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        border: "var(--border)",
        ring: "var(--ring)",
      },
    },
  },
};

export default config;
```

---

## 4. Governança de Labels e Internacionalização (i18n White Label)

> **Regra Obrigatória**: Nenhum componente compartilhado no Community Framework pode conter textos ou rótulos de domínio hardcoded (ex: "Empresa", "Loja", "Potência", "Irmão").
> 
> Toda terminologia deve ser resolvida dinamicamente através do dicionário do template do tenant (`t('entity.business.singular')`, `t('entity.member.singular')`).

---

## 5. Acessibilidade (WCAG 2.1 AA) e Segurança

> [!WARNING]
> **Advertência de Segurança sobre o `PermissionGuard`**:
> O componente `<PermissionGuard>` é exclusivamente uma ferramenta de experiência do usuário (UX feedback) para oculta/desativar elementos da interface. **Ele NÃO substitui o controle de autorização real**, que deve ser validado obrigatoriamente no servidor (Server Components/Actions), nos serviços de domínio e nas políticas de Row Level Security (RLS) do Supabase.

---

## 6. Componentes Compostos de Negócio (28 Componentes)

1. **`CompanyProfileHeader`**: Hero da empresa combinando Capa, Logo, Nome Fantasia e ações rápidas.
2. **`CommunityBadge`**: Badge honorífico que exibe a credencial e o nível de verificação comunitária.
3. **`BusinessHero`**: Banner em carrossel na Home com métricas comunitárias.
4. **`BusinessGallery`**: Grid responsivo de fotos com Lightbox modal.
5. **`BusinessTimeline`**: Linha do tempo exibindo o histórico da empresa.
6. **`PlanCard`**: Card da tabela de planos comerciais (`PUB-010`).
7. **`ContractViewer`**: Visualizador em PDF seguro com marca d'água e assinatura (`ADV-005`).
8. **`PaymentCard`**: Widget de checkout Pix/Cartão (`ADV-006`).
9. **`VerificationCard`**: Painel do moderador com pareceres e upload (`ADM-003-DET`).
10. **`InteractiveMapWidget`**: Contrato de componente de mapa neutro (`MapProviderAdapter`).
11. **`BusinessCarousel`**: Carrossel horizontal de empresas recomendadas.
12. **`BusinessComparison`**: Tabela comparativa de diferenciais no guia público.
13. **`PlanComparison`**: Tabela comparativa de planos comerciais, recursos e cotas (`PUB-010`).
14. **`OnboardingStepper`**: Barra de progresso multi-etapas do onboarding comercial (`ADV-001..008`).
15. **`StatusTimeline`**: Linha do tempo visual do progresso de aprovação de cadastros.
16. **`BillingSummary`**: Card de resumo financeiro com detalhamento de taxas e totais.
17. **`SignatureProgress`**: Widget de acompanhamento das assinaturas de um contrato.
18. **`DocumentUploader`**: Componente de upload seguro de documentos com preview e progresso.
19. **`ModerationQueue`**: Tabela interativa para moderadores com ações rápidas.
20. **`TenantSwitcher`**: Seletor de tenant no cabeçalho do Platform Master (`CTL-001`).
21. **`PermissionGuard`**: Componente wrapper de UI (sujeito à advertência de segurança acima).
22. **`EmptyState`**: Estado visual padrão para listas vazias com ilustração e ação.
23. **`ErrorState`**: Tela ou card de falha com mensagem amigável e ação de re-tentativa.
24. **`Skeleton`**: Indicador de carregamento estrutural animado.
25. **`NotificationCenter`**: Central de notificações do usuário com contagem e filtros.
26. **`DataTableToolbar`**: Barra de ferramentas padronizada para tabelas administrativas.
27. **`MobileBottomSheet`**: Container móvel deslizante de baixo para cima com gestos.
28. **`MapListSynchronizer`**: Sincronizador bidirecional entre a lista de empresas e o mapa interativo.
