# 12 — Community Template Specification

**Módulo:** Community Framework
**Escopo:** Contrato neutro e versionado de especificação de templates para produtos verticais

---

## 1. Contexto e Desacoplamento

Um **Community Template** é um pacote declarativo, neutro e versionado que define as regras de negócio, terminologia, módulos, políticas, badges, onboarding gates e integrações contratuais de uma determinada vertical comunitária.

Para garantir a reutilização do **Community Framework** em múltiplas verticais (Maçonaria, Rotary, Lions, CREA, OAB), este documento formaliza a **especificação genérica do contrato de template**. As especificações de templates concretos (ex: `conexao-maconica.template.yaml` ou `rotary-connect.template.yaml`) são implementações deste esquema neutro.

---

## 2. Regras Fundamentais do Contrato e Validação de Invariantes

1. **Template não é Tenant**: O template é a matriz declarativa; o tenant é a instância operacional que consome o template.
2. **Sem Segredos ou Credenciais**: Templates **nunca** contêm tokens de gateway, chaves de API, credenciais de assinatura eletrônica, contratos assinados ou dados pessoais de usuários/anunciantes.
3. **Versionamento Semântico**: Todo template possui número de versão (`version: "1.0.0"`) e declara compatibilidade mínima com o framework (`frameworkVersion: ">=1.0.0"`).
4. **Isolamento de Alterações em Tenants Ativos**: Atualizações publicadas no template **não** alteram automaticamente a configuração efetiva dos tenants já existentes. O upgrade deve ser um processo administrativo explícito.
5. **Governança de Overrides (`overridable`)**: O template declara campo a campo o que o operador do tenant pode personalizar (`overridable: true`) e o que é regra de domínio imutável (`overridable: false`).
6. **Template Policy Validation (Validador de Invariantes)**: O framework valida que a configuração do template não contém combinações ilógicas antes de permitir a sua publicação:
   - **`payment_before_contract`**: Permitido apenas se houver política explícita de reembolso/estorno automático.
   - **`publication_before_verification`**: Estritamente **PROIBIDO** em templates que exigem verificação comunitária/documental.
   - **`activation_before_payment`**: Permitido **somente** para planos de valor R$ 0,00 (gratuitos) ou períodos de cortesia/trial devidamente configurados.

---

## 3. Esquema Genérico da Especificação (YAML Schema)

```yaml
template:
  # ─── 1. Identificação do Template ────────────────────────────────
  id: string              # ex: conexao-maconica, rotary-connect
  name: string            # ex: Conexão Maçônica, Rotary Connect
  description: string     # Resumo público do produto vertical
  version: string         # SemVer ex: 1.0.0
  frameworkVersion: string # Compatibilidade com Community Framework ex: >=1.0.0
  maintainer: string      # Autor/Mantenedor do template

  # ─── 2. Terminologia Abstrata ────────────────────────────────────
  terminology:
    member:
      singular: string
      plural: string
      overridable: boolean
    organizationUnit:     # ex: Loja, Clube, Conselho Regional
      singular: string
      plural: string
      overridable: boolean
    organizationGroup:    # ex: Potência, Distrito, Conselho Federal
      singular: string
      plural: string
      overridable: boolean
    business:
      singular: string
      plural: string
      overridable: boolean
    partner:
      singular: string
      plural: string
      overridable: boolean
    credential:
      singular: string
      plural: string
      overridable: boolean
    benefit:
      singular: string
      plural: string
      overridable: boolean

  # ─── 3. Módulos Habilitados e Obrigatórios ───────────────────────
  modules:
    directory: { enabled: boolean, required: boolean }
    marketplace: { enabled: boolean, required: boolean }
    organizations: { enabled: boolean, required: boolean }
    credentials: { enabled: boolean, required: boolean }
    coupons: { enabled: boolean, required: boolean }
    events: { enabled: boolean, required: boolean }
    content: { enabled: boolean, required: boolean }
    advertiserLeads: { enabled: boolean, required: boolean }
    advertiserCrm: { enabled: boolean, required: boolean }
    ratings: { enabled: boolean, required: boolean }
    map: { enabled: boolean, required: boolean }
    notifications: { enabled: boolean, required: boolean }
    billing: { enabled: boolean, required: boolean }

  # ─── 4. Onboarding Gates (Flexibilidade de Fluxo & Invariantes) ──
  onboardingGates:
    requiredBeforeContract: [string]   # ex: [businessRegistration]
    requiredBeforePayment: [string]    # ex: [contractSigned]
    requiredBeforeActivation: [string] # ex: [paymentApproved, documentsVerified]
    requiredBeforePublication: [string]# ex: [moderatorApproval]

  # ─── 5. Hierarquia Organizacional ───────────────────────────────
  organizationTypes:
    - id: string
      label: string
      isRoot: boolean
      parentType: string # opcional

  # ─── 6. Vínculos e Regras de Verificação ─────────────────────────
  communityLinkTypes:
    - id: string
      label: string
      verificationRequired: boolean

  verificationLevels:
    - id: string
      label: string
      trustWeight: number

  # ─── 7. Contratos e Assinatura Eletrônica ──────────────────────
  contracts:
    advertiserSubscription:
      required: boolean
      templateCode: string   # ex: advertiser_annual_subscription
      signatureLevel: string # ELECTRONIC_SIMPLE | ELECTRONIC_ADVANCED | ELECTRONIC_QUALIFIED
      signingMode: string    # SINGLE_PARTY | BILATERAL | MULTI_PARTY
      signingOrder: string   # SEQUENTIAL | PARALLEL
      allowedOverrides:
        - string

  # ─── 8. Políticas Padrão de Billing ──────────────────────────────
  billingDefaults:
    configurable: boolean
    supportedModels:
      - ANNIVERSARY
      - FIXED_DATE
    defaultModel: string
    defaultGracePeriodDays: number
    defaultPlans:
      - id: string
        label: string
        position: number

  # ─── 9. Badges e SEO ──────────────────────────────────────────────
  badges:
    dimensions:
      - id: string
        label: string
        examples: [string]

  seoDefaults:
    titleTemplate: string
    descriptionTemplate: string
    enableLlmsTxt: boolean
    enableSitemap: boolean
    enableJsonLd: boolean
```

