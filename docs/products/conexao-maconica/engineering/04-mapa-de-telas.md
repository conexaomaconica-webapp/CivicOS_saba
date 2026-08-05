# 04 — Mapa de Telas

**Produto:** Conexão Maçônica
**Plataforma:** CivicOS / Community Framework
**Escopo:** Mapeamento funcional completo das telas Web/PWA, taxonomia de 6 categorias, matriz RBAC auditada, fluxos de navegação e faseamento entre MVP 1A-Core, MVP 1A-Mobile, MVP 1A-Control, MVP 1B e Futuro

---

## 1. Objetivo e Escopo

Este documento define a arquitetura funcional de telas e fluxos de navegação do **Conexão Maçônica**, estruturado sobre a Fundação CivicOS e o **Community Framework**.

O Mapa de Telas atua como contrato de interface para o futuro desenvolvimento do **Documento 05 (Fluxos e Jornadas do Usuário)** e posterior prototipagem. Ele especifica o comportamento de cada tela sem fixar escolhas visuais arbitrárias ou código de UI, estabelecendo uma clara separação entre:

- **Camada Community Framework**: Interfaces genéricas e reutilizáveis por qualquer produto vertical (Diretório, Marketplace, Onboarding Comercial, Billing Engine, Módulo de Contratos e Assinaturas, Torre de Controle, etc.).
- **Extensão de Domínio Conexão Maçônica**: Funcionalidades específicas do produto vertical maçônico (Lojas, Potências, Vínculo Fraterno, Comprovação de Regularidade, Autorização Empresarial Independente, Concorrência Ética, Contestações, etc.).

---

## 2. Taxonomia Oficial de Interfaces (6 Categorias Exclusivas)

Para garantir rigor matemático e clareza de implementação, o mapa estabelece seis categorias mutuamente exclusivas de elementos de interface:

1. **Rota Principal (`Main Route / Page`)**: Rota física própria no Next.js App Router com URL navegável única (ex: `/dashboard`, `/empresa/[slug]`).
2. **Subrota (`Sub-route`)**: Rota filha aninhada em uma página pai com URL própria (ex: `/admin/vinculos/[id]`).
3. **Aba Interna (`Internal Tab`)**: Alternância de conteúdo dentro da mesma tela gerenciada por parâmetro de query sem alterar a rota base (ex: `/admin/financeiro?tab=planos`).
4. **Etapa de Wizard (`Wizard Step`)**: Passo assistido e sequencial dentro de um fluxo multinavegação com salvamento de rascunho (ex: Passos 1 a 10 no `CTL-003-S01..S10` ou Passos 1 a 8 no Onboarding `ADV-001` a `ADV-008`).
5. **Overlay (`Modal / Drawer`)**: Camada sobreposta temporária para interações pontuais (ex: Modal de Contestação, Modal de Resposta, Drawer de Filtros Mobile).
6. **Componente de Estado (`State Component`)**: Variação condicional de renderização da mesma rota baseada no ciclo de vida dos dados (`loading`, `empty`, `draft`, `incomplete`, `pending`, `under_review`, `approved`, `rejected`, `correction_requested`, `expired`, `suspended`, `error`, `success`, `read_only`, `permission_denied`). **Estados NÃO entram como rotas navegáveis!**

---

## 3. Matriz RBAC & Auditoria de Permissões

Todas as permissões indicadas no mapa de telas foram auditadas e classificadas em 3 categorias de conformidade em relação ao **Documento 03 (Matriz RBAC)**:

- `EXISTENTE_NO_DOC_03`: Permissão registrada e ativa exatamente com o mesmo código no Documento 03.
- `ALIAS_DE_INTERFACE`: Nome funcional de interface que mapeia diretamente para uma permissão do Doc 03.
- `LACUNA_RBAC` / `PROPOSTA_PARA_DOC_03`: Permissões granulares específicas identificadas nesta auditoria para inclusão formal na próxima revisão do Documento 03.

### Tabela de Mapeamento e Lacunas RBAC Identificadas

