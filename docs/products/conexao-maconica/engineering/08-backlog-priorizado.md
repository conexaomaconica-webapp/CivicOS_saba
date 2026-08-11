# Documento 08 — Backlog Priorizado

**Versão:** 1.0.0
**Status:** Proposto (aguardando aprovação)
**Base:** `Docs 00–07 (Congelados)` & `Community Framework v1.0`
**Produto:** Conexão Maçônica
**Plataforma:** CivicOS (`foundation-v1.0`)
**Rastreabilidade:** Doc 04 (Mapa de Telas) · Doc 05 (Fluxos e Jornadas) · Doc 07 (Critérios de Aceite)

---

## 1. Objetivo

Este documento consolida o **Backlog Priorizado de Desenvolvimento** do Conexão Maçônica, derivado diretamente da Matriz de Interfaces (Doc 04), das Jornadas do Usuário (Doc 05) e dos Critérios de Aceite organizados em Acceptance Packages (Doc 07).

O backlog é a ponte entre a especificação documental congelada e a execução em sprints (Doc 09 — Plano de Sprints). Cada PBI (Product Backlog Item) carrega a rastreabilidade completa para telas, jornadas, critérios, dependências, estimativa, tipo, risco e Definition of Done.

---

## 2. Estrutura do PBI (Campos Obrigatórios)

| Campo | Descrição |
|---|---|
| **PBI-ID** | Identificador único e imutável. Prefixos: `INF-` (infraestrutura/fundação), `PUB-`, `USR-`, `ADV-`, `ADM-`, `CTL-`, `AUX-` (interfaces do Doc 04), `XS-` (transversal). |
| **Título** | Descrição concisa da entrega. |
| **Fase** | `Fundação` / `MVP 1A-Core` / `MVP 1A-Control` / `MVP 1B` / `Transversal` |
| **AP** | Acceptance Package do Doc 07 (`AP-001` a `AP-005`) ou `—` (infra/transversal). |
| **Interfaces (Doc 04)** | IDs da Matriz de Interfaces responsáveis pelo PBI. |
| **Jornada (Doc 05)** | Jornadas do usuário impactadas (J1–J11). |
| **Critério (Doc 07)** | IDs `CRIT-VSC-XXX` / `CRIT-TRN-XXX` que o PBI deve satisfazer. |
| **Deps** | PBI-IDs dos quais este PBI depende. |
| **SP** | Estimativa em Story Points (escala de Fibonacci: 1, 2, 3, 5, 8, 13). |
| **Tipo** | `Feature`, `Enabler`, `Hardening`, `Fix`, `Spike`, `Legal` |
| **Risco** | `Baixo` / `Médio` / `Alto` |
| **DoD-Ref** | Referência da Definition of Done Global (`CRIT-TRN-031`) + critérios transversais aplicáveis. |

---

## 3. Regras de Priorização

1. **P0 (Crítico)**: Critérios `CRIT-VSC` com `Priority: P0` e NFRs de segurança, tenancy e LGPD. Implantados obrigatoriamente no MVP 1A-Core.
2. **P1 (Alto)**: Critérios `CRIT-VSC` com `Priority: P1` e experiência do usuário essencial.
3. **P2 (Médio)**: Funcionalidades do MVP 1B e melhorias incrementais.
4. **Ordem de execução**: `Fundação → MVP 1A-Core → MVP 1A-Control → MVP 1B`. Dentro de cada fase, executa-se a sequência de dependências indicada na coluna **Deps**.
5. **Regra de Slice Vertical**: Um PBI só é considerado pronto quando atende ao DoD global (`CRIT-TRN-031`) — incluindo testes, auditoria, eventos EDA e homologação visual no Design System v1.0.

---

## 4. Métricas e Capacidade

- **Velocity alvo**: 40–50 SP/sprint (3–4 devs com overhead de fundação); 25–35 SP/sprint (1 dev dedicado, ex: Design Lab).
- **Sprints estimadas**: ~12 sprints até conclusão do MVP 1B (ver Doc 09).
- **Paralelismo**: a partir da Sprint 2, duas tracks — Infra (2 devs) e App (2 devs).

---

## 5. Backlog Priorizado

### 5.1 Fundação (Infraestrutura) — 6 PBIs

