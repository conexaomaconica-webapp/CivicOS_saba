import type { PluginLifecycleHooks, PluginContext } from '@saas/sdk';
import { createBusinessCapability } from './capabilities/business-capabilities';
import { 
  businessCreatedEvent, 
  businessSubmittedEvent, 
  businessApprovedEvent, 
  businessRejectedEvent, 
  businessPublishedEvent, 
  businessArchivedEvent 
} from './events/business-events';
import { createBusinessPolicy, publishBusinessPolicy } from './policies/business-policies';
import { registrationWorkflow } from './workflows/business-registration';
import { publishingWorkflow } from './workflows/business-publishing';

export * from './domain/entities/business';
export * from './domain/enums/business-status';
export * from './domain/ports/business.repository';

export const hooks: PluginLifecycleHooks = {
  onInstall: (ctx: PluginContext) => {
    ctx.logger.info('Business Directory Plugin: Installing...');
    
    // Ensure that all lifecycle orchestrators are defined
    if (!createBusinessCapability || !businessCreatedEvent || !businessSubmittedEvent || 
        !businessApprovedEvent || !businessRejectedEvent || !businessPublishedEvent || 
        !businessArchivedEvent || !createBusinessPolicy || !publishBusinessPolicy || 
        !registrationWorkflow || !publishingWorkflow) {
      throw new Error('Business Directory Domain objects missing');
    }
  },
  onBoot: (ctx: PluginContext) => {
    ctx.logger.info('Business Directory Plugin: Booting...');
  },
  onEnable: (ctx: PluginContext) => {
    ctx.logger.info('Business Directory Plugin: Enabled!');
  },
  onDisable: (ctx: PluginContext) => {
    ctx.logger.info('Business Directory Plugin: Disabled');
  },
  onUninstall: (ctx: PluginContext) => {
    ctx.logger.info('Business Directory Plugin: Uninstalled');
  }
};
