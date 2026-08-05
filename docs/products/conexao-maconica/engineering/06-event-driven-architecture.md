# 06 — Arquitetura Orientada a Eventos (Event-Driven Architecture)

**Produto:** Conexão Maçônica  
**Plataforma:** CivicOS / Community Framework  
**Escopo:** Especificação completa da Arquitetura Orientada a Eventos (EDA), envelope padronizado v1.0, classificação de categorias, padrão Transactional Outbox, semântica At-Least-Once, idempotência por consumidor (`event_consumptions`), Dead Letter Queue (DLQ) com governança e segurança, RLS por tenant, integridade cross-tenant e barramento assíncrono.

---

## 1. Objetivo e Princípios de Arquitetura

O **Documento 06** formaliza a arquitetura assíncrona orientada a eventos da plataforma **CivicOS**. Esta especificação garante que a aplicação mantenha **baixo acoplamento, alta testabilidade, auditoria imutável e escalabilidade multi-tenant**.

### 1.1 Princípios de EDA no CivicOS

1. **Desacoplamento por Eventos de Domínio Namespaced em Tempo Passado**:
   - Invariantes necessárias à consistência imediata da transação de negócio permanecem **síncronas** dentro do mesmo Bounded Context.
   - Efeitos colaterais não críticos, notificações, integração intercontextual e atualizações de leitura/índices devem ser **estritamente assíncronos**, acionados por eventos em tempo passado (ex: `contracts.contract.signed.v1`, `billing.payment.approved.v1`).
2. **Semântica At-Least-Once & Consumidores Idempotentes por Tabela de Consumo**:
   - O barramento garante entrega *at-least-once*.
   - A chave de idempotência **não faz parte do envelope do evento**. A idempotência é controlada individualmente por consumidor através da restrição única `UNIQUE(event_id, consumer_name)` na tabela `event_consumptions`.
3. **Padrão Transactional Outbox com Concorrência Segura**:
   - A mutação do estado de negócio e o registro do evento na tabela `outbox_events` ocorrem rigorosamente dentro da **mesma transação ACID de banco de dados**.
   - O processamento da fila utiliza a cláusula `FOR UPDATE SKIP LOCKED` para concorrência segura entre múltiplos workers sem *lock contention*.
4. **Auditabilidade Total (EDA com Event Log Auditável)**:
   - Todo evento emitido via Outbox é mantido como log imutável de auditoria (`audit_logs` / `outbox_events`), usando `ON DELETE RESTRICT` para evitar exclusões acidentais.
5. **Clarificação da Camada Supabase**:
   - **Supabase Realtime**: Utilizado estritamente para atualizações reativas na interface do usuário (UI Subscriptions / WebSockets no navegador). **NÃO é utilizado como barramento transacional de mensagens de negócio**.
   - **Transactional Outbox + Worker Runtime**: Barramento oficial e confiável de processamento assíncrono de mensagens.
6. **Proibição de Payload Bruto e Minimização de Dados**:
   - Eventos transportam apenas IDs, referências e metadados mínimos indispensáveis.
   - **É estritamente proibido** incluir PDFs, imagens, CPF/CNPJ completo, payloads brutos de gateway, segredos ou pacotes probatórios no payload do evento.

---

## 2. Envelope Padronizado do Evento (Event Envelope Schema v1.0)

Todo evento emitido encapsula seus dados no seguinte envelope JSON padronizado:

```json
{
  "eventId": "evt_9b8f2c1a-4e3d-4c5b-8a1e-2f3a4b5c6d7e",
  "eventType": "contracts.contract.signed.v1",
  "eventVersion": "1.0",
  "schemaVersion": "1.0",
  "tenantId": "tnt_conexao_maconica_01",
  "aggregateType": "contract",
  "aggregateId": "ctr_1029384756",
  "aggregateVersion": 1,
  "occurredAt": "2026-08-04T23:45:00.000Z",
  "correlationId": "tx_req_8a7b6c5d4e3f",
  "causationId": "cmd_sign_contract_123",
  "traceId": "trace_5544332211",
  "producer": "civicos-contracts-service",
  "actor": {
    "userId": "usr_7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
    "role": "business_owner"
  },
  "payload": {
    "contractId": "ctr_1029384756",
    "businessId": "biz_5544332211",
    "planId": "plan_gold_annual"
  }
}
```