> Bloqueia o MVP 1A-Core. RLS, RBAC Runtime, EDA (Outbox/DLQ) e LGPD são pré-requisitos estruturais de qualquer tela.

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| INF-001 | Schema de Banco de Dados conforme Doc 02 (todas as tabelas, FKs compostas, views sanitizadas) | Fundação | — | Todas | J1–J11 | CRIT-TRN-007, CRIT-TRN-008 | — | 8 | Enabler | Alto | CRIT-TRN-031 |
| INF-002 | Políticas RLS em todas as tabelas (isolamento por `tenant_id`, FKs compostas) | Fundação | — | Todas | J1–J11 | CRIT-TRN-008, CRIT-TRN-010 | INF-001 | 8 | Enabler | Alto | CRIT-TRN-031 |
| INF-003 | Outbox Pattern + DLQ + Worker assíncrono idempotente (Doc 06) | Fundação | — | CTL-006 | J11 | CRIT-TRN-026, CRIT-TRN-027, CRIT-TRN-028 | INF-001 | 8 | Enabler | Alto | CRIT-TRN-031 |
| INF-004 | Runtime RBAC (`has_tenant_role`, `has_business_permission`, sessão elevada, Anti-Self-Approval) | Fundação | — | ADM-005 | J2, J9 | CRIT-TRN-004, CRIT-TRN-005, CRIT-TRN-006 | INF-002 | 8 | Enabler | Alto | CRIT-TRN-031 |
| INF-005 | Entitlements Core (planos, versões, cotas e consumo) | Fundação | — | ADM-008, ADV-003 | J3, J6, J7 | CRIT-VSC-005, CRIT-TRN-021 | INF-004 | 5 | Enabler | Alto | CRIT-TRN-031 |
| INF-006 | LGPD Base (aceites, consentimentos, exportação, revogação) | Fundação | — | USR-007 | J3 | CRIT-TRN-012, CRIT-TRN-013, CRIT-TRN-014 | INF-004 | 5 | Enabler | Alto | CRIT-TRN-031 |

**Total Fundação:** 42 SP

---

### 5.2 MVP 1A-Core — 48 PBIs

#### 5.2.1 AP-001 Descoberta & Busca Pública (10 PBIs)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PUB-001 | Splash & Carregamento inicial | MVP 1A-Core | AP-001 | PUB-001 | J1 | CRIT-TRN-022 | — | 1 | Feature | Baixo | CRIT-TRN-031 |
| PUB-002 | Home do Guia Comercial | MVP 1A-Core | AP-001 | PUB-002 | J1 | CRIT-VSC-001 | INF-002 | 3 | Feature | Médio | CRIT-TRN-031 |
| PUB-003 | Busca Global (lista) com filtros | MVP 1A-Core | AP-001 | PUB-003, PUB-004 | J1 | CRIT-VSC-001, CRIT-TRN-023 | PUB-002 | 5 | Feature | Médio | CRIT-TRN-031 |
| PUB-004 | Drawer de Filtros Avançados | MVP 1A-Core | AP-001 | PUB-004 | J1 | CRIT-VSC-001, CRIT-TRN-018 | PUB-003 | 3 | Feature | Baixo | CRIT-TRN-031 |
| PUB-005 | Mapa Interativo Essencial | MVP 1A-Core | AP-001 | PUB-005 | J1 | CRIT-VSC-001, CRIT-TRN-019 | PUB-003 | 5 | Feature | Alto | CRIT-TRN-031 |
| PUB-006 | Diretório de Categorias | MVP 1A-Core | AP-001 | PUB-006 | J1 | CRIT-VSC-001 | INF-002 | 2 | Feature | Baixo | CRIT-TRN-031 |
| PUB-007 | Perfil Público da Empresa | MVP 1A-Core | AP-001 | PUB-007 | J1 | CRIT-VSC-002, CRIT-TRN-022 | PUB-003, INF-006 | 5 | Feature | Médio | CRIT-TRN-031 |
| PUB-010 | Tabela Comercial de Planos | MVP 1A-Core | AP-001 | PUB-010 | J2, J3 | CRIT-VSC-005 | INF-005 | 2 | Feature | Baixo | CRIT-TRN-031 |
| PUB-014 | Validação Pública de Contrato | MVP 1A-Core | AP-001 | PUB-014 | J3 | CRIT-VSC-006 | ADV-005 | 3 | Feature | Médio | CRIT-TRN-031 |
| PUB-015 | Termos de Uso e Privacidade | MVP 1A-Core | AP-001 | PUB-015 | J3 | CRIT-TRN-012 | INF-006 | 1 | Feature | Baixo | CRIT-TRN-031 |

