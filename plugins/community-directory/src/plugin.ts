import { communityDirectoryConfig } from './manifest';
import { demoTenant, churchTenant, CommunityDirectoryTenantConfig } from './domain/tenant-config';

// The application layer resolves tenant configuration
export function resolveDirectoryConfig(tenantId: string): CommunityDirectoryTenantConfig {
  if (tenantId === 'tenant-church') {
    return churchTenant;
  }
  return demoTenant;
}

// The plugin simply exports its configuration for the SDK/Kernel
export default communityDirectoryConfig;