| Permissão Utilizada no Mapa | Status de Conformidade | Mapeamento / Justificativa de Lacuna |
|---|:---:|---|
| `public` / `auth:user` | `EXISTENTE_NO_DOC_03` | Permissão pública / titular autenticado |
| `business:create` / `update` / `view_private` / `moderate` | `EXISTENTE_NO_DOC_03` | Operações cadastrais e moderação da empresa |
| `plans:manage` / `subscription:create` / `subscription:manage` | `EXISTENTE_NO_DOC_03` | Gestão de planos e contratação comercial |
| `payment:create` / `refund` / `reconcile` | `EXISTENTE_NO_DOC_03` | Operações financeiras (`payment:*`) |
| `legal_docs:manage` / `accept` | `EXISTENTE_NO_DOC_03` | Aceite de termos e documentos jurídicos |
| `credential:verify` / `revoke` / `request` | `EXISTENTE_NO_DOC_03` | Gestão de credenciais comunitárias |
| `credential:evidence:upload` | `EXISTENTE_NO_DOC_03` | Upload de documentos comprobatórios |
| `organization:people:manage` | `EXISTENTE_NO_DOC_03` | Gestão da hierarquia de Lojas/Potências |
| `privacy:export_own` / `revoke_consent` | `EXISTENTE_NO_DOC_03` | Direitos do titular LGPD |
| `rbac:user_roles:assign` | `EXISTENTE_NO_DOC_03` | Atribuição de papéis no tenant |
| `categories:manage` / `coupons:manage` / `events:manage` | `EXISTENTE_NO_DOC_03` | Gestão de catálogos e módulos |
| `highlight:create` / `crm:prospect:create` | `EXISTENTE_NO_DOC_03` | Destaques e CRM de vendas |
| `import:job:create` / `lead:view_received` | `EXISTENTE_NO_DOC_03` | Importações e recepção de leads |
| `audit:logs:view` / `analytics:tenant:view` / `analytics:business:view` | `EXISTENTE_NO_DOC_03` | Leitura de auditoria e métricas |
| `platform:superadmin` / `tenant:manage` / `template:manage` | `EXISTENTE_NO_DOC_03` | Ações globais da Torre de Controle |
| `contract:view_own` / `contract:sign` | `EXISTENTE_NO_DOC_03` | Visualização e assinatura de contrato próprio |
| `contract:manage` / `contract:void` / `contract:audit` | `EXISTENTE_NO_DOC_03` | Gestão administrativa, anulação e auditoria |
| `contract:global_admin` | `EXISTENTE_NO_DOC_03` | Governança global de contratos na Torre Master |
| `tenant:provision` / `tenant:publish` / `tenant:suspend` | `EXISTENTE_NO_DOC_03` | Ações do ciclo de vida do tenant |
| `event:dlq:inspect` / `event:dlq:replay` / `event:dlq:discard` | `EXISTENTE_NO_DOC_03` | Ações operacionais da DLQ e mensageria |
| `masonic_link:contest:review` / `masonic_link:contest:respond` | `EXISTENTE_NO_DOC_03` | Ciclo de vida estrito de contestações fraternas |

---

## 4. Regras do Domínio Maçônico e Instrumentos Independentes

Para evitar simplificações inadequadas no mapeamento do produto vertical Conexão Maçônica, o sistema estabelece as seguintes separações funcionais:

1. **Autorização Empresarial como Instrumento Independente & Gate Condicional**: A autorização dada pelo representante legal, executivo, colaborador ou procurador para vincular e publicar a empresa no guia **NÃO é apenas uma seção do contrato comercial**. Trata-se de um registro próprio (`business_authorization`), coletado via modal/formulário em `ADV-007b`, com hash, termo e escopo de autorização revogável pelo representante da empresa. Quando o vínculo declarado em `ADV-002` for de representante (não-proprietário/sócio), a autorização (`ADV-007b`) atua como **gate obrigatório antes da seleção do plano (`ADV-003`), contrato (`ADV-005`) e pagamento (`ADV-006`)**.

   *Fluxo condicional de onboarding:*
   - **Proprietário / Sócio**: `ADV-002 → ADV-003`
   - **Representante / Procurador**: `ADV-002 → ADV-007b → ADV-003`

   O `ADV-007b` continua disponível posteriormente no onboarding e no dashboard para renovação, substituição ou revogação da autorização.