**Subtotal AP-001 (1A-Core):** 30 SP

#### 5.2.2 Autenticação & Conta (3 PBIs)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PUB-011 | Login / Autenticação (JWT + refresh silencioso) | MVP 1A-Core | — | PUB-011 | J1, J2 | CRIT-TRN-001, CRIT-TRN-002, CRIT-TRN-003 | INF-004 | 3 | Feature | Alto | CRIT-TRN-031 |
| PUB-012 | Cadastro de Usuário (pessoal) | MVP 1A-Core | — | PUB-012 | J2 | CRIT-VSC-003, CRIT-TRN-023 | PUB-011 | 3 | Feature | Médio | CRIT-TRN-031 |
| PUB-013 | Recuperação de Senha | MVP 1A-Core | — | PUB-013 | J1 | CRIT-TRN-023 | PUB-011 | 2 | Feature | Baixo | CRIT-TRN-031 |

**Subtotal Autenticação:** 8 SP

#### 5.2.3 Área do Usuário Autenticado (4 PBIs)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| USR-001 | Meu Perfil & Segurança | MVP 1A-Core | — | USR-001 | J2 | CRIT-TRN-011 | PUB-011 | 3 | Feature | Baixo | CRIT-TRN-031 |
| USR-002 | Meus Vínculos Comunitários | MVP 1A-Core | AP-002 | USR-002 | J4 | CRIT-VSC-008 | PUB-012, INF-006 | 5 | Feature | Médio | CRIT-TRN-031 |
| USR-005 | Notificações Transacionais | MVP 1A-Core | — | USR-005 | J6, J8, J9 | CRIT-TRN-015 | PUB-011 | 3 | Feature | Baixo | CRIT-TRN-031 |
| USR-007 | Gestão de Privacidade & LGPD | MVP 1A-Core | — | USR-007 | J3 | CRIT-TRN-012, CRIT-TRN-013, CRIT-TRN-014 | INF-006 | 5 | Feature | Médio | CRIT-TRN-031 |

**Subtotal Usuário Autenticado:** 16 SP

#### 5.2.4 AP-002 Onboarding & Vínculo Comercial (3 PBIs)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADV-001 | Onboarding W1: Conta Responsável | MVP 1A-Core | AP-002 | ADV-001 | J2 | CRIT-VSC-003 | PUB-012 | 3 | Feature | Baixo | CRIT-TRN-031 |
| ADV-002 | Onboarding W2: Dados da Empresa | MVP 1A-Core | AP-002 | ADV-002 | J2, J10 | CRIT-VSC-003, CRIT-TRN-023 | ADV-001, INF-002 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADV-007b | Modal Autorização Empresarial (gate condicional) | MVP 1A-Core | AP-002 | ADV-007b | J2 | CRIT-VSC-004 | ADV-002 | 5 | Feature | Alto | CRIT-TRN-031 |

**Subtotal AP-002 (1A-Core):** 13 SP

#### 5.2.5 AP-003 Contratação & Pagamento (10 PBIs)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADV-003 | Onboarding W3: Seleção do Plano | MVP 1A-Core | AP-003 | ADV-003 | J2, J3 | CRIT-VSC-005 | INF-005, ADV-002 | 3 | Feature | Médio | CRIT-TRN-031 |
| ADV-004 | Onboarding W4: Resumo Comercial | MVP 1A-Core | AP-003 | ADV-004 | J2, J3 | CRIT-VSC-005 | ADV-003 | 2 | Feature | Baixo | CRIT-TRN-031 |
| ADV-005 | Onboarding W5: Assinar Contrato (hash SHA-256) | MVP 1A-Core | AP-003 | ADV-005 | J3 | CRIT-VSC-006, CRIT-TRN-012 | ADV-004 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADV-006 | Onboarding W6: Checkout Pagamento (Pix/Cartão) | MVP 1A-Core | AP-003 | ADV-006 | J2, J3 | CRIT-VSC-007, CRIT-TRN-026 | ADV-005, INF-003 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADV-007 | Onboarding W7: Upload Docs/Vínculo | MVP 1A-Core | AP-003 | ADV-007 | J2, J4 | CRIT-VSC-008, CRIT-TRN-024 | ADV-006 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADV-008 | Onboarding W8: Status da Análise | MVP 1A-Core | AP-003 | ADV-008 | J2, J4 | CRIT-VSC-008 | ADV-007 | 3 | Feature | Baixo | CRIT-TRN-031 |
| ADV-009 | Dashboard do Anunciante | MVP 1A-Core | AP-003 | ADV-009 | J2, J8, J9 | CRIT-VSC-012, CRIT-TRN-022 | ADV-008, INF-002 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADV-010 | Editar Perfil Comercial & Mídias | MVP 1A-Core | AP-003 | ADV-010 | J10 | CRIT-VSC-012, CRIT-TRN-024 | ADV-009 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADV-011 | Gestão de Assinatura & Faturas | MVP 1A-Core | AP-003 | ADV-011 | J6, J7, J8 | CRIT-VSC-005, CRIT-VSC-007 | ADV-009 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADV-012 | Meus Contratos & Aditivos | MVP 1A-Core | AP-003 | ADV-012 | J3, J10 | CRIT-VSC-006 | ADV-009 | 3 | Feature | Médio | CRIT-TRN-031 |

