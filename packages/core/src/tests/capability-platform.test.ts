// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapabilityRegistry } from '../capabilities/capability-registry';
import { CapabilityResolver } from '../capabilities/capability-resolver';
import { FeatureEngine } from '../capabilities/feature-engine';
import { LicensingEngine, LicenseDataProvider, LicensePlan, LicenseAddon, TenantSubscription, TenantOverrides } from '../licensing/licensing-engine';
import { QuotaEngine, UsageDataProvider } from '../licensing/quota-engine';

describe('Capability Platform (AC-3)', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = new CapabilityRegistry();
    // Register available system capabilities
    registry.registerProvides({ id: 'auth:basic', type: 'service', provider: 'core', version: '1.0.0' });
    registry.registerProvides({ id: 'auth:social', type: 'service', provider: 'core', version: '1.0.0' });
    registry.registerProvides({ id: 'media:gallery', type: 'slot', provider: 'media-plugin', version: '1.0.0' });
    registry.registerProvides({ id: 'banner:rotating', type: 'slot', provider: 'marketing-plugin', version: '1.0.0' });
    registry.registerProvides({ id: 'beta:feature', type: 'service', provider: 'beta-plugin', version: '1.0.0' });
    registry.freeze();
  });

  describe('Licensing Engine & Resolver', () => {
    it('should grant base plan capabilities correctly', async () => {
      const mockProvider: LicenseDataProvider = {
        getPlan: async () => ({ id: 'starter', capabilities: ['auth:basic'], quotas: { storage: 100 } }),
        getAddon: async () => null,
        getTenantSubscription: async () => ({ tenantId: 't1', planId: 'starter', addonIds: [], status: 'active' }),
        getTenantOverrides: async () => null,
      };

      const engine = new LicensingEngine(mockProvider);
      const license = await engine.resolve('t1');

      expect(CapabilityResolver.canUse(license, registry, 'auth:basic')).toBe(true);
      expect(CapabilityResolver.canUse(license, registry, 'auth:social')).toBe(false); // Not in plan
      expect(CapabilityResolver.canUse(license, registry, 'invalid:cap')).toBe(false); // Not in registry
    });

    it('should combine base plan and addons', async () => {
      const mockProvider: LicenseDataProvider = {
        getPlan: async () => ({ id: 'starter', capabilities: ['auth:basic'], quotas: { storage: 100 } }),
        getAddon: async () => ({ id: 'marketing-pack', capabilities: ['banner:rotating'], quotas: { storage: 50 } }),
        getTenantSubscription: async () => ({ tenantId: 't2', planId: 'starter', addonIds: ['marketing-pack'], status: 'active' }),
        getTenantOverrides: async () => null,
      };

      const engine = new LicensingEngine(mockProvider);
      const license = await engine.resolve('t2');

      expect(CapabilityResolver.canUse(license, registry, 'auth:basic')).toBe(true);
      expect(CapabilityResolver.canUse(license, registry, 'banner:rotating')).toBe(true);
      expect(license.quotas['storage']).toBe(150); // 100 base + 50 addon
    });

    it('should apply tenant overrides (grants and revokes)', async () => {
      const mockProvider: LicenseDataProvider = {
        getPlan: async () => ({ id: 'pro', capabilities: ['auth:basic', 'auth:social', 'media:gallery'], quotas: { storage: 500 } }),
        getAddon: async () => null,
        getTenantSubscription: async () => ({ tenantId: 't3', planId: 'pro', addonIds: [], status: 'active' }),
        getTenantOverrides: async () => ({ 
          tenantId: 't3', 
          grantedCapabilities: ['beta:feature'], 
          revokedCapabilities: ['auth:social'], 
          quotaOverrides: { storage: 1000 } 
        }),
      };

      const engine = new LicensingEngine(mockProvider);
      const license = await engine.resolve('t3');

      // Base granted
      expect(CapabilityResolver.canUse(license, registry, 'auth:basic')).toBe(true);
      // Revoked via override
      expect(CapabilityResolver.canUse(license, registry, 'auth:social')).toBe(false); 
      // Granted via override
      expect(CapabilityResolver.canUse(license, registry, 'beta:feature')).toBe(true);
      // Quota overridden
      expect(license.quotas['storage']).toBe(1000);
    });
  });

  describe('Quota Engine', () => {
    it('should correctly evaluate remaining quota and consumption limits', async () => {
      const mockUsageProvider: UsageDataProvider = {
        getUsage: async (tenantId, quotaKey) => {
          if (quotaKey === 'storage') return 400;
          return 0;
        }
      };
      const quotaEngine = new QuotaEngine(mockUsageProvider);

      const license = {
        tenantId: 't1',
        version: 1,
        generatedAt: new Date(),
        capabilities: new Set<string>(),
        quotas: { storage: 500, users: -1 }, // -1 means unlimited
        addons: []
      };

      // 500 limit - 400 usage = 100 remaining
      expect(await quotaEngine.quotaRemaining(license, 'storage')).toBe(100);
      expect(await quotaEngine.canConsume(license, 'storage', 50)).toBe(true);
      expect(await quotaEngine.canConsume(license, 'storage', 150)).toBe(false);

      // Unlimited quota
      expect(await quotaEngine.quotaRemaining(license, 'users')).toBe(Infinity);
      expect(await quotaEngine.canConsume(license, 'users', 9999)).toBe(true);

      // Undefined quota (defaults to 0)
      expect(await quotaEngine.quotaRemaining(license, 'unknown')).toBe(0);
      expect(await quotaEngine.canConsume(license, 'unknown', 1)).toBe(false);
    });
  });

  describe('Feature Engine', () => {
    it('should translate capabilities into feature flags context', async () => {
      const license = {
        tenantId: 't1',
        version: 1,
        generatedAt: new Date(),
        capabilities: new Set(['auth:basic', 'media:gallery']),
        quotas: {},
        addons: []
      };

      const featureEngine = new FeatureEngine(license, registry);

      expect(featureEngine.isEnabled('auth:basic')).toBe(true);
      expect(featureEngine.isEnabled('banner:rotating')).toBe(false);

      const allFlags = featureEngine.exportFlags();
      expect(allFlags['auth:basic']).toBe(true);
      expect(allFlags['media:gallery']).toBe(true);
      expect(allFlags['auth:social']).toBe(false);
      expect(allFlags['banner:rotating']).toBe(false);
    });
  });
});
