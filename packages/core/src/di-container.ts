// ============================================================================
// DI Container — Core Kernel
// ============================================================================
// Lightweight dependency injection container using typed symbol tokens.
// No decorators, no reflect-metadata — fully compatible with Next.js Edge
// Runtime and tree-shakeable.
//
// Supports:
// - Singleton and transient lifetimes
// - Factory-based registration
// - Scoped containers (per-request)
// - Multi-binding (getAll)
//
// INVARIANT: This module contains ZERO business logic.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A branded symbol that carries its resolved type at the type level.
 *
 * Usage:
 * ```ts
 * const AUTH_SERVICE = createToken<IAuthService>('AuthService');
 * container.bind(AUTH_SERVICE).toFactory(() => new SupabaseAuthService());
 * const auth = container.get(AUTH_SERVICE); // typed as IAuthService
 * ```
 */
export type ServiceToken<T> = symbol & { readonly __type: T };

/** Create a typed service token. */
export function createToken<T>(name: string): ServiceToken<T> {
  return Symbol(name) as ServiceToken<T>;
}

export type Lifetime = 'singleton' | 'transient';

interface Binding<T> {
  factory: (container: Container) => T;
  lifetime: Lifetime;
  instance?: T; // cached for singletons
}

// ---------------------------------------------------------------------------
// Binding Builder (fluent API)
// ---------------------------------------------------------------------------

export class BindingBuilder<T> {
  private lifetime: Lifetime = 'singleton';

  constructor(
    private readonly container: Container,
    private readonly token: ServiceToken<T>,
  ) {}

  /** Register a factory function that creates the service. */
  toFactory(factory: (container: Container) => T): this {
    this.container._addBinding(this.token, {
      factory,
      lifetime: this.lifetime,
    });
    return this;
  }

  /** Register a pre-existing value as a singleton. */
  toValue(value: T): this {
    this.container._addBinding(this.token, {
      factory: () => value,
      lifetime: 'singleton',
      instance: value,
    });
    return this;
  }

  /** Set lifetime to singleton (default). */
  asSingleton(): this {
    this.lifetime = 'singleton';
    return this;
  }

  /** Set lifetime to transient (new instance per resolution). */
  asTransient(): this {
    this.lifetime = 'transient';
    return this;
  }
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export class Container {
  private readonly bindings = new Map<symbol, Binding<unknown>[]>();
  private readonly parent: Container | null;

  constructor(parent: Container | null = null) {
    this.parent = parent;
  }

  // -- Registration ---------------------------------------------------------

  /** Begin binding a service token. */
  bind<T>(token: ServiceToken<T>): BindingBuilder<T> {
    return new BindingBuilder<T>(this, token);
  }

  /** @internal Used by BindingBuilder. Do not call directly. */
  _addBinding<T>(token: ServiceToken<T>, binding: Binding<T>): void {
    const existing = this.bindings.get(token as symbol);
    if (existing) {
      existing.push(binding as Binding<unknown>);
    } else {
      this.bindings.set(token as symbol, [binding as Binding<unknown>]);
    }
  }

  // -- Resolution -----------------------------------------------------------

  /**
   * Resolve a service. Throws if not found.
   * For multi-bindings, returns the LAST registered.
   */
  get<T>(token: ServiceToken<T>): T {
    const binding = this.findBinding(token);
    if (!binding) {
      const name = token.toString();
      throw new Error(`[DI] No binding found for token: ${name}`);
    }
    return this.resolve(binding) as T;
  }

  /**
   * Resolve a service, returning `undefined` if not found.
   */
  getOptional<T>(token: ServiceToken<T>): T | undefined {
    const binding = this.findBinding(token);
    if (!binding) return undefined;
    return this.resolve(binding) as T;
  }

  /**
   * Resolve ALL bindings for a token (multi-binding).
   * Returns an empty array if no bindings exist.
   */
  getAll<T>(token: ServiceToken<T>): T[] {
    const bindings = this.findAllBindings(token);
    return bindings.map((b) => this.resolve(b) as T);
  }

  /**
   * Check if a token has at least one binding.
   */
  has<T>(token: ServiceToken<T>): boolean {
    return this.findBinding(token) !== null;
  }

  // -- Scoping --------------------------------------------------------------

  /**
   * Create a child container. Child inherits parent bindings but can
   * override them. Useful for per-request scoping.
   */
  createScope(): Container {
    return new Container(this);
  }

  // -- Internals ------------------------------------------------------------

  private findBinding(token: ServiceToken<unknown>): Binding<unknown> | null {
    const local = this.bindings.get(token as symbol);
    if (local && local.length > 0) {
      return local[local.length - 1]!;
    }
    if (this.parent) {
      return this.parent.findBinding(token);
    }
    return null;
  }

  private findAllBindings(token: ServiceToken<unknown>): Binding<unknown>[] {
    const parentBindings = this.parent
      ? this.parent.findAllBindings(token)
      : [];
    const localBindings = this.bindings.get(token as symbol) ?? [];
    return [...parentBindings, ...localBindings];
  }

  private resolve(binding: Binding<unknown>): unknown {
    if (binding.lifetime === 'singleton') {
      if (binding.instance === undefined) {
        binding.instance = binding.factory(this);
      }
      return binding.instance;
    }
    // transient
    return binding.factory(this);
  }
}
