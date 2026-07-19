// ============================================================================
// Command Palette Contract — Core SaaS Framework
// ============================================================================
// Defines searchable commands that plugins and core register dynamically.
// Host applications (web/mobile shells) query this service on Ctrl+K.
// ============================================================================

export interface UIContext {
  readonly navigation: {
    push(path: string): void;
  };
  readonly modals: {
    open(modalId: string, props?: Record<string, unknown>): void;
    close(modalId: string): void;
  };
  readonly platform: 'web' | 'ios' | 'android';
}

export type CommandAction = (uiContext: UIContext) => void | Promise<void>;

export interface Command {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly permissions?: readonly string[];
  readonly category?: string;
  readonly shortcut?: string; // e.g. "Ctrl+Shift+E"
}

export interface CommandPaletteService {
  /** Register a command descriptor. */
  registerCommand(command: Command): void;

  /** Bind the callback execution function to a command ID. */
  registerCommandAction(commandId: string, action: CommandAction): () => void;

  /** Unregister a command descriptor. */
  unregisterCommand(commandId: string): void;

  /** Get all registered commands. */
  getCommands(): Command[];

  /** Find matching commands based on a search query. */
  searchCommands(query: string, uiContext: UIContext): Promise<Command[]>;

  /** Execute a registered command callback. */
  executeCommand(commandId: string, uiContext: UIContext): Promise<void>;
}
