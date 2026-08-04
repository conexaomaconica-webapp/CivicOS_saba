# 02 — Modelo de Negócio, Planos e Renovação por Aniversário

**Módulo:** Product Review  
**Escopo:** Estrutura financeira, faturamento anual por aniversário e versão de precificação  

---

## 1. Diretriz de Faturamento: Renovação por Aniversário

O modelo de monetização do Conexão Maçônica adota estritamente a **renovação por aniversário da assinatura** (`renewal_at = started_at + 1 year`). 

### 1.1 Vantagens Estratégicas
- **Simplicidade Operacional**: Elimina a necessidade de cálculos complexos de pro-rata parcial durante o ciclo vigente.
- **Previsibilidade Financeira**: Garante receita recorrente distribuída ao longo de todo o ano letivo/fiscal do tenant.
- **Alinhamento com Gateways**: Integração nativa com plataformas de pagamento (Asaas, Mercado Pago, Stripe) via eventos de webhook desacoplados.

### 1.2 Tratamento de Campanhas Institucionais
Campanhas promocionais atreladas a datas festivas ou marcos institucionais concedem descontos no valor do primeiro ciclo anual sem alterar a data individual de aniversário da assinatura do anunciante.

---

## 2. Entidade de Assinatura e Versionamento de Preço (`PlanVersion`)

Para impedir que reajustes anuais de tabela alterem retroativamente contratos em vigor, a precificação utiliza o conceito de **Versão de Preço (`price_version_id`)** e **Snapshot do Contrato (`price_snapshot`)**.

### 2.1 Schema da Assinatura (`subscriptions`)

```sql
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  price_version_id UUID NOT NULL REFERENCES public.plan_versions(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  renewal_at TIMESTAMPTZ NOT NULL,
  renewal_type TEXT NOT NULL DEFAULT 'annual_anniversary' CHECK (renewal_type IN ('annual_anniversary', 'custom_term')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'grace_period', 'canceled', 'expired')),
  payment_provider TEXT NOT NULL DEFAULT 'asaas',
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  billing_currency TEXT NOT NULL DEFAULT 'BRL',
  price_snapshot NUMERIC(10,2) NOT NULL, -- Snapshot do valor anual contratado no momento da assinatura
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  grace_period_until TIMESTAMPTZ, -- Período de tolerância para inadimplência temporária (ex: 7 dias)
  cancel_requested_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 Versionamento de Tabela (`plan_versions`)
Quando o valor de um plano (ex: Plano Ouro) é reajustado de R$ 690/ano para R$ 790/ano:
1. O registro original da versão (`plan_versions` v1 = R$ 690) é mantido inalterado.
2. É criada a versão v2 (`plan_versions` v2 = R$ 790) para novos assinantes.
3. Assinaturas existentes preservam `price_version_id = v1` e `price_snapshot = 690.00` até a renovação formal do ciclo.
