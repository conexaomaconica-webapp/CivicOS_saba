// ============================================================================
// Retry — Shared
// ============================================================================
// Retry utility with exponential backoff and jitter. Edge Runtime compatible.
// ============================================================================
// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------
function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error('Retry aborted'));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Retry aborted'));
        }, { once: true });
    });
}
/**
 * Retry an async operation with exponential backoff.
 *
 * @example
 * ```ts
 * const data = await retry(() => fetchData(url), {
 *   maxAttempts: 3,
 *   baseDelay: 500,
 *   retryIf: (err) => err instanceof NetworkError,
 * });
 * ```
 */
export async function retry(fn, options = {}) {
    const { maxAttempts = 3, baseDelay = 1000, maxDelay = 30_000, multiplier = 2, jitter = true, retryIf = () => true, onRetry, signal, } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (signal?.aborted) {
                throw new Error('Retry aborted');
            }
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt >= maxAttempts)
                break;
            if (!retryIf(error, attempt))
                break;
            // Calculate delay with exponential backoff
            let delay = Math.min(baseDelay * Math.pow(multiplier, attempt - 1), maxDelay);
            // Add jitter (±25%)
            if (jitter) {
                const jitterRange = delay * 0.25;
                delay += (Math.random() * 2 - 1) * jitterRange;
                delay = Math.max(0, Math.round(delay));
            }
            onRetry?.(error, attempt, delay);
            await sleep(delay, signal);
        }
    }
    throw lastError;
}
//# sourceMappingURL=retry.js.map