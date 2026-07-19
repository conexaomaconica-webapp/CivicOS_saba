// ============================================================================
// Result Type — Shared
// ============================================================================
// Monadic error handling without exceptions. Every fallible operation
// should return Result<T, E> instead of throwing.
//
// Inspired by Rust's Result and fp-ts Either.
// ============================================================================
// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------
/** Create a successful result. */
export function ok(value) {
    return { ok: true, value };
}
/** Create a failed result. */
export function err(error) {
    return { ok: false, error };
}
// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
/** Type guard for success. */
export function isOk(result) {
    return result.ok;
}
/** Type guard for failure. */
export function isErr(result) {
    return !result.ok;
}
// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------
/** Map over a successful result. */
export function map(result, fn) {
    if (result.ok)
        return ok(fn(result.value));
    return result;
}
/** Map over a failed result's error. */
export function mapError(result, fn) {
    if (!result.ok)
        return err(fn(result.error));
    return result;
}
/** Chain (flatMap) a result. */
export function flatMap(result, fn) {
    if (result.ok)
        return fn(result.value);
    return result;
}
/** Unwrap a result, throwing if it's an error. Use sparingly. */
export function unwrap(result) {
    if (result.ok)
        return result.value;
    throw new Error(`Tried to unwrap an Err result: ${String(result.error)}`);
}
/** Unwrap a result with a default value. */
export function unwrapOr(result, defaultValue) {
    if (result.ok)
        return result.value;
    return defaultValue;
}
/** Wrap a function that may throw into a Result. */
export function tryCatch(fn) {
    try {
        return ok(fn());
    }
    catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
    }
}
/** Wrap an async function that may throw into a Result. */
export async function tryCatchAsync(fn) {
    try {
        return ok(await fn());
    }
    catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
    }
}
//# sourceMappingURL=result.js.map