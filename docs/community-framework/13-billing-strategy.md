# 13 — Billing Strategy

**Módulo:** Community Framework
**Escopo:** Estratégia de cobrança configurável, Renewal Strategies (Aniversário vs Data Fixa), Onboarding Gates, estados independentes e separação entre política comercial e provedor de pagamento

---

## 1. Contexto da Decisão

A definição do modelo de cobrança para o ecossistema CivicOS ainda não possui escolha definitiva entre as duas modalidades suportadas. A sociedade avaliará ambos os modelos antes de determinar a política inicial do primeiro produto vertical (Conexão Maçônica).

Este documento apresenta as duas opções de forma **neutra e equivalente**, sem declarar vencedora. A arquitetura do Billing Engine suporta ambos os modelos simultaneamente, selecionáveis por configuração da `Community Instance`, sem exigir alteração de código ou estrutura de banco de dados.

---

## 2. Separação de Responsabilidades no Billing Engine

A arquitetura do Billing Engine é estruturada em três camadas independentes:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                             BILLING ENGINE                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                          BILLING POLICY                          │  │
│  │  (Regras Comerciais, Prazos, Limites e Configuração por Tenant)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         RENEWAL STRATEGY                         │  │
│  │   ┌───────────────────────────┐    ┌──────────────────────────┐  │  │
│  │   │ AnniversaryRenewalStrategy│ OR │ FixedDateRenewalStrategy │  │  │
│  │   └───────────────────────────┘    └──────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         PAYMENT PROVIDER                         │  │
│  │                     (Mercado Pago Adapter)                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Billing Policy (Regras Comerciais)

Define **como** o cliente é cobrado, agregando estratégias de renovação, cobrança inicial, upgrades, downgrades, créditos e grace period.

```ts
interface BillingPolicy {
  renewalStrategy:
    | AnniversaryRenewalStrategy
    | FixedDateRenewalStrategy;

  initialChargeStrategy:
    | FullAmountStrategy
    | ProratedUntilFixedDateStrategy;

  upgradeStrategy:
    | RestartCycleFullChargeStrategy
    | ProratedDifferenceStrategy
    | NextRenewalStrategy;

  downgradeStrategy:
    | NextRenewalStrategy
    | ImmediateDowngradeStrategy;

  creditStrategy:
    | NoCreditStrategy
    | ManualCreditStrategy
    | AutomaticCreditStrategy;

  gracePeriodStrategy: {
    gracePeriodDays: number; // default: 7
    allowAccessDuringGrace: boolean; // default: true
  };
}
```

### 2.2 Renewal Strategies (Modelos de Renovação)

- **`AnniversaryRenewalStrategy`**: Ciclo individual de 12 meses contado a partir da data de adesão de cada anunciante.
- **`FixedDateRenewalStrategy`**: Data coletiva comum de renovação (ex: 31/12), com cobrança inicial proporcional (pró-rata).

### 2.3 Payment Provider Configuration (Adapter de Infraestrutura)

Define **quem** processa o pagamento e em qual ambiente, desvinculado das regras comerciais.

```ts
interface PaymentProviderConfiguration {
  provider: 'MERCADO_PAGO';
  environment: 'SANDBOX' | 'PRODUCTION';
  // Credenciais (Public Key / Access Token) armazenadas exclusivamente no tenant,
  // nunca no template ou no código-fonte.
}
```

---

## 3. Estados Independentes da Operação

Para evitar o erro conceitual de igualar pagamento aprovado com assinatura ativa ou publicação pública, o sistema gerencia 6 estados estritamente separados:

| Dimensão de Estado | Valores Possíveis | Significado |
|---|---|---|
| **`payment_status`** | `pending`, `approved`, `rejected`, `refunded`, `cancelled` | Situação financeira do pagamento no gateway |
| **`contract_status`** | `draft`, `generated`, `awaiting_signature`, `partially_signed`, `signed`, `voided`, `superseded` | Situação do instrumento contratual |
| **`signature_status`** | `pending`, `sent`, `viewed`, `partially_signed`, `completed`, `expired`, `declined` | Trilha probatória da assinatura eletrônica |
| **`verification_status`** | `unverified`, `pending_documentation`, `under_review`, `approved`, `rejected` | Validação de documentos e vínculo comunitário |
| **`subscription_status`** | `pending_contract`, `pending_payment`, `pending_documents`, `under_review`, `active`, `past_due`, `suspended`, `cancelled`, `expired` | Estado operacional e comercial da assinatura |
| **`publication_status`** | `unpublished`, `published`, `suspended`, `archived` | Visibilidade pública do perfil no guia comercial |

> 💡 **Diferenciação Estrita de Ativação Comercial vs. Publicação**:
> A transição para **`subscription_status = active`** indica que o plano está contratado e pago de forma válida. **Ela NÃO força automaticamente `publication_status = published`**. Uma empresa pode possuir assinatura comercial ativa enquanto seu cadastro estiver aguardando moderação final ou envio de documentos complementares (`publication_status = unpublished`).

---

