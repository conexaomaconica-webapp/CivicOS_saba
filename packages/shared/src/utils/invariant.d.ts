/**
 * Assert a condition at runtime. If `false`, throws an `Error`.
 *
 * @example
 * ```ts
 * invariant(user != null, 'User must be authenticated');
 * // TypeScript now narrows `user` to non-null
 * ```
 */
export declare function invariant(condition: unknown, message: string): asserts condition;
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
export declare function unreachable(value: never, message?: string): never;
//# sourceMappingURL=invariant.d.ts.map