**Subtotal AP-003 (1A-Core):** 41 SP

#### 5.2.6 AP-004 Moderação & Publicação (15 PBIs)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-001 | Dashboard Administrativo Tenant | MVP 1A-Core | AP-004 | ADM-001 | J4 | CRIT-VSC-009, CRIT-TRN-022 | INF-004 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADM-002 | Fila de Moderação de Empresas | MVP 1A-Core | AP-004 | ADM-002 | J2, J4 | CRIT-VSC-009, CRIT-VSC-010, CRIT-VSC-011 | ADM-001 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADM-003 | Moderação de Vínculos Maçônicos | MVP 1A-Core | AP-004 | ADM-003 | J4 | CRIT-VSC-009, CRIT-VSC-010 | ADM-002 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADM-003-DET | Detalhe & Histórico do Vínculo | MVP 1A-Core | AP-004 | ADM-003-DET | J4 | CRIT-VSC-009, CRIT-VSC-010 | ADM-003 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADM-005 | Gestão de Usuários & Roles Tenant | MVP 1A-Core | AP-004 | ADM-005 | J2 | CRIT-TRN-005, CRIT-TRN-011 | INF-004 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADM-006 | Gestão de Lojas e Potências | MVP 1A-Core | AP-004 | ADM-006 | J4 | CRIT-TRN-010 | INF-004 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADM-007 | Gestão do Catálogo de Categorias | MVP 1A-Core | AP-004 | ADM-007 | J1 | CRIT-VSC-001 | INF-002 | 3 | Feature | Baixo | CRIT-TRN-031 |
| ADM-008 | Módulo Fin: Tabela de Planos | MVP 1A-Core | AP-004 | ADM-008 | J3 | CRIT-VSC-005 | INF-005 | 3 | Feature | Médio | CRIT-TRN-031 |
| ADM-009 | Módulo Fin: Assinaturas & Billing | MVP 1A-Core | AP-004 | ADM-009 | J6, J7, J8, J9 | CRIT-VSC-014, CRIT-VSC-015 | INF-005 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADM-010 | Módulo Fin: Gestão de Contratos | MVP 1A-Core | AP-004 | ADM-010 | J3, J10 | CRIT-VSC-013 | ADV-005 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADM-011 | Detalhe do Contrato & Auditoria | MVP 1A-Core | AP-004 | ADM-011 | J3 | CRIT-VSC-013, CRIT-TRN-015 | ADM-010 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADM-012 | Módulo Fin: Extrato & Reconciliação | MVP 1A-Core | AP-004 | ADM-012 | J9 | CRIT-VSC-014 | ADM-009, INF-003 | 5 | Feature | Alto | CRIT-TRN-031 |
| ADM-018 | Central Notificações Administrativas | MVP 1A-Core | AP-004 | ADM-018 | J4, J9 | CRIT-TRN-015 | ADM-001 | 2 | Feature | Baixo | CRIT-TRN-031 |
| ADM-020 | Trilha de Auditoria do Tenant | MVP 1A-Core | AP-004 | ADM-020 | J3, J4, J10 | CRIT-TRN-015 | INF-004 | 3 | Feature | Médio | CRIT-TRN-031 |
| ADM-021 | Configurações Gerais da Operação | MVP 1A-Core | AP-004 | ADM-021 | J2 | CRIT-TRN-007 | INF-004 | 3 | Feature | Baixo | CRIT-TRN-031 |

