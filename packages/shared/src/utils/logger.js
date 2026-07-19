// ============================================================================
// Logger — Shared
// ============================================================================
// Structured logger compatible with both Node.js and Edge Runtime.
// Outputs JSON in production, pretty-printed in development.
// ============================================================================
// ---------------------------------------------------------------------------
// Level Priority
// ---------------------------------------------------------------------------
const LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
export function createLogger(context, options = {}) {
    const minLevel = options.minLevel ?? 'debug';
    const useJson = options.json ?? (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
    const minPriority = LEVEL_PRIORITY[minLevel];
    function shouldLog(level) {
        return LEVEL_PRIORITY[level] >= minPriority;
    }
    function log(level, message, meta) {
        if (!shouldLog(level))
            return;
        const entry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
            meta,
        };
        if (useJson) {
            const output = JSON.stringify(entry);
            if (level === 'error') {
                console.error(output);
            }
            else if (level === 'warn') {
                console.warn(output);
            }
            else {
                console.log(output);
            }
        }
        else {
            const prefix = context ? `[${context}]` : '';
            const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
            const formatted = `${entry.timestamp} ${level.toUpperCase().padEnd(5)} ${prefix} ${message}${metaStr}`;
            if (level === 'error') {
                console.error(formatted);
            }
            else if (level === 'warn') {
                console.warn(formatted);
            }
            else {
                console.log(formatted);
            }
        }
    }
    return {
        debug: (msg, meta) => log('debug', msg, meta),
        info: (msg, meta) => log('info', msg, meta),
        warn: (msg, meta) => log('warn', msg, meta),
        error: (msg, meta) => log('error', msg, meta),
        child: (childContext) => createLogger(context ? `${context}:${childContext}` : childContext, options),
    };
}
//# sourceMappingURL=logger.js.map