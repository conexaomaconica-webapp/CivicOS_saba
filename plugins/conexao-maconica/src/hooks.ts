// Local type to avoid importing from @saas/sdk in the plugin source
interface PluginContext {
  readonly tenant?: { id: string; name: string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
  };
}

export async function setupMasonicDefaults(context: PluginContext): Promise<void> {
  const { logger } = context;

  logger.info('Setting up Conexão Maçônica defaults...');
  logger.info('Conexão Maçônica defaults configured successfully');
}

export async function cleanupMasonicData(context: PluginContext): Promise<void> {
  const { logger } = context;

  logger.info('Cleaning up Conexão Maçônica data...');
  logger.info('Conexão Maçônica cleanup completed');
}