**Subtotal AP-004 (1A-Core):** 64 SP

#### 5.2.7 AP-005 Torre de Controle Base (2 PBIs)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CTL-001 | Dashboard Consolidado Master | MVP 1A-Core | AP-005 | CTL-001 | J11 | CRIT-TRN-008, CRIT-TRN-022 | INF-004 | 3 | Feature | Médio | CRIT-TRN-031 |
| CTL-002 | Gestão de Instâncias de Comunidade | MVP 1A-Core | AP-005 | CTL-002 | J11 | CRIT-TRN-008 | CTL-001 | 5 | Feature | Médio | CRIT-TRN-031 |

**Subtotal AP-005 (1A-Core):** 8 SP

#### 5.2.8 Componentes de Estado (1 PBI)

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUX-001 | Componentes de Estado Auxiliares (loading/empty/404/500/403/maintenance) | MVP 1A-Core | — | AUX-001 a AUX-006 | J1–J11 | CRIT-TRN-022, CRIT-TRN-016, CRIT-TRN-017, CRIT-TRN-018 | — | 3 | Enabler | Baixo | CRIT-TRN-031 |

**Subtotal Componentes de Estado:** 3 SP

**Total MVP 1A-Core:** 183 SP

---

### 5.3 MVP 1A-Control — 12 PBIs

> Automação da Torre de Controle Master (CTL-003 Wizard 10 passos + CTL-006 DLQ). CTL-004/005 migram para MVP 1B (Governança de Templates e Contratos).

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CTL-003 | Wizard Provisionamento (Main) | MVP 1A-Control | AP-005 | CTL-003 | J11 | CRIT-TRN-008 | CTL-002 | 3 | Feature | Alto | CRIT-TRN-031 |
| CTL-003-S01 | Wizard Step 1: Selecionar Template | MVP 1A-Control | AP-005 | CTL-003-S01 | J11 | CRIT-TRN-008 | CTL-003 | 2 | Feature | Médio | CRIT-TRN-031 |
| CTL-003-S02 | Wizard Step 2: Identificação Básica | MVP 1A-Control | AP-005 | CTL-003-S02 | J11 | CRIT-TRN-008 | CTL-003-S01 | 2 | Feature | Médio | CRIT-TRN-031 |
| CTL-003-S03 | Wizard Step 3: Slug & Subdomínio | MVP 1A-Control | AP-005 | CTL-003-S03 | J11 | CRIT-TRN-007 | CTL-003-S02 | 3 | Feature | Alto | CRIT-TRN-031 |
| CTL-003-S04 | Wizard Step 4: Branding & Theme | MVP 1A-Control | AP-005 | CTL-003-S04 | J11 | CRIT-TRN-021 | CTL-003-S03 | 3 | Feature | Médio | CRIT-TRN-031 |
| CTL-003-S05 | Wizard Step 5: Domínio DNS/HTTPS | MVP 1A-Control | AP-005 | CTL-003-S05 | J11 | CRIT-TRN-007 | CTL-003-S04 | 3 | Feature | Alto | CRIT-TRN-031 |
| CTL-003-S06 | Wizard Step 6: Habilitação Módulos | MVP 1A-Control | AP-005 | CTL-003-S06 | J11 | CRIT-TRN-008 | CTL-003-S05 | 2 | Feature | Médio | CRIT-TRN-031 |
| CTL-003-S07 | Wizard Step 7: Políticas & Gates | MVP 1A-Control | AP-005 | CTL-003-S07 | J11 | CRIT-TRN-010 | CTL-003-S06 | 3 | Feature | Alto | CRIT-TRN-031 |
| CTL-003-S08 | Wizard Step 8: Billing & Gateway MP | MVP 1A-Control | AP-005 | CTL-003-S08 | J11 | CRIT-VSC-005 | CTL-003-S07 | 3 | Feature | Alto | CRIT-TRN-031 |
| CTL-003-S09 | Wizard Step 9: Admin Inicial | MVP 1A-Control | AP-005 | CTL-003-S09 | J11 | CRIT-TRN-011 | CTL-003-S08 | 2 | Feature | Médio | CRIT-TRN-031 |
| CTL-003-S10 | Wizard Step 10: Readiness & Publish | MVP 1A-Control | AP-005 | CTL-003-S10 | J11 | CRIT-TRN-007, CRIT-TRN-008 | CTL-003-S09 | 3 | Feature | Alto | CRIT-TRN-031 |
| CTL-006 | Operações Eventos / DLQ Inspector | MVP 1A-Control | AP-005 | CTL-006 | J11 | CRIT-VSC-016, CRIT-TRN-027 | INF-003, INF-004 | 5 | Feature | Alto | CRIT-TRN-031 |