---

## 3. Classificação e Catálogo de Eventos

### 3.1 Definição das Categorias

- **Domain Event**: Fato de negócio relevante ocorrido dentro de um Bounded Context (ex: `directory.business.created.v1`, `contracts.contract.expired.v1`).
- **Integration Event**: Evento preparado para integração **intercontextual dentro do mesmo tenant** (ex: `billing.subscription.activated.v1`). Integrações cross-tenant só ocorrem sob regras explícitas da plataforma CivicOS.
- **Technical Event**: Evento técnico de infraestrutura ou falha de sistema (ex: `integration.payment_provider.webhook_received.v1`, `worker.outbox.poll_failed.v1`).

### 3.2 Ownership de Eventos e Princípio do Produtor Correto

Nenhum contexto pode emitir um evento que pertença ao domínio de outro contexto:
- O **Billing Context** detecta o atraso de pagamento e emite `billing.subscription.past_due.v1`.
- O **Directory Context** consome esse evento, aplica as regras de publicação da comunidade e emite `directory.business.publication_suspended.v1`.

### 3.3 Catálogo Oficial de Eventos Namespaced

| Nome do Evento (Namespaced) | Categoria | Produtor (Context Owner) | Descrição do Fato de Negócio |
|---|---|---|---|
| `auth.user.registered.v1` | Domain Event | Supabase Auth | Usuário concluiu o registro de conta |
| `directory.business.created.v1` | Domain Event | Directory Context | Anunciante cadastrou o rascunho de empresa |
| `directory.business.updated.v1` | Domain Event | Directory Context | Dados cadastrais ou mídias atualizados |
| `directory.business.published.v1` | Domain Event | Directory Context | Empresa aprovada em todos os gates e visível |
| `directory.business.publication_suspended.v1` | Domain Event | Directory Context | Exibição suspensa por sanção ou billing |
| `directory.business.reactivated.v1` | Domain Event | Directory Context | Anúncio reativado após aprovação de gates |
| `billing.plan.selected.v1` | Domain Event | Billing Context | Plano comercial e vigência selecionados |
| `billing.payment.approved.v1` | Domain Event | Billing Context | Pagamento da fatura confirmado pelo provedor |
| `billing.payment.failed.v1` | Domain Event | Billing Context | Processamento de pagamento falhou |
| `billing.subscription.past_due.v1` | Integration Event | Billing Context | Assinatura entrou em carência / inadimplência |
| `billing.subscription.activated.v1` | Integration Event | Billing Context | Assinatura ativada e cotas disponibilizadas |
| `billing.subscription.upgraded.v1` | Domain Event | Billing Context | Upgrade de plano processado via BillingPolicy |
| `billing.subscription.cancelled.v1` | Domain Event | Billing Context | Cancelamento da renovação registrado |
| `contracts.contract.generated.v1` | Domain Event | Contracts Context | Minuta em PDF emitida com código opaco |
| `contracts.contract.signed.v1` | Domain Event | Contracts Context | Aceite eletrônico concluído com hash SHA-256 |
| `contracts.contract.expired.v1` | Domain Event | Contracts Context | Expirado prazo de 48h para assinatura da minuta |
| `verification.credential.requested.v1` | Domain Event | Verification Context | Solicitada validação de vínculo comunitário |
| `verification.credential.approved.v1` | Domain Event | Verification Context | Credencial e selo fraterno aprovados |
| `verification.credential.rejected.v1` | Domain Event | Verification Context | Vínculo rejeitado pela moderação |
| `verification.masonic_link.contested.v1` | Domain Event | Verification Context | Contestação de vínculo aberta por terceiro |
| `integration.payment_provider.webhook_received.v1` | Technical Event | Gateway Adapter | Webhook bruto recebido do gateway de pagamento |
| `platform.tenant.provisioned.v1` | Integration Event | Torre de Controle | Tenant provisionado na infraestrutura |
| `platform.plugin.installed.v1` | Technical Event | Torre de Controle | Plugin ativado no ambiente do tenant |
| `worker.outbox.poll_failed.v1` | Technical Event | Outbox Worker | Falha no ciclo de leitura do outbox |

