export type Result<T, E = string> = Success<T> | Failure<E>;
export interface Success<T> {
    readonly ok: true;
    readonly value: T;
}
export interface Failure<E = string> {
    readonly ok: false;
    readonly error: E;
}
/** Create a successful result. */
export declare function ok<T>(value: T): Success<T>;
/** Create a failed result. */
export declare function err<E = string>(error: E): Failure<E>;
/** Type guard for success. */
export declare function isOk<T, E>(result: Result<T, E>): result is Success<T>;
/** Type guard for failure. */
export declare function isErr<T, E>(result: Result<T, E>): result is Failure<E>;
/** Map over a successful result. */
export declare function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
/** Map over a failed result's error. */
export declare function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;
/** Chain (flatMap) a result. */
export declare function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>;
/** Unwrap a result, throwing if it's an error. Use sparingly. */
export declare function unwrap<T, E>(result: Result<T, E>): T;
/** Unwrap a result with a default value. */
export declare function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
/** Wrap a function that may throw into a Result. */
export declare function tryCatch<T>(fn: () => T): Result<T, Error>;
/** Wrap an async function that may throw into a Result. */
export declare function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>>;
//# sourceMappingURL=result.d.ts.map