// ============================================================================
// Result Type — Shared
// ============================================================================
// Monadic error handling without exceptions. Every fallible operation
// should return Result<T, E> instead of throwing.
//
// Inspired by Rust's Result and fp-ts Either.
// ============================================================================

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type Result<T, E = string> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E = string> {
  readonly ok: false;
  readonly error: E;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Create a successful result. */
export function ok<T>(value: T): Success<T> {
  return { ok: true, value };
}

/** Create a failed result. */
export function err<E = string>(error: E): Failure<E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Type guard for success. */
export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok;
}

/** Type guard for failure. */
export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.ok;
}

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

/** Map over a successful result. */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}

/** Map over a failed result's error. */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  if (!result.ok) return err(fn(result.error));
  return result;
}

/** Chain (flatMap) a result. */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (result.ok) return fn(result.value);
  return result;
}

/** Unwrap a result, throwing if it's an error. Use sparingly. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(
    `Tried to unwrap an Err result: ${String(result.error)}`,
  );
}

/** Unwrap a result with a default value. */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.ok) return result.value;
  return defaultValue;
}

/** Wrap a function that may throw into a Result. */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/** Wrap an async function that may throw into a Result. */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