**Total MVP 1A-Control:** 34 SP

---

### 5.4 MVP 1B — 20 PBIs

> Expansão comercial (CRM, Cupons, Analytics, Contestações, Importação, Mapa Avançado, Organizações e Governança Global).

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PUB-005b | Mapa Avançado (Heatmap) | MVP 1B | AP-001 | PUB-005b | J1 | CRIT-VSC-001 | PUB-005 | 5 | Feature | Médio | CRIT-TRN-031 |
| PUB-007b | Modal de Contestação Pública | MVP 1B | AP-004 | PUB-007b | J4 | CRIT-VSC-011 | PUB-007, ADM-004 | 5 | Feature | Médio | CRIT-TRN-031 |
| PUB-008 | Página da Loja / Potência | MVP 1B | AP-001 | PUB-008 | J1 | CRIT-VSC-002 | PUB-007 | 5 | Feature | Médio | CRIT-TRN-031 |
| PUB-009 | Vitrine de Cupons & Benefícios | MVP 1B | AP-001 | PUB-009 | J1 | CRIT-VSC-001 | PUB-002 | 5 | Feature | Médio | CRIT-TRN-031 |
| USR-003 | Meus Favoritos | MVP 1B | — | USR-003 | J1 | CRIT-TRN-015 | USR-001 | 3 | Feature | Baixo | CRIT-TRN-031 |
| USR-004 | Meus Cupons Resgatados | MVP 1B | — | USR-004 | J1 | CRIT-TRN-015 | USR-001 | 3 | Feature | Baixo | CRIT-TRN-031 |
| USR-006 | Minhas Interações & Avaliações | MVP 1B | — | USR-006 | J1 | CRIT-TRN-015 | USR-001 | 3 | Feature | Baixo | CRIT-TRN-031 |
| ADV-009b | Modal Defesa de Contestação | MVP 1B | AP-004 | ADV-009b | J4 | CRIT-VSC-011 | ADV-009, ADM-004 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADV-013 | CRM de Leads & Mensagens | MVP 1B | AP-005 | ADV-013 | J6 | CRIT-TRN-030 | ADV-009 | 8 | Feature | Médio | CRIT-TRN-031 |
| ADV-014 | Gestão de Cupons da Empresa | MVP 1B | AP-005 | ADV-014 | J1 | CRIT-TRN-015 | ADV-009, PUB-009 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADV-015 | Analytics & Desempenho | MVP 1B | AP-005 | ADV-015 | J2 | CRIT-TRN-025 | ADV-009 | 8 | Feature | Médio | CRIT-TRN-031 |
| ADM-004 | Gestão de Contestações & Denúncias | MVP 1B | AP-004 | ADM-004 | J4 | CRIT-VSC-011 | ADM-003-DET | 8 | Feature | Alto | CRIT-TRN-031 |
| ADM-013 | Gestão de Cupons Globais Tenant | MVP 1B | AP-005 | ADM-013 | J1 | CRIT-TRN-015 | ADM-007 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADM-014 | Gestão de Eventos Institucionais | MVP 1B | AP-005 | ADM-014 | J1 | CRIT-TRN-015 | ADM-001 | 5 | Feature | Médio | CRIT-TRN-031 |
| ADM-015 | Gestão de Conteúdo & Banners | MVP 1B | AP-005 | ADM-015 | J1 | CRIT-TRN-021 | ADM-001 | 3 | Feature | Baixo | CRIT-TRN-031 |
| ADM-016 | CRM Interno de Anunciantes | MVP 1B | AP-005 | ADM-016 | J6 | CRIT-TRN-030 | ADM-001 | 8 | Feature | Médio | CRIT-TRN-031 |
| ADM-017 | Carga & Importação em Lote | MVP 1B | AP-005 | ADM-017 | J2 | CRIT-TRN-023, CRIT-TRN-024 | ADM-001 | 8 | Feature | Alto | CRIT-TRN-031 |
| ADM-019 | Analytics & Desempenho Tenant | MVP 1B | AP-005 | ADM-019 | J2 | CRIT-TRN-025 | ADM-001 | 5 | Feature | Médio | CRIT-TRN-031 |
| CTL-004 | Catálogo & Especificação de Templates | MVP 1B | AP-005 | CTL-004 | J11 | CRIT-TRN-007 | CTL-003 | 8 | Feature | Médio | CRIT-TRN-031 |
| CTL-005 | Governança Global de Contratos | MVP 1B | AP-005 | CTL-005 | J11 | CRIT-VSC-013 | CTL-001, ADM-011 | 5 | Feature | Alto | CRIT-TRN-031 |

