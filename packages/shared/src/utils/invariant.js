// ============================================================================
// Invariant — Shared
// ============================================================================
// Runtime assertion utility. Throws with a clear message when a condition
// that should "never" be false is violated.
// ============================================================================
/**
 * Assert a condition at runtime. If `false`, throws an `Error`.
 *
 * @example
 * ```ts
 * invariant(user != null, 'User must be authenticated');
 * // TypeScript now narrows `user` to non-null
 * ```
 */
export function invariant(condition, message) {
    if (!condition) {
        throw new Error(`[Invariant Violation] ${message}`);
    }
}
/**
 * Mark code paths that should be unreachable.
 *
 * @example
 * ```ts
 * switch (status) {
 *   case 'active': return handle();
 *   case 'inactive': return skip();
 *   default: unreachable(status);
 * }
 * ```
 */
export function unreachable(value, message) {
    throw new Error(message ?? `[Unreachable] Unexpected value: ${JSON.stringify(value)}`);
}
//# sourceMappingURL=invariant.js.map