---

## 4. Padrão Transactional Outbox, Multi-Consumidores e Resiliência

### 4.1 Separação do Ciclo em Tabela de Outbox, Entregas, Tentativas e Consumo

Para evitar conflitos em múltiplos consumidores e manter auditabilidade histórica de retentativas, o modelo utiliza 4 tabelas relacionais com integridade via `RESTRICT`:

```sql
-- 1. Tabela Principal de Outbox (Imutável)
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  event_version TEXT NOT NULL DEFAULT '1.0',
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INT NOT NULL DEFAULT 1,
  producer TEXT NOT NULL,
  correlation_id TEXT,
  causation_id TEXT,
  trace_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, dispatched, failed
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_processing ON outbox_events(status, available_at) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_outbox_tenant ON outbox_events(tenant_id, event_type);

-- 2. Tabela de Entregas (Estado Atual por Consumidor)
CREATE TABLE event_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, failed
  attempt_count INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_event_delivery_consumer UNIQUE (event_id, consumer_name)
);

-- 3. Histórico Imutável de Cada Tentativa de Entrega
CREATE TABLE event_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES event_deliveries(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL REFERENCES outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  attempt_number INT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INT,
  status TEXT NOT NULL, -- success, failed
  error_stack TEXT
);

-- 4. Tabela de Execuções Concluídas com Sucesso (Idempotência)
CREATE TABLE event_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INT,
  result_status TEXT NOT NULL DEFAULT 'success', -- success, skipped_idempotent
  CONSTRAINT unq_event_consumer UNIQUE (event_id, consumer_name)
);
```

> **Regra de Execução**: `event_consumptions` armazena **apenas execuções concluídas com sucesso (`success`) ou ignoradas por idempotência (`skipped_idempotent`)**. Tentativas com falha são registradas exclusivamente em `event_delivery_attempts` e `failed_event_queue` para não bloquear retentativas futuras.

### 4.2 Leitura com Concorrência Segura (`FOR UPDATE SKIP LOCKED`)

```sql
WITH target_events AS (
  SELECT id FROM outbox_events
  WHERE status IN ('pending', 'failed')
    AND available_at <= NOW()
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  ORDER BY created_at ASC
  LIMIT 50
  FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events
SET status = 'processing',
    locked_at = NOW(),
    locked_by = 'worker_node_01'
WHERE id IN (SELECT id FROM target_events)
RETURNING *;
```

---

## 5. Dead Letter Queue (DLQ) & Governança de Segurança

### 5.1 Governança e Retentativas por Consumidor

1. **Exponential Backoff**: Intervalos de 1min, 5min, 15min, 1h, 6h.
2. **Tabela DLQ (`failed_event_queue`)**: Chave única por `(event_id, consumer_name)`. Permite que o evento falhe no consumidor A sem afetar a entrega concluída no consumidor B.

```sql
CREATE TABLE failed_event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES outbox_events(event_id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  payload_redacted JSONB NOT NULL,
  first_failed_at TIMESTAMPTZ NOT NULL,
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_stack TEXT,
  retry_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requires_operator_action', -- requires_operator_action, replaying, discarded, resolved
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT unq_dlq_event_consumer UNIQUE (event_id, consumer_name)
);
```

