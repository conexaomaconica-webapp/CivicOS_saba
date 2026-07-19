// ============================================================================
// Dependency Injection Container — Core Kernel
// ============================================================================
// Simple, type-safe IoC container for the CivicOS platform.
// Supports registering singletons via strictly typed tokens.
// ============================================================================

import type { Token } from './tokens';

export class Container {
  private readonly registry = new Map<symbol, unknown>();

  /**
   * Registers a singleton instance for a specific token.
   * 
   * @param token The type-safe token
   * @param instance The instance to bind
   */
  register<T>(token: Token<T>, instance: T): void {
    if (this.registry.has(token.symbol)) {
      throw new Error(`Token "${token.description}" is already registered.`);
    }
    this.registry.set(token.symbol, instance);
  }

  /**
   * Resolves an instance for a given token.
   * Throws an error if the token has not been registered.
   * 
   * @param token The type-safe token
   * @returns The registered instance
   */
  resolve<T>(token: Token<T>): T {
    const instance = this.registry.get(token.symbol);
    if (!instance) {
      throw new Error(`Failed to resolve token: "${token.description}". Was it registered?`);
    }
    return instance as T;
  }

  /**
   * Resolves an instance by the token's description string.
   * Useful for dynamic resolution from external manifests (e.g., ServiceResolver).
   */
  resolveByName<T>(description: string): T | undefined {
    for (const [symbol, instance] of this.registry.entries()) {
      if (symbol.description === description) {
        return instance as T;
      }
    }
    return undefined;
  }

  /**
   * Clears all registered instances (useful for testing/resetting state).
   */
  clear(): void {
    this.registry.clear();
  }
}