## 4. Contract and Signature Gate (Diferenciação Adesão Inicial vs. Renovação)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ONBOARDING GATE POLICY                          │
│                                                                        │
│  [1. Cadastro] ──> [2. Resumo] ──> [3. Contrato Gerado] ──>            │
│  [4. Assinatura Eletrônica] ──> [5. Pagamento Confirmado] ────────────┐│
│                                                                       ││
│  ┌─────────────────────────────────────────────────────────────────┐  ││
│  │           AVALIAÇÃO CONSOLIDADA DOS GATES OBRIGATÓRIOS          │  ││
│  │  (Contrato OK + Pagamento OK + Documentos OK + Moderação OK)    │  ││
│  └─────────────────────────────────────────────────────────────────┘  ││
│                                  │                                     │
│                                  ▼                                     │
│                      subscription_status = active                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Adesão Inicial (Primeiro Cadastro)
A confirmação de pagamento pelo Mercado Pago (`payment_status = approved`) cumpre a **condição financeira**, mas **NÃO altera a assinatura diretamente para `active`**.
- Se o contrato ainda não foi assinado, o status da assinatura permanece `pending_contract`.
- Se faltarem comprovantes institucionais, o status permanece `pending_documents`.
- Se exigir análise cadastral, o status permanece `under_review`.
- A assinatura transita para `active` quando os gates financeiros e contratuais forem satisfeitos. A publicação no guia depende da política de moderação.

### 4.2 Renovação de Anunciante Já Aprovado
Na renovação de um anunciante ativo que já possui contrato-base vigente e documentação validada:
- A aprovação do pagamento (`payment_status = approved`) transita imediatamente o `subscription_status` para `active`.
- O ciclo contratual é prorrogado e nova invoice é emitida de forma automática.

### 4.3 Upgrades, Downgrades e Reativações
- **Upgrade**: Exige aceite do termo aditivo comercial. O ajuste de valor é processado pela estratégia de upgrade.
- **Reativação após Inadimplência**: A liquidação do débito dentro do Grace Period reativa a assinatura para `active` imediatamente.

---

## 5. Modelo A — Renewal Strategy por Aniversário

### 5.1 Conceito
Cada assinatura possui seu próprio ciclo anual independente. A data de renovação é calculada como `started_at + 12 meses`.

### 5.2 Fluxo Operacional
- **Adesão Inicial**: Cobrança do valor anual integral. `payment_status = approved`. Transição para `active` condicionada aos Onboarding Gates.
- **Vigência**: 12 meses a contar da data de ativação operacional.
- **Renovação**: Automática no aniversário. `payment_status = approved` → `subscription_status = active` (renovação direta).
- **Inadimplência**: Se o pagamento falhar na renovação, `subscription_status = past_due` com Grace Period (ex: 7 dias) antes da alteração para `suspended`.

---

## 6. Modelo B — Renewal Strategy por Data Fixa com Pró-Rata Inicial

### 6.1 Conceito
Todas as assinaturas de uma `Community Instance` compartilham a mesma data de renovação anual (ex: 31/12). A primeira cobrança é proporcional aos meses restantes até essa data.

### 6.2 Fluxo Operacional
- **Exemplo**: Data comum em 31/12. Anunciante adere em 01/09 (4 meses restantes).
- **Adesão Inicial**: Cobrança proporcional (`4/12` do valor anual = R$ 165,67 para plano de R$ 497,00). `payment_status = approved`. Transição para `active` após validação de todos os gates.
- **Vigência Inicial**: De 01/09 a 31/12.
- **Renovação Coletiva**: Em 31/12, cobrança do valor anual integral (R$ 497,00). Para anunciantes ativos aprovados, o pagamento aprovado renova diretamente para `active`.
- **Adesão Próxima à Data Anual (< 30 dias)**: Cobrança de 1/12 como adesão mínima ou cobrança composta (mês corrente + ano seguinte integral).

---

## 7. Matriz Comparativa Neutra das Renewal Strategies

| Critério | Modelo A (Aniversário) | Modelo B (Data Fixa) |
|---|---|---|
| **Simplicidade técnica** | Maior — sem cálculo de fração | Menor — exige cálculo pró-rata |
| **Previsibilidade individual** | Alta — data fixa individual | Alta — data fixa coletiva |
| **Previsibilidade de caixa** | Distribuída ao longo do ano | Concentrada na data coletiva |
| **Operação de renovação** | Contínua (carga constante) | Concentrada (pico na data coletiva) |
| **Complexidade na adesão** | Baixa — valor fixo | Média — exige demonstrativo pró-rata |
| **Explicação ao anunciante** | Direta ("pague X por 1 ano") | Requer demonstração de cálculo |
| **Campanha anual** | Menos natural | Mais natural (alinhada a eventos/calendários) |
| **Risco de pico de suporte** | Baixo — problemas distribuídos | Alto — chamados simultâneos |
| **Reprocessamento de cartões** | Carga constante no gateway | Pico de lote no gateway |
| **Controle financeiro** | Ciclos individuais | Ciclo unificado |

---

## 8. Versionamento de Preço, Idempotência e Auditoria

- **PlanVersion & Price Snapshot**: O valor do plano é gravado de forma imutável no momento da contratação. Reajustes futuros na tabela de preços não alteram assinaturas vigentes ou contratos já assinados.
- **Idempotência no Webhook**: O processamento das notificações do Mercado Pago utiliza a chave única `payment_id`. Eventos duplicados não geram reativações ou créditos em dobro.
- **Trilha de Auditoria Imutável**: Toda alteração nos 6 estados da operação gera um registro auditável no banco de dados.

---

## 9. Prioridade e Sprint Sugerida

- **Prioridade**: P1 — Crítica.
- **Sprint Sugerida**: Sprint 1.0.6 (Documentação Estratégica de Billing).
