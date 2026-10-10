/**
 * Logger Estruturado JSON para Next.js e Vercel — Zero Sentry
 *
 * Emite logs estruturados em formato JSON em linha única, indexáveis
 * nativamente pelo runtime da Vercel. Não registra payloads sensíveis
 * nem expõe dados confidenciais.
 */

import { sanitizeData } from './redaction';
import { scheduleOperationalAlert } from './operational-alerts';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  incident_id?: string;
  context?: Record<string, unknown>;
  duplicate_count?: number;
  environment: string;
}

interface DeduplicationRecord {
  firstSeen: number;
  lastSeen: number;
  count: number;
}

// Cache de deduplicação em memória (otimização de processo local, com expiração de 5 minutos)
// NOTA IMPORTANTE: Em ambiente serverless (Vercel), instâncias isoladas possuem memórias independentes.
// Este cache serve como mitigação de rajadas na mesma instância, nunca como garantia de persistência global.
const deduplicationCache = new Map<string, DeduplicationRecord>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MAX_CACHE_ENTRIES = 500;

function cleanExpiredDeduplications(now: number) {
  if (deduplicationCache.size > MAX_CACHE_ENTRIES) {
    for (const [key, record] of deduplicationCache.entries()) {
      if (now - record.lastSeen > DEDUP_WINDOW_MS) {
        deduplicationCache.delete(key);
      }
    }
  }
}

function generateIncidentId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'inc_';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function createSignature(service: string, message: string, level: LogLevel): string {
  return `${service}:${level}:${message.slice(0, 100)}`;
}

class StructuredLogger {
  private serviceName: string;

  constructor(serviceName = 'conexao-maconica-web') {
    this.serviceName = serviceName;
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      this.write('DEBUG', message, context);
    }
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.write('INFO', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.write('WARN', message, context);
  }

  public error(message: string, errorOrContext?: Error | Record<string, unknown>, additionalContext?: Record<string, unknown>): string {
    const incidentId = generateIncidentId();
    let mergedContext: Record<string, unknown> = {};

    if (errorOrContext instanceof Error) {
      mergedContext = {
        error: {
          name: errorOrContext.name,
          message: errorOrContext.message,
          stack: errorOrContext.stack,
        },
        ...additionalContext,
      };
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      mergedContext = { ...errorOrContext, ...additionalContext };
    }

    this.write('ERROR', message, mergedContext, incidentId);
    return incidentId;
  }

  public critical(message: string, errorOrContext?: Error | Record<string, unknown>, additionalContext?: Record<string, unknown>): string {
    const incidentId = generateIncidentId();
    let mergedContext: Record<string, unknown> = {};

    if (errorOrContext instanceof Error) {
      mergedContext = {
        error: {
          name: errorOrContext.name,
          message: errorOrContext.message,
          stack: errorOrContext.stack,
        },
        ...additionalContext,
      };
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      mergedContext = { ...errorOrContext, ...additionalContext };
    }

    this.write('CRITICAL', message, mergedContext, incidentId);

    // Dispara alerta operacional assíncrono para o canal da equipe (se configurado) via after()
    scheduleOperationalAlert({
      incidentId,
      severity: 'CRITICAL',
      service: this.serviceName,
      message,
      context: mergedContext,
    });

    return incidentId;
  }

  private write(level: LogLevel, rawMessage: string, rawContext?: Record<string, unknown>, incidentId?: string): void {
    const now = Date.now();
    cleanExpiredDeduplications(now);

    const signature = createSignature(this.serviceName, rawMessage, level);
    const existing = deduplicationCache.get(signature);

    let duplicateCount = 0;
    if (existing && now - existing.lastSeen < DEDUP_WINDOW_MS) {
      existing.count += 1;
      existing.lastSeen = now;
      duplicateCount = existing.count;
    } else {
      deduplicationCache.set(signature, { firstSeen: now, lastSeen: now, count: 1 });
    }

    // Sanitiza todos os dados antes de formatar
    const sanitizedMessage = typeof rawMessage === 'string' ? rawMessage : String(rawMessage);
    const sanitizedContext = rawContext ? (sanitizeData(rawContext) as Record<string, unknown>) : undefined;

    const entry: LogEntry = {
      timestamp: new Date(now).toISOString(),
      level,
      service: this.serviceName,
      message: sanitizedMessage,
      incident_id: incidentId,
      context: sanitizedContext,
      duplicate_count: duplicateCount > 1 ? duplicateCount : undefined,
      environment: process.env.NODE_ENV || 'development',
    };

    const output = JSON.stringify(entry);

    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(output);
    } else if (level === 'WARN') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

export const logger = new StructuredLogger('conexao-maconica-web');
export function createLogger(serviceName: string): StructuredLogger {
  return new StructuredLogger(serviceName);
}
