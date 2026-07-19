import type { PluginLifecycleHooks, PluginContext } from '@saas/sdk';
import { echoCapability } from './capabilities/echo';
import { echoWorkflow } from './workflows/echo-workflow';
import { executionPolicy } from './policies/execution-policy';
import { referenceExecutedEvent } from './events/reference-events';
import { referenceDashboardWidget, referenceRoute } from './presentation/dashboard';

export const hooks: PluginLifecycleHooks = {
  onInstall: (ctx: PluginContext) => {
    ctx.logger.info('Reference Plugin: Installing...');
    
    // Demonstrate use of the domain objects
    if (!echoCapability || !echoWorkflow || !executionPolicy || !referenceExecutedEvent || !referenceDashboardWidget || !referenceRoute) {
      throw new Error('Reference objects missing');
    }
  },
  
  onBoot: (ctx: PluginContext) => {
    ctx.logger.info('Reference Plugin: Booting...');
    
    // We can emit allowed plugin events.
    ctx.events.emit('reference.executed.v1', { message: 'booting' });
  },
  
  onEnable: (ctx: PluginContext) => {
    ctx.logger.info('Reference Plugin: Enabled!');
    
    // Resolve allowed service contract
    try {
      const storage = ctx.services.resolve<any>('StorageService');
      ctx.logger.info('Resolved StorageService', storage);
    } catch (err: any) {
      ctx.logger.warn('Could not resolve StorageService, which is expected if not provided by core in tests', err.message);
    }
  },
  
  onDisable: (ctx: PluginContext) => {
    ctx.logger.info('Reference Plugin: Disabled');
  },
  
  onUninstall: (ctx: PluginContext) => {
    ctx.logger.info('Reference Plugin: Uninstalled');
  }
};
