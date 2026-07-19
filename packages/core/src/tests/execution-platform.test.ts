// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import type { EventEnvelope } from '../execution/domain-events';
import { RuntimeEventBus } from '../execution/runtime-event-bus';
import { OutboxDispatcher, OutboxTransport, OutboxMessage, OutboxState } from '../execution/outbox';
import type { JobQueueProvider, JobDefinition, JobContext } from '../execution/job-runtime';

class InMemoryOutboxTransport implements OutboxTransport {
  private messages: OutboxMessage[] = [];

  async publish(event: EventEnvelope<any>): Promise<void> {
    this.messages.push({
      id: Math.random().toString(),
      event,
      state: 'PENDING',
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  async nextBatch(limit: number): Promise<OutboxMessage[]> {
    const batch = this.messages.filter(m => m.state === 'PENDING').slice(0, limit);
    for (const msg of batch) {
      msg.state = 'PROCESSING';
      msg.updatedAt = Date.now();
    }
    return batch;
  }

  async acknowledge(id: string): Promise<void> {
    const msg = this.messages.find(m => m.id === id);
    if (msg) {
      msg.state = 'PROCESSED';
      msg.updatedAt = Date.now();
    }
  }

  async fail(id: string, error: string): Promise<void> {
    const msg = this.messages.find(m => m.id === id);
    if (msg) {
      msg.attempts += 1;
      msg.lastError = error;
      // Hardcoded max attempts for this test transport
      if (msg.attempts >= 3) {
        msg.state = 'DEAD_LETTER';
      } else {
        msg.state = 'FAILED'; // It will need to go back to pending via a retry scheduler, but we simplify
      }
      msg.updatedAt = Date.now();
    }
  }

  getMessages() {
    return this.messages;
  }
}

class InMemoryJobQueue implements JobQueueProvider {
  private workers = new Map<string, JobDefinition<any>>();
  private queuedJobs: { def: JobDefinition<any>, payload: any }[] = [];

  registerWorker<T>(definition: JobDefinition<T>, pluginContext: any): void {
    this.workers.set(definition.id, definition);
  }

  async enqueue<T>(definition: JobDefinition<T>, payload: T): Promise<string> {
    this.queuedJobs.push({ def: definition, payload });
    return Math.random().toString();
  }

  async flushAll() {
    const jobs = [...this.queuedJobs];
    this.queuedJobs = [];
    for (const job of jobs) {
      const worker = this.workers.get(job.def.id);
      if (worker) {
        await worker.handler(job.payload, {} as any);
      }
    }
  }
}

describe('Execution Platform (AC-6A)', () => {
  it('should process a domain event from outbox to job queue without knowing the business entity', async () => {
    // 1. Setup Infrastructure
    const transport = new InMemoryOutboxTransport();
    const runtimeEventBus = new RuntimeEventBus();
    const dispatcher = new OutboxDispatcher(transport, runtimeEventBus, 10, 100);
    const jobQueue = new InMemoryJobQueue();

    const companyCreatedJobHandler = vi.fn().mockResolvedValue(undefined);

    // 2. Define the generic Job that reacts to 'company.created'
    const syncJob: JobDefinition<EventEnvelope<any>> = {
      id: 'sync-company',
      pluginId: 'business-directory',
      queue: 'high-priority',
      retryPolicy: {
        maxAttempts: 3,
        backoff: 'exponential',
        delayMs: 1000,
        deadLetter: true
      },
      handler: companyCreatedJobHandler
    };

    jobQueue.registerWorker(syncJob, {} as any);

    // 3. Automation/Consumer subscribes to RuntimeEventBus and forwards to JobQueue
    runtimeEventBus.subscribe('company.created', async (event) => {
      await jobQueue.enqueue(syncJob, event);
    });

    // 4. Plugin emits a Domain Event (persisting to Outbox)
    const companyCreatedEvent: EventEnvelope<any> = {
      id: 'uuid-1',
      event: 'company.created',
      tenantId: 'tenant-a',
      pluginId: 'business-directory',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      timestamp: Date.now(),
      version: 1,
      payload: { companyId: '123', name: 'ACME Corp', plan: 'premium' }
    };

    await transport.publish(companyCreatedEvent);

    // 5. Dispatcher reads Outbox and publishes to RuntimeEventBus
    const processedCount = await dispatcher.processNextBatch();
    expect(processedCount).toBe(1);

    // Assert that the message was acknowledged in the transport
    const messages = transport.getMessages();
    expect(messages[0].state).toBe('PROCESSED');

    // 6. Flush job queue to simulate background workers picking up the job
    await jobQueue.flushAll();

    // Assert that the Job Handler was called with the Event Envelope
    expect(companyCreatedJobHandler).toHaveBeenCalledTimes(1);
    const receivedEvent = companyCreatedJobHandler.mock.calls[0][0];
    
    expect(receivedEvent.event).toBe('company.created');
    expect(receivedEvent.payload.companyId).toBe('123');
    // Note: The @saas/core framework did NOT need to import or know about 'CompanyCreatedV1' interface!
  });

  it('should transition message to FAILED if consumers throw errors', async () => {
    const transport = new InMemoryOutboxTransport();
    const runtimeEventBus = new RuntimeEventBus();
    const dispatcher = new OutboxDispatcher(transport, runtimeEventBus, 10, 100);

    runtimeEventBus.subscribe('some.event', async (event) => {
      throw new Error('Consumer failed catastrophically');
    });

    const event: EventEnvelope<any> = {
      id: 'uuid-2',
      event: 'some.event',
      tenantId: 'tenant-a',
      pluginId: 'test',
      correlationId: 'corr-2',
      causationId: 'cause-2',
      timestamp: Date.now(),
      version: 1,
      payload: {}
    };

    await transport.publish(event);

    await dispatcher.processNextBatch();

    const messages = transport.getMessages();
    expect(messages[0].state).toBe('FAILED');
    expect(messages[0].lastError).toBe('Consumer failed catastrophically');
    expect(messages[0].attempts).toBe(1);
  });
});