2. **Histórico do Vínculo Comunitário**: O registro completo de aprovações, pareceres, evidências e contestações de um vínculo fraterno fica armazenado na subrota dedicada `ADM-003-DET` (`/admin/vinculos/[id]`), e **NÃO na tela de Gestão de Usuários e Roles (`ADM-005`)**.
3. **Declaração de Vínculo Empresarial x Cadastro Pessoal**: O cadastro público de conta de usuário (`PUB-012`) coleta apenas a declaração de afiliação pessoal do membro. A vinculação de uma empresa como "Empresa de Irmão" ou "Representada por Irmão" ocorre estritamente na área autenticada do anunciante (`ADV-002` e `ADV-007`).
4. **Ciclo de Vida de Contestações**: As 14 funções maçônicas estão distribuídas entre o formulário de denúncia pública (Modal em `PUB-007b`), a tela de resposta/defesa da empresa (Modal em `ADV-009b`), a Fila de Moderação de Contestações (`ADM-004`) e o detalhe do vínculo (`ADM-003-DET`).

---

## 5. Faseamento Realista (MVP 1A-Core vs MVP 1A-Control vs MVP 1B vs Futuro)

A estratégia de lançamento foi estruturada em ondas incrementais, garantindo a entrega do Conexão Maçônica com excelente experiência móvel e mapa de descoberta sem comprometer o time-to-market:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ESTRATÉGIA DE FASEAMENTO                        │
│                                                                        │
│  1. MVP 1A-Core (Lançamento Operacional Inicial Web/PWA)  : 51 Elementos│
│     (29 Main Routes + 2 Sub-routes + 4 Tabs + 8 Steps + 2 Overlays + 6 Aux)│
│                                                                        │
│  2. MVP 1A-Control (Automação da Torre de Controle Master): 14 Elementos│
│     (03 Main Routes + 1 Tab (CTL-006) + 10 Wizard Steps)              │
│                                                                        │
│  3. MVP 1B (Expansão Comercial, CRM, Cupons & Analytics)  : 20 Elementos│
│     (18 Main Routes + 2 Overlays)                                      │
│                                                                        │
│  TOTAL DE ELEMENTOS MATRICIALMENTE MAPEADOS               : 85 ELEMENTOS│
└────────────────────────────────────────────────────────────────────────┘

ONDAS ESTRATÉGICAS SEM ELEMENTOS PRÓPRIOS NA MATRIZ:
  • MVP 1A-Mobile: Container Mobile Capacitor (Android/iOS) aplicado às interfaces do MVP 1A-Core com Push Transacional, Câmera/Upload e Geolocalização.
  • Fase Futura: Aplicativo Nativo em React Native de código separado e Marketplace de Plugins.