---

## 4. Exemplos Concretos de Implementação

### 4.1 Exemplo Concreto A — `conexao-maconica.template.yaml`

```yaml
template:
  id: conexao-maconica
  name: Conexão Maçônica
  version: 1.0.0
  frameworkVersion: ">=1.0.0"
  maintainer: CivicOS Team

  terminology:
    member: { singular: Irmão, plural: Irmãos, overridable: false }
    organizationUnit: { singular: Loja, plural: Lojas, overridable: false }
    organizationGroup: { singular: Potência, plural: Potências, overridable: false }
    business: { singular: Empresa, plural: Empresas, overridable: true }
    partner: { singular: Parceiro Fraterno, plural: Parceiros Fraternos, overridable: true }
    credential: { singular: Regularidade Maçônica, plural: Regularidades, overridable: false }

  modules:
    directory: { enabled: true, required: true }
    marketplace: { enabled: true, required: true }
    organizations: { enabled: true, required: true }
    credentials: { enabled: true, required: true }
    billing: { enabled: true, required: true }

  onboardingGates:
    requiredBeforeContract: [businessRegistration]
    requiredBeforePayment: [contractSigned]
    requiredBeforeActivation: [paymentApproved, documentsVerified]
    requiredBeforePublication: [moderatorApproval]

  contracts:
    advertiserSubscription:
      required: true
      templateCode: masonic_advertiser_annual_subscription
      signatureLevel: ELECTRONIC_ADVANCED
      signingMode: SINGLE_PARTY
      signingOrder: SEQUENTIAL
      allowedOverrides:
        - contractingParty
        - jurisdiction

  billingDefaults:
    configurable: true
    supportedModels: [ANNIVERSARY, FIXED_DATE]
    defaultModel: ANNIVERSARY
    defaultGracePeriodDays: 7
```

### 4.2 Exemplo Concreto B — `rotary-connect.template.yaml`

```yaml
template:
  id: rotary-connect
  name: Rotary Connect
  version: 1.0.0
  frameworkVersion: ">=1.0.0"
  maintainer: CivicOS Team

  terminology:
    member: { singular: Rotariano, plural: Rotarianos, overridable: false }
    organizationUnit: { singular: Clube, plural: Clubes, overridable: false }
    organizationGroup: { singular: Distrito, plural: Distritos, overridable: false }
    business: { singular: Empresa, plural: Empresas, overridable: true }
    partner: { singular: Parceiro Rotariano, plural: Parceiros Rotarianos, overridable: true }
    credential: { singular: Classificação Rotariana, plural: Classificações, overridable: false }

  modules:
    directory: { enabled: true, required: true }
    marketplace: { enabled: true, required: true }
    organizations: { enabled: true, required: true }
    credentials: { enabled: true, required: true }
    billing: { enabled: true, required: true }

  onboardingGates:
    requiredBeforeContract: [preliminaryVerification]
    requiredBeforePayment: [contractSigned]
    requiredBeforeActivation: [paymentApproved]
    requiredBeforePublication: [districtApproval]

  contracts:
    advertiserSubscription:
      required: true
      templateCode: rotary_advertiser_annual_subscription
      signatureLevel: ELECTRONIC_ADVANCED
      signingMode: BILATERAL
      signingOrder: SEQUENTIAL
      allowedOverrides:
        - contractingParty

  billingDefaults:
    configurable: true
    supportedModels: [ANNIVERSARY, FIXED_DATE]
    defaultModel: FIXED_DATE
    defaultGracePeriodDays: 14
```

---

## 5. Processo de Upgrade e Versionamento

1. **Alteração do Template**: O mantenedor altera o template e incrementa a versão (ex: `1.0.0` → `1.1.0`).
2. **Notificação ao Tenant**: O painel administrativo da `Community Instance` exibe um aviso de versão disponível.
3. **Simulação em Homologação**: O operador pode aplicar o upgrade na instância em ambiente de homologação.
4. **Aplicação com Snapshot**: O upgrade gera um log de transição e atualiza os defaults, preservando todas as personalizações (`overrides`) já gravadas pelo tenant.

---

## 6. Prioridade e Sprint Sugerida

- **Prioridade**: P1 — Crítica.
- **Sprint Sugerida**: Sprint 1.0.6 (Formalização do Contrato de Template).
