# 20. EXECUTION PLATFORM SPECIFICATION

## 1. Princípio Fundamental

O CivicOS adota uma arquitetura orientada a eventos para sua plataforma de execução assíncrona. 
**Toda mutação relevante de estado gera um Domain Event.**
O Motor de Execução (Execution Platform) garante que as automações, integrações e agendamentos reajam a esses eventos de forma resiliente, assíncrona e desacoplada, sem que o Kernel ou a Plataforma possuam qualquer conhecimento da regra de negócio (ex: o Kernel não conhece `Company` ou `Coupon`).

## 2. As Três Camadas de Eventos

A plataforma distingue rigorosamente três tipos de barramentos de eventos:

1. **Infrastructure Events (`EventBus`)**: Eventos de ciclo de vida do Kernel (ex: `kernel.boot.started`, `registry.frozen`). Fechados e de uso exclusivo da Plataforma.
2. **Plugin Events (`PluginEventBus`)**: Comunicação síncrona/volátil em memória (Camada 2) entre plugins para coordenação em tempo real, sem garantia de persistência.
3. **Domain Events (`DomainEventStore`)**: Eventos de domínio imutáveis que representam fatos ocorridos (ex: `CompanyCreated`). Possuem garantia de entrega e são a única fonte para processamento assíncrono.

## 3. Event Envelope

Nenhum evento trafega "cru". Tudo segue um Envelope padronizado para permitir auditoria, tracing, replay e deduplicação desde o primeiro dia.

```typescript
export interface EventEnvelope<T = unknown> {
  readonly id: string; // UUID
  readonly event: string; // Ex: company.created
  readonly tenantId: string;
  readonly pluginId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly timestamp: number;
  readonly version: number;
  readonly payload: T;
}
```

## 4. Domain Event Store

O Event Store é o log persistente de tudo o que aconteceu no sistema. 
As características fundamentais de um Domain Event armazenado são:
- **Imutável**: Uma vez persistido, nunca é alterado ou apagado (append-only).
- **Ordenado**: Possui um timestamp estrito e ordem de sequência.
- **Auditoria**: Preserva a identidade rastreável do ator (usuário/sistema) que gerou a mutação.

## 5. O Padrão Outbox (Outbox Pattern)

O CivicOS previne a "Dupla Escrita Inconsistente" entre banco de dados e mensageria através do Outbox Pattern.
O transporte é abstraído (ex: `InMemoryOutboxTransport`, `PostgresOutboxTransport`), para que o Runtime nunca dependa de infraestrutura específica.

Todo evento possui estado (jamais são apagados):
`PENDING → PROCESSING → PROCESSED` (ou `FAILED` / `DEAD_LETTER`).

**O Fluxo de Execução**:
1. O Plugin executa a lógica de domínio e persiste a entidade + `EventEnvelope` atômicamente na Outbox table.
2. O `OutboxTransport` monitora a Outbox e lê lotes de eventos `PENDING`.
3. O Dispatcher encaminha os eventos para os `Consumers` assíncronos (Jobs, Automations, Webhooks).
4. O evento é atualizado para `PROCESSED` na Outbox.

## 6. Job Runtime e Retry Policy

O ambiente de processamento em background (Jobs) opera sobre contratos genéricos para permitir que a infraestrutura subjacente seja trocável. 
As políticas de retentativa (`RetryPolicy`) não são decididas ad-hoc pelos jobs, mas governadas por um contrato central:

```typescript
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoff: 'linear' | 'exponential';
  readonly delayMs: number;
  readonly deadLetter: boolean;
}
```

## 7. Automation Runtime (Fase 6B)

A Engine de Automação (ADR-015) reage **exclusivamente a Domain Events**. Ela nunca ouve tabelas do banco de dados diretamente e nunca acopla a lógica a plugins específicos.
Em vez de um AST complexo, o modelo inicial é baseado em regras declarativas YAML-like (`when`, `if`, `then`).

## 8. Garantias e Observabilidade

- **Idempotência**: Todos os Handlers de Jobs e Actions de Automação **devem** ser construídos de forma idempotente.
- **Event Replay**: O Event Store permite "rebobinar" eventos passados.
- **Execution Health Report**: A plataforma gera um `RuntimeHealthReport` contendo métricas da Outbox, Jobs Pendentes, Dead Letters, Tempo Médio e Falhas.