```

---

## 6. Matriz Consolidada de Interfaces (85 Registros Individuais)

Abaixo apresentamos a matriz única onde cada uma das 85 interfaces possui um ID exclusivo, rota neutra e classificação estrita.

### 6.1 Área Pública (PUB-xxx — 17 Registros)

| ID | Nome da Interface | Tipo | Rota / URL | Camada | Fase | Permissão RBAC | Origem | Destino |
|---|---|---|---|---|---|---|---|---|
| **PUB-001** | Splash & Carregamento | Main Route | `/` | Framework | MVP 1A-Core | `public` | Acesso inicial | PUB-002 |
| **PUB-002** | Home do Guia Comercial | Main Route | `/home` | Framework | MVP 1A-Core | `public` | PUB-001 | PUB-003, PUB-007 |
| **PUB-003** | Busca Global (Lista) | Main Route | `/busca` | Framework | MVP 1A-Core | `public` | PUB-002 | PUB-004, PUB-007 |
| **PUB-004** | Drawer de Filtros Avançados | Overlay | `/busca` (Drawer) | Framework | MVP 1A-Core | `public` | PUB-003 | PUB-003 |
| **PUB-005** | Mapa Interativo Essencial | Main Route | `/mapa` | Framework | MVP 1A-Core | `public` | PUB-003 | PUB-007 |
| **PUB-005b**| Mapa Avançado (Heatmap) | Main Route | `/mapa/avancado` | Framework | MVP 1B | `public` | PUB-005 | PUB-007 |
| **PUB-006** | Diretório de Categorias | Main Route | `/categorias` | Framework | MVP 1A-Core | `public` | PUB-002 | PUB-003 |
| **PUB-007** | Perfil Público da Empresa | Main Route | `/empresa/[slug]` | Framework* | MVP 1A-Core | `public` | PUB-003 | USR-001, ADV-001 |
| **PUB-007b**| Modal de Contestação Pública| Overlay | `/empresa/[slug]` (Modal)| Conexão Maçônica| MVP 1B | `auth:user` | PUB-007 | ADM-004 |
| **PUB-008** | Página da Loja / Potência | Main Route | `/organizacao/[slug]`| Conexão Maçônica| MVP 1B | `public` | PUB-007 | PUB-007 |
| **PUB-009** | Vitrine de Cupons & Benefícios| Main Route | `/cupons` | Framework | MVP 1B | `public` | PUB-002 | USR-004 |
| **PUB-010** | Tabela Comercial de Planos | Main Route | `/planos` | Framework | MVP 1A-Core | `public` | PUB-002 | ADV-001 |
| **PUB-011** | Login / Autenticação | Main Route | `/login` | Framework | MVP 1A-Core | `public` | Header | USR-001, ADV-009 |
| **PUB-012** | Cadastro de Usuário (Pessoal) | Main Route | `/cadastro` | Framework | MVP 1A-Core | `public` | PUB-011 | USR-001 |
| **PUB-013** | Recuperação de Senha | Main Route | `/recuperar-senha`| Framework | MVP 1A-Core | `public` | PUB-011 | PUB-011 |
| **PUB-014** | Validação Pública de Contrato| Main Route | `/verificar-contrato/[code]`| Framework| MVP 1A-Core | `public` | QR Code PDF | N/A |
| **PUB-015** | Termos de Uso e Privacidade | Main Route | `/termos` | Framework | MVP 1A-Core | `public` | Footer | N/A |

### 6.2 Área do Usuário Autenticado (USR-xxx — 7 Registros)

| ID | Nome da Interface | Tipo | Rota / URL | Camada | Fase | Permissão RBAC | Origem | Destino |
|---|---|---|---|---|---|---|---|---|
| **USR-001** | Meu Perfil & Segurança | Main Route | `/usuario/perfil` | Framework | MVP 1A-Core | `auth:user` | Login | USR-002 |
| **USR-002** | Meus Vínculos Comunitários | Internal Tab | `/usuario/perfil?tab=vinculos`| Conexão Maçônica| MVP 1A-Core | `credential:request` | USR-001 | ADM-003 |
| **USR-003** | Meus Favoritos | Main Route | `/usuario/favoritos`| Framework | MVP 1B | `auth:user` | USR-001 | PUB-007 |
| **USR-004** | Meus Cupons Resgatados | Main Route | `/usuario/cupons` | Framework | MVP 1B | `auth:user` | USR-001 | PUB-007 |
| **USR-005** | Notificações Transacionais | Main Route | `/usuario/notificacoes`| Framework | MVP 1A-Core | `auth:user` | Header | PUB-007 |
| **USR-006** | Minhas Interações & Avaliações| Main Route | `/usuario/interacoes`| Framework | MVP 1B | `auth:user` | USR-001 | PUB-007 |
| **USR-007** | Gestão de Privacidade & LGPD | Main Route | `/usuario/privacidade`| Framework | MVP 1A-Core | `privacy:export_own` | USR-001 | N/A |

### 6.3 Onboarding e Painel do Anunciante (ADV-xxx — 17 Registros)

| ID | Nome da Interface | Tipo | Rota / URL | Camada | Fase | Permissão RBAC | Origem | Destino |
|---|---|---|---|---|---|---|---|---|
| **ADV-001** | Onboarding W1: Conta Responsável| Wizard Step | `/anunciar/passo-1` | Framework | MVP 1A-Core | `public` | PUB-010 | ADV-002 |
| **ADV-002** | Onboarding W2: Dados da Empresa | Wizard Step | `/anunciar/passo-2` | Framework | MVP 1A-Core | `business:create` | ADV-001 | ADV-003 / ADV-007b |
| **ADV-003** | Onboarding W3: Seleção do Plano | Wizard Step | `/anunciar/passo-3` | Framework | MVP 1A-Core | `subscription:create`| ADV-002 / ADV-007b | ADV-004 |
| **ADV-004** | Onboarding W4: Resumo Comercial | Wizard Step | `/anunciar/passo-4` | Framework | MVP 1A-Core | `subscription:create`| ADV-003 | ADV-005 |
| **ADV-005** | Onboarding W5: Assinar Contrato | Wizard Step | `/anunciar/passo-5` | Framework | MVP 1A-Core | `contract:sign` | ADV-004 | ADV-006 |
| **ADV-006** | Onboarding W6: Checkout Pagamento| Wizard Step | `/anunciar/passo-6` | Framework | MVP 1A-Core | `payment:create` | ADV-005 | ADV-007 |
| **ADV-007** | Onboarding W7: Upload Docs/Vínculo| Wizard Step | `/anunciar/passo-7` | Framework* | MVP 1A-Core | `credential:evidence:upload`| ADV-006 | ADV-008 |
| **ADV-007b**| Modal Autorização Empresarial | Overlay | `/anunciar/passo-7` (Modal)| Framework | MVP 1A-Core | `business:update` | ADV-002 / ADV-007 | ADV-003 / ADV-007 |
| **ADV-008** | Onboarding W8: Status da Análise | Wizard Step | `/anunciar/status` | Framework | MVP 1A-Core | `business:view_private`| ADV-007 | ADV-009 |
| **ADV-009** | Dashboard do Anunciante | Main Route | `/anunciante` | Framework | MVP 1A-Core | `business:update` | Login | ADV-010 a 015 |
| **ADV-009b**| Modal Defesa de Contestação | Overlay | `/anunciante` (Modal) | Conexão Maçônica| MVP 1B | `masonic_link:contest:respond`| ADV-009 | ADM-004 |
| **ADV-010** | Editar Perfil Comercial & Mídias| Main Route | `/anunciante/perfil`| Framework | MVP 1A-Core | `business:update` | ADV-009 | ADV-009 |
| **ADV-011** | Gestão de Assinatura & Faturas | Main Route | `/anunciante/plano` | Framework | MVP 1A-Core | `subscription:create`| ADV-009 | ADV-003 |
| **ADV-012** | Meus Contratos & Aditivos | Main Route | `/anunciante/contratos`| Framework | MVP 1A-Core | `contract:view_own` | ADV-009 | ADV-005 |
| **ADV-013** | CRM de Leads & Mensagens | Main Route | `/anunciante/leads` | Framework | MVP 1B | `lead:view_received` | ADV-009 | N/A |
| **ADV-014** | Gestão de Cupons da Empresa | Main Route | `/anunciante/cupons`| Framework | MVP 1B | `coupons:manage` | ADV-009 | ADV-009 |
| **ADV-015** | Analytics & Desempenho | Main Route | `/anunciante/metricas`| Framework | MVP 1B | `analytics:business:view`| ADV-009 | N/A |

### 6.4 Administração da Operação / Tenant Admin (ADM-xxx — 22 Registros)

| ID | Nome da Interface | Tipo | Rota / URL | Camada | Fase | Permissão RBAC | Origem | Destino |
|---|---|---|---|---|---|---|---|---|
| **ADM-001** | Dashboard Administrativo Tenant | Main Route | `/admin` | Framework | MVP 1A-Core | `analytics:tenant:view`| Login Admin | ADM-002 a 021 |
| **ADM-002** | Fila de Moderação de Empresas | Main Route | `/admin/empresas` | Framework | MVP 1A-Core | `business:moderate` | ADM-001 | ADM-003 |
| **ADM-003** | Moderação de Vínculos Maçônicos | Main Route | `/admin/vinculos` | Conexão Maçônica| MVP 1A-Core | `credential:verify` | ADM-001 | ADM-003-DET |
| **ADM-003-DET**| Detalhe & Histórico do Vínculo | Sub-route | `/admin/vinculos/[id]`| Conexão Maçônica| MVP 1A-Core | `credential:verify` | ADM-003 | ADM-003 |
| **ADM-004** | Gestão de Contestações & Denúncias| Main Route | `/admin/contestacoes`| Conexão Maçônica| MVP 1B | `masonic_link:contest:review`| ADM-001 | ADM-003-DET |
| **ADM-005** | Gestão de Usuários & Roles Tenant | Main Route | `/admin/usuarios` | Framework | MVP 1A-Core | `rbac:user_roles:assign`| ADM-001 | ADM-005 |
| **ADM-006** | Gestão de Lojas e Potências | Main Route | `/admin/organizacoes`| Conexão Maçônica| MVP 1A-Core | `organization:people:manage`| ADM-001 | ADM-006 |
| **ADM-007** | Gestão do Catálogo de Categorias | Main Route | `/admin/categorias` | Framework | MVP 1A-Core | `categories:manage` | ADM-001 | ADM-007 |
| **ADM-008** | Módulo Fin: Tabela de Planos | Internal Tab | `/admin/financeiro?tab=planos`| Framework| MVP 1A-Core | `plans:manage` | ADM-001 | ADM-009 |
| **ADM-009** | Módulo Fin: Assinaturas & Billing| Main Route | `/admin/financeiro` | Framework | MVP 1A-Core | `subscription:manage`| ADM-001 | ADM-010 |
| **ADM-010** | Módulo Fin: Gestão de Contratos | Internal Tab | `/admin/financeiro?tab=contratos`| Framework| MVP 1A-Core | `contract:manage` | ADM-009 | ADM-011 |
| **ADM-011** | Detalhe do Contrato & Auditoria | Sub-route | `/admin/financeiro/contratos/[id]`| Framework| MVP 1A-Core | `contract:audit` | ADM-010 | ADM-010 |
| **ADM-012** | Módulo Fin: Extrato & Reconciliação| Internal Tab | `/admin/financeiro?tab=extrato`| Framework| MVP 1A-Core | `payment:reconcile` | ADM-009 | ADM-012 |
| **ADM-013** | Gestão de Cupons Globais Tenant | Main Route | `/admin/cupons` | Framework | MVP 1B | `coupons:manage` | ADM-001 | ADM-013 |
| **ADM-014** | Gestão de Eventos Institucionais | Main Route | `/admin/eventos` | Framework | MVP 1B | `events:manage` | ADM-001 | ADM-014 |
| **ADM-015** | Gestão de Conteúdo & Banners | Main Route | `/admin/conteudo` | Framework | MVP 1B | `highlight:create` | ADM-001 | ADM-015 |
| **ADM-016** | CRM Interno de Anunciantes | Main Route | `/admin/crm` | Framework | MVP 1B | `crm:prospect:create` | ADM-001 | ADM-016 |
| **ADM-017** | Carga & Importação em Lote | Main Route | `/admin/importacao` | Framework | MVP 1B | `import:job:create` | ADM-001 | ADM-017 |
| **ADM-018** | Central Notificações Administrativas| Main Route | `/admin/notificacoes`| Framework | MVP 1A-Core | `admin:read` | ADM-001 | ADM-018 |
| **ADM-019** | Analytics & Desempenho Tenant | Main Route | `/admin/analytics` | Framework | MVP 1B | `analytics:tenant:view`| ADM-001 | ADM-019 |
| **ADM-020** | Trilha de Auditoria do Tenant | Main Route | `/admin/auditoria` | Framework | MVP 1A-Core | `audit:logs:view` | ADM-001 | ADM-020 |
| **ADM-021** | Configurações Gerais da Operação | Main Route | `/admin/configuracoes`| Framework | MVP 1A-Core | `tenant:settings:update`| ADM-001 | ADM-021 |

### 6.5 Torre de Controle / Platform Master (CTL-xxx — 15 Registros)

| ID | Nome da Interface | Tipo | Rota / URL | Camada | Fase | Permissão RBAC | Origem | Destino |
|---|---|---|---|---|---|---|---|---|
| **CTL-001** | Dashboard Consolidado Master | Main Route | `/master` | Framework | MVP 1A-Control| `platform:superadmin`| Login Master | CTL-002 a 005 |
| **CTL-002** | Gestão de Instâncias de Comunidade| Main Route | `/master/tenants` | Framework | MVP 1A-Control| `tenant:manage` | CTL-001 | CTL-003 |
| **CTL-003** | Wizard Provisionamento (Main) | Main Route | `/master/tenants/novo`| Framework | MVP 1A-Control| `tenant:provision` | CTL-002 | CTL-002 |
| **CTL-003-S01**| Wizard Step 1: Selecionar Template| Wizard Step | `/master/tenants/novo#step-1`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003 | CTL-003-S02 |
| **CTL-003-S02**| Wizard Step 2: Identificação Básica| Wizard Step | `/master/tenants/novo#step-2`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S01 | CTL-003-S03 |
| **CTL-003-S03**| Wizard Step 3: Slug & Subdomínio | Wizard Step | `/master/tenants/novo#step-3`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S02 | CTL-003-S04 |
| **CTL-003-S04**| Wizard Step 4: Branding & Theme | Wizard Step | `/master/tenants/novo#step-4`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S03 | CTL-003-S05 |
| **CTL-003-S05**| Wizard Step 5: Domínio DNS/HTTPS | Wizard Step | `/master/tenants/novo#step-5`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S04 | CTL-003-S06 |
| **CTL-003-S06**| Wizard Step 6: Habilitação Módulos | Wizard Step | `/master/tenants/novo#step-6`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S05 | CTL-003-S07 |
| **CTL-003-S07**| Wizard Step 7: Políticas & Gates | Wizard Step | `/master/tenants/novo#step-7`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S06 | CTL-003-S08 |
| **CTL-003-S08**| Wizard Step 8: Billing & Gateway MP | Wizard Step | `/master/tenants/novo#step-8`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S07 | CTL-003-S09 |
| **CTL-003-S09**| Wizard Step 9: Admin Inicial | Wizard Step | `/master/tenants/novo#step-9`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S08 | CTL-003-S10 |
| **CTL-003-S10**| Wizard Step 10: Readiness & Publish | Wizard Step | `/master/tenants/novo#step-10`| Framework | MVP 1A-Control| `tenant:provision` | CTL-003-S09 | CTL-002 |
| **CTL-004** | Catálogo & Espec. Templates | Main Route | `/master/templates` | Framework | MVP 1B | `template:manage` | CTL-001 | CTL-004 |
| **CTL-005** | Governança Global Contratos | Main Route | `/master/contratos` | Framework | MVP 1B | `contract:global_admin`| CTL-001 | CTL-005 |
| **CTL-006** | Operações Eventos / DLQ | Internal Tab | `/master?tab=events-dlq`| Framework | MVP 1A-Control| `event:dlq:inspect` / `event:dlq:replay` / `event:dlq:discard` | CTL-001 | CTL-001 |

