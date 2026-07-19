// ============================================================================
// Middleware Pipeline — Core Kernel
// ============================================================================
// Composable middleware pipeline for request processing. Both the Core and
// plugins can contribute middlewares; they are sorted by `order` and
// executed sequentially (onion model).
//
// INVARIANT: This module contains ZERO business logic.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MiddlewareHandler = (
  request: Request,
  next: () => Promise<Response>,
) => Promise<Response>;

export interface Middleware {
  readonly id: string;
  readonly order: number;
  readonly handler: MiddlewareHandler;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class MiddlewarePipeline {
  private middlewares: Middleware[] = [];
  private compiled = false;

  /** Add a middleware to the pipeline. */
  use(middleware: Middleware): void {
    if (this.compiled) {
      throw new Error(
        'Cannot add middleware after the pipeline has been compiled.',
      );
    }
    this.middlewares.push(middleware);
  }

  /** Add multiple middlewares. */
  useAll(middlewares: Middleware[]): void {
    for (const m of middlewares) {
      this.use(m);
    }
  }

  /**
   * Compile the pipeline into an executable handler.
   * Middlewares are sorted by `order` (ascending) and chained.
   */
  compile(
    finalHandler: (request: Request) => Promise<Response>,
  ): (request: Request) => Promise<Response> {
    this.compiled = true;

    // Sort by order, stable
    const sorted = [...this.middlewares].sort((a, b) => a.order - b.order);

    // Build the chain from inside out (right to left)
    let chain = finalHandler;

    for (let i = sorted.length - 1; i >= 0; i--) {
      const middleware = sorted[i]!;
      const next = chain;
      chain = (request: Request) => middleware.handler(request, () => next(request));
    }

    return chain;
  }

  /** List registered middlewares (sorted by order). */
  list(): readonly Middleware[] {
    return [...this.middlewares].sort((a, b) => a.order - b.order);
  }
}