**Total MVP 1B:** 114 SP

---

### 5.5 Transversais (Cross-cutting) — 4 PBIs

| PBI-ID | Título | Fase | AP | Interfaces (Doc 04) | Jornada (Doc 05) | Critério (Doc 07) | Deps | SP | Tipo | Risco | DoD-Ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| XS-001 | Pipeline CI/CD (lint, typecheck, test, build) + ambientes staging/prod | Transversal | — | — | J1–J11 | CRIT-TRN-030, CRIT-TRN-031 | — | 5 | Enabler | Alto | CRIT-TRN-031 |
| XS-002 | Webhook de contratação para CRM externo (GAP-DOC07-003) | Transversal | — | ADM-016 | J6 | CRIT-TRN-026 | INF-003 | 5 | Enabler | Médio | CRIT-TRN-031 |
| XS-003 | Job de expurgo de rascunhos inativos (GAP-DOC07-001) | Transversal | — | — | J2 | CRIT-TRN-014 | INF-001 | 3 | Enabler | Baixo | CRIT-TRN-031 |
| XS-004 | Envelope padronizado de Push Notification Mobile (GAP-DOC07-002) | Transversal | — | USR-005, ADM-018 | J5 | CRIT-TRN-026 | INF-003 | 3 | Enabler | Médio | CRIT-TRN-031 |

**Total Transversais:** 16 SP

---

## 6. Consolidado de Estimativas

| Fase | PBIs | SP |
|---|---|---|
| Fundação | 6 | 42 |
| MVP 1A-Core | 48 | 183 |
| MVP 1A-Control | 12 | 34 |
| MVP 1B | 20 | 114 |
| Transversais | 4 | 16 |
| **Total** | **90** | **389** |

---

## 7. Dependências Estruturais e Riscos

### 7.1 Cadeia Crítica de Dependências
1. `INF-001` (Schema) → `INF-002` (RLS) → `INF-004` (RBAC Runtime) → todos os PBIs de tela.
2. `INF-003` (Outbox/DLQ) → `ADV-006` (Checkout), `ADM-012` (Reconciliação), `CTL-006` (DLQ).
3. `INF-005` (Entitlements) → `ADV-003` (Seleção de Plano), `ADM-008` (Planos).
4. `INF-006` (LGPD) → `PUB-015`, `USR-007`, `ADV-005`.
5. Wizard CTL-003 (S01→S10) é estritamente sequencial; falha no Step 10 preserva rascunho para retomada idempotente (Doc 05, Jornada 11).

### 7.2 Riscos e Mitigações
- **RISK-003 (Cross-Tenant)**: todo PBI de tela depende de `INF-002`; testes negativos de RLS são DoD obrigatório.
- **RISK-004 (Replay DLQ)**: `CTL-006` exige sessão elevada + justificativa auditada (`CRIT-VSC-016`).
- **RISK-002 (Webhook duplicado)**: consumidores devem ser idempotentes via `(event_id, consumer_name)`.
- **Risco de Cronograma**: MVP 1B e Contestações (ADM-004) possuem acoplamento ao ciclo de moderação — recomenda-se manter na mesma onda de sprint para evitar retrabalho de contrato de dados.

---

## 8. Próximos Passos

1. **Aprovação do Doc 08 v1.0** (PO + Tech Lead).
2. Elaboração do **Doc 09 — Plano de Sprints** (capacidade, paralelismo Infra/App, grafo de dependências).
3. Abertura do **Sprint 0 (Foundation)** com `INF-001` a `INF-006`.
4. Homologação visual continuada no **Design Lab** (Design System v1.0) como Definition of Ready para PBIs de UI.