#### Detalhamento Funcional da Aba CTL-006 (Operações Mensageria & DLQ Inspector)
1. **Inspeção de Eventos (`event:dlq:inspect`)**:
   - Exibe a lista sanitizada de entregas falhadas a partir da view `vw_operational_dlq_sanitized`.
   - Oferece filtros operacionais por `tenant_id`, `consumer_name`, `status` (`requires_operator_action`, `replaying`, `discarded`, `resolved`) e janela de datas.
   - Apresenta o histórico de tentativas (`event_delivery_attempts`), contagem de retentativas, `correlation_id` e pilha de erro tratada (`error_stack`).
2. **Re-execução de Evento / Replay (`event:dlq:replay`)**:
   - Exige **sessão elevada ativa** (`support:elevated_session:use`) com token de elevação aprovado por segundo operador.
   - Exige justificativa técnica obrigatória gravada em `resolution_notes`.
   - Validação rigorosa de escopo do tenant e controle idempotente por `(event_id, consumer_name)`.
3. **Descarte Auditado (`event:dlq:discard`)**:
   - **NÃO EXCLUI** o evento nem o registro da DLQ do banco de dados.
   - Atualiza o status da entrega para `discarded`, registrando obrigatoriamente a justificativa técnica em `resolution_notes`, o `resolved_by` e `resolved_at`.
   - Gera evento de auditoria imutável em `audit_logs`.

