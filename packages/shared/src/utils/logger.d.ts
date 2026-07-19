export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    readonly level: LogLevel;
    readonly message: string;
    readonly timestamp: string;
    readonly context?: string;
    readonly meta?: Record<string, unknown>;
}
export interface Logger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    child(context: string): Logger;
}
export declare function createLogger(context?: string, options?: {
    minLevel?: LogLevel;
    json?: boolean;
}): Logger;
//# sourceMappingURL=logger.d.ts.map