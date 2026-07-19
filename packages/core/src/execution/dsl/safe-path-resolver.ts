// ============================================================================
// Safe Path Resolver — Automation DSL (AC-6E.1)
// ============================================================================

export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(`SecurityViolation: ${message}`);
    this.name = 'SecurityViolationError';
  }
}

const FORBIDDEN_PROPERTIES = new Set(['__proto__', 'prototype', 'constructor']);
const ALLOWED_ROOTS = new Set(['payload', 'context', 'tenant', 'event', 'metadata']);

export class SafePathResolver {
  /**
   * Resolves a dotted path against a context object safely.
   * Throws SecurityViolationError if the path attempts to access restricted properties or roots.
   */
  static resolve(context: Record<string, any>, path: string): unknown {
    if (!path || typeof path !== 'string') {
      throw new SecurityViolationError('Path must be a non-empty string.');
    }

    const segments = path.split('.');
    if (segments.length === 0) {
       return undefined;
    }

    const root = segments[0];
    if (!ALLOWED_ROOTS.has(root!)) {
      throw new SecurityViolationError(`Access to root "${root}" is forbidden. Allowed roots: ${Array.from(ALLOWED_ROOTS).join(', ')}`);
    }

    let current: any = context;
    for (const segment of segments) {
      if (FORBIDDEN_PROPERTIES.has(segment)) {
        throw new SecurityViolationError(`Access to property "${segment}" is strictly forbidden to prevent prototype pollution.`);
      }

      // Arrays can be accessed via indices
      if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
         throw new SecurityViolationError(`Invalid characters in path segment: "${segment}".`);
      }

      if (current === undefined || current === null) {
        return undefined;
      }

      current = current[segment];
    }

    return current;
  }
}