### 6.6 Telas Auxiliares & Componentes de Estado (AUX-xxx — 6 Registros)

| ID | Nome da Interface | Tipo | Rota / URL | Camada | Fase | Permissão RBAC | Origem | Destino |
|---|---|---|---|---|---|---|---|---|
| **AUX-001** | Estado Carregamento / Skeleton | State Component| N/A | Framework | MVP 1A-Core | `public` | N/A | N/A |
| **AUX-002** | Estado Vazio (Empty State) | State Component| N/A | Framework | MVP 1A-Core | `public` | N/A | N/A |
| **AUX-003** | Erro 404 (Não Encontrado) | State Component| N/A | Framework | MVP 1A-Core | `public` | N/A | N/A |
| **AUX-004** | Erro 500 (Falha do Servidor) | State Component| N/A | Framework | MVP 1A-Core | `public` | N/A | N/A |
| **AUX-005** | Erro 403 (Permissão Negada) | State Component| N/A | Framework | MVP 1A-Core | `public` | N/A | N/A |
| **AUX-006** | Modo Manutenção Instância | State Component| N/A | Framework | MVP 1A-Core | `public` | N/A | N/A |

---

## 7. Recálculo Oficial e Totais por Categoria de Interface

A contagem oficial final foi recalculada diretamente dos 85 registros da Matriz Consolidada (Seção 6), apresentando total coerência matemática por categoria e por fase:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   TOTALIZADORES DA MATRIZ OFICIAL                      │
│                                                                        │
│  1. Main Routes (Pages)                         : 50 Interfaces        │
│  2. Sub-routes (Sub-pages)                      : 02 Interfaces        │
│  3. Internal Tabs (Tabs)                        : 05 Interfaces        │
│  4. Wizard Steps (Steps)                        : 18 Passos            │
│  5. Overlays (Modais / Drawers)                 : 04 Overlays          │
│  6. State Components (Aux)                      : 06 Componentes       │
│                                                                        │
│  TOTAL DE ELEMENTOS INDEPENDENTES DE INTERFACE  : 85 ELEMENTOS        │
└────────────────────────────────────────────────────────────────────────┘

