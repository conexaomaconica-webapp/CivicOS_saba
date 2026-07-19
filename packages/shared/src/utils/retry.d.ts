export interface RetryOptions {
    /** Maximum number of attempts (including the first). Default: 3 */
    maxAttempts?: number;
    /** Base delay in milliseconds. Default: 1000 */
    baseDelay?: number;
    /** Maximum delay in milliseconds. Default: 30000 */
    maxDelay?: number;
    /** Backoff multiplier. Default: 2 */
    multiplier?: number;
    /** Add random jitter to prevent thundering herd. Default: true */
    jitter?: boolean;
    /** Optional predicate to decide if the error is retryable. Default: always retry. */
    retryIf?: (error: unknown, attempt: number) => boolean;
    /** Called before each retry (for logging). */
    onRetry?: (error: unknown, attempt: number, delay: number) => void;
    /** AbortSignal for cancellation. */
    signal?: AbortSignal;
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
export declare function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map