### 5.2 Segurança, Redaction e Permissões Granulares

1. **Redaction Automático**: PII, tokens e hashes são removidos antes de persistir em `failed_event_queue`.
2. **Controle de Replay**: Exige a permissão `event:dlq:replay` e valida que `tenant_id` corresponde ao contexto ativo.
3. **Permissões Granulares**:
   - `event:dlq:inspect`: Leitura dos eventos retidos.
   - `event:dlq:replay`: Re-execução para o consumidor afetado.
   - `event:dlq:discard`: Descarte auditado com justificativa.

### 5.3 Políticas de RLS e Níveis de Acesso para a Camada Outbox

```sql
-- RLS Ativo em Todas as Tabelas de Mensageria
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_event_queue ENABLE ROW LEVEL SECURITY;

-- Política para Worker Service Role (Acesso Total para Processamento)
CREATE POLICY p_service_role_outbox ON outbox_events FOR ALL TO service_role USING (true);
CREATE POLICY p_service_role_deliveries ON event_deliveries FOR ALL TO service_role USING (true);
CREATE POLICY p_service_role_attempts ON event_delivery_attempts FOR ALL TO service_role USING (true);
CREATE POLICY p_service_role_consumptions ON event_consumptions FOR ALL TO service_role USING (true);
CREATE POLICY p_service_role_dlq ON failed_event_queue FOR ALL TO service_role USING (true);

-- Política para Tenant Admin (Visualização Sanitizada do Próprio Tenant)
CREATE POLICY p_tenant_admin_dlq_select ON failed_event_queue 
  FOR SELECT TO authenticated 
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND auth.jwt() ->> 'role' IN ('tenant_admin', 'global_admin'));
```

---

## 6. Matriz de Produtores e Consumidores

| Evento | Contexto Produtor | Consumidor | Efeito / Ação | Pré-condição | Criticidade | Policy / Retry | Evento Derivado |
|---|---|---|---|---|---|---|---|
| `contracts.contract.signed.v1` | Contracts | Onboarding / Gate Policy | Atualiza `contract_gate = satisfied`. Avalia se todos os gates foram cumpridos para solicitar ativação comercial. | Minuta assinada | Alta (P1) | 5 retries / Backoff | `billing.plan.selected.v1` |
| `billing.payment.approved.v1` | Billing | Onboarding / Publication Policy | Atualiza `payment_gate = satisfied`. Se todos os gates (contract, payment, verification, moderation) estiverem satisfeitos e sem holds: publica no guia. | Pagamento confirmado | Alta (P1) | 5 retries / Backoff | `directory.business.published.v1` |
| `billing.subscription.past_due.v1` | Billing | Directory Context | Registra pendência financeira e aciona regra de suspensão no guia público. | Fatura vencida pós-grace | Média (P2) | 3 retries | `directory.business.publication_suspended.v1` |
| `verification.credential.approved.v1` | Verification | Directory Context | Atualiza `verification_gate = satisfied` e concede o selo de vínculo fraterno no perfil. | Parecer aprovação | Média (P2) | 3 retries | N/A |
| `verification.masonic_link.contested.v1` | Verification | Notification | Envia alerta ao anunciante e abre prazo de defesa em 5 dias úteis. | Denúncia admitida | Média (P2) | 3 retries | N/A |
| `platform.tenant.provisioned.v1` | Torre Controle | Audit, Notification & Telemetry | Registra log auditável, notifica Platform Master, inicializa read models e dispara e-mail ao admin. | Tenant provisionado | Alta (P1) | 5 retries / DLQ | N/A |

---

## 7. Prioridade e Sprint Sugerida

- **Prioridade**: P1 — Crítica.
- **Sprint Sugerida**: Sprint 1.0.9 (Especificação Completa da Arquitetura Orientada a Eventos).