DISTRIBUIÇÃO POR FASE DE LANÇAMENTO:
  • MVP 1A-Core    : 51 Elementos (29 Main Routes + 2 Sub-routes + 4 Tabs + 8 Wizard + 2 Overlays + 6 Aux)
  • MVP 1A-Control : 14 Elementos (03 Main Routes + 1 Tab (CTL-006) + 10 Wizard Steps em CTL-003-S01..S10)
  • MVP 1B         : 20 Elementos (18 Main Routes + 2 Overlays)

  TOTAL DE ELEMENTOS MATRICIALMENTE MAPEADOS       : 85 ELEMENTOS
```

---

## 8. Dependências para o Documento 05 (Fluxos e Jornadas do Usuário)

A conclusão deste Mapa de Telas estabelece os pré-requisitos diretos para a redação do **Documento 05 (Fluxos e Jornadas do Usuário)**:

1. **Mapeamento de Jornadas Fim-a-Fim**:
   - Jornada de Descoberta e Filtro no Mapa Essencial (`PUB-003` → `PUB-005` → `PUB-007`).
   - Jornada do Anunciante (`ADV-001` a `ADV-008` via `OnboardingGatePolicy`).
   - Jornada Contratual (`ADV-004` → `ADV-005` → `PUB-014`).
   - Jornada do Container Mobile (`Release 1A-Mobile`).
2. **Diagramas de Sequência e Estado**:
   - Transições entre estados de contrato, pagamento, credencial e publicação.

---

## 9. Prioridade e Sprint Sugerida

- **Prioridade**: P1 — Crítica.
- **Sprint Sugerida**: Sprint 1.0.7 (Mapeamento Completo de Telas e Navegação).
