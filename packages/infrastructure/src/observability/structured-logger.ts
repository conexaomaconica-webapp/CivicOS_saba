import type { StructuredLogger, RequestContext } from '@saas/core';

export class ConsoleStructuredLogger implements StructuredLogger {
  constructor(
    private readonly requestContext: RequestContext,
    private readonly defaultMeta: Record<string, unknown> = {}
  ) {}

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, error?: Error, meta?: Record<string, unknown>) {
    const ctx = this.requestContext.get();
    
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: ctx?.correlationId,
      tenantId: ctx?.tenantId,
      ...this.defaultMeta,
      ...meta,
    };

    if (error) {
      Object.assign(entry, { error: error.message, stack: error.stack });
    }

    // In a real implementation this would write to stdout/stderr in JSON format
    const output = JSON.stringify(entry);
    
    switch (level) {
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
      case 'debug':
        console.debug(output);
        break;
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, undefined, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log('error', message, error, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, undefined, meta);
  }

  child(meta: Record<string, unknown>): StructuredLogger {
    return new ConsoleStructuredLogger(this.requestContext, {
      ...this.defaultMeta,
      ...meta,
    });
  }
}
