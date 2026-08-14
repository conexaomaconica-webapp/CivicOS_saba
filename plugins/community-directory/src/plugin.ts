import { communityDirectoryConfig } from './manifest';
import type { CommunityDirectoryTenantConfig } from './domain/tenant-config';

// Fase 1 containment: no tenant gets demonstrative data as a runtime fallback.
// The application layer must supply a persisted, tenant-scoped configuration.
export function resolveDirectoryConfig(
  _tenantId: string,
  persistedConfig?: CommunityDirectoryTenantConfig | null,
): CommunityDirectoryTenantConfig | null {
  return persistedConfig ?? null;
}

// The plugin simply exports its configuration for the SDK/Kernel
export default communityDirectoryConfig;
