import { describe, it, expect } from 'vitest';

import type { EntitlementsRepository } from './entitlements-repository';
import type {
  EntitlementDefinition,
  EntitlementGrant,
  EntitlementOverride,
  EntitlementSource,
  EntitlementUsage,
} from './entitlements-types';
import { EntitlementError, EntitlementsService } from './entitlements-service';

const NOW = '2026-08-11T12:00:00.000Z';

function grant(overrides: Partial<EntitlementGrant> = {}): EntitlementGrant {
  return {
    id: 'grant_1',
    tenantId: 'tnt_1',
    businessId: 'biz_1',
    entitlementId: 'def_1',
    entitlementCode: 'searches_monthly',
    entitlementName: 'Buscas mensais',
    sourceId: 'src_1',
    status: 'active',
    valueNumeric: 100,
    isUnlimited: false,
    validFrom: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function repo(stubs: { grants?: EntitlementGrant[]; usage?: EntitlementUsage | null; overrides?: EntitlementOverride[]; definitions?: EntitlementDefinition[] } = {}): EntitlementsRepository {
  const grants = stubs.grants ?? [];
  return {
    ensureDefinition: (def): Promise<EntitlementDefinition> => Promise.resolve({ id: 'def_1', ...def }),
    listDefinitions: () => Promise.resolve(stubs.definitions ?? []),
    createSource: (input): Promise<EntitlementSource> => Promise.resolve({
      id: 'src_1',
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceReferenceId: input.sourceReferenceId,
      sourceMetadata: {},
    }),
    createGrant: (input) => Promise.resolve(grant({ tenantId: input.tenantId, businessId: input.businessId, valueNumeric: input.valueNumeric })),
    getGrantById: () => Promise.resolve(grants[0] ?? null),
    getGrantByCode: () => Promise.resolve(grants[0] ?? null),
    listGrantsForBusiness: () => Promise.resolve(grants),
    updateGrantStatus: (id, status) => Promise.resolve(grants[0] ? { ...grants[0], id, status } : null),
    getUsage: () => Promise.resolve(stubs.usage ?? null),
    upsertUsage: (grantId, businessId, currentUsage): Promise<EntitlementUsage> => Promise.resolve({
      grantId,
      businessId,
      currentUsage,
      lastUsedAt: NOW,
    }),
    createOverride: (input) => Promise.resolve({
      id: 'ov_1',
      grantId: input.grantId,
      overrideValueNumeric: input.overrideValueNumeric,
      overrideValueBoolean: input.overrideValueBoolean,
      reason: input.reason,
      authorizedBy: input.authorizedBy,
      createdAt: NOW,
    }),
    listOverrides: () => Promise.resolve(stubs.overrides ?? []),
  };
}

describe('EntitlementsService', () => {
  describe('grant lifecycle', () => {
    it('returns the granted entitlement with active evaluation', async () => {
      const service = new EntitlementsService(repo({ grants: [grant()] }), () => new Date(NOW));

      const value = await service.getEntitlement('tnt_1', 'biz_1', 'searches_monthly');

      expect(value.granted).toBe(true);
      expect(value.active).toBe(true);
      expect(value.valueType).toBe('numeric');
      expect(value.valueNumeric).toBe(100);
    });

    it('reports not granted when no grant exists', async () => {
      const service = new EntitlementsService(repo(), () => new Date(NOW));

      const value = await service.getEntitlement('tnt_1', 'biz_1', 'nonexistent');

      expect(value.granted).toBe(false);
      expect(value.active).toBe(false);
    });

    it('marks inactive grants as not active (suspended / outside window)', async () => {
      const service = new EntitlementsService(
        repo({ grants: [grant({ status: 'suspended' })] }),
        () => new Date(NOW),
      );

      const value = await service.getEntitlement('tnt_1', 'biz_1', 'searches_monthly');

      expect(value.granted).toBe(true);
      expect(value.active).toBe(false);
    });

    it('revokes and reactivates grants through status transitions', async () => {
      const service = new EntitlementsService(repo({ grants: [grant()] }), () => new Date(NOW));

      const revoked = await service.revoke('grant_1', 'user_1', 'política');
      expect(revoked.status).toBe('revoked');

      const reactivated = await service.reactivate('grant_1', 'user_1');
      expect(reactivated.status).toBe('active');
    });
  });

  describe('consume', () => {
    it('returns allowed with remaining when usage is below the limit', async () => {
      const service = new EntitlementsService(
        repo({ grants: [grant({ valueNumeric: 100 })], usage: { grantId: 'grant_1', businessId: 'biz_1', currentUsage: 30, lastUsedAt: NOW } }),
        () => new Date(NOW),
      );

      const result = await service.consume({ tenantId: 'tnt_1', businessId: 'biz_1', entitlementCode: 'searches_monthly', amount: 10 });

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(40);
      expect(result.remaining).toBe(60);
    });

    it('denies when the quota would be exceeded without throwing', async () => {
      const service = new EntitlementsService(
        repo({ grants: [grant({ valueNumeric: 50 })], usage: { grantId: 'grant_1', businessId: 'biz_1', currentUsage: 45, lastUsedAt: NOW } }),
        () => new Date(NOW),
      );

      const result = await service.consume({ tenantId: 'tnt_1', businessId: 'biz_1', entitlementCode: 'searches_monthly', amount: 10 });

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(5);
    });

    it('applies the latest override as the effective limit', async () => {
      const service = new EntitlementsService(
        repo({
          grants: [grant({ valueNumeric: 50 })],
          usage: { grantId: 'grant_1', businessId: 'biz_1', currentUsage: 0, lastUsedAt: NOW },
          overrides: [{ id: 'ov_1', grantId: 'grant_1', overrideValueNumeric: 500, reason: 'promo', authorizedBy: 'u1', createdAt: NOW }],
        }),
        () => new Date(NOW),
      );

      const result = await service.consume({ tenantId: 'tnt_1', businessId: 'biz_1', entitlementCode: 'searches_monthly', amount: 200 });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(500);
    });

    it('throws grant_not_found when there is no active grant', async () => {
      const service = new EntitlementsService(repo(), () => new Date(NOW));

      await expect(
        service.consume({ tenantId: 'tnt_1', businessId: 'biz_1', entitlementCode: 'searches_monthly', amount: 1 }),
      ).rejects.toThrow(EntitlementError);
    });

    it('rejects an invalid amount', async () => {
      const service = new EntitlementsService(repo({ grants: [grant()] }), () => new Date(NOW));

      await expect(
        service.consume({ tenantId: 'tnt_1', businessId: 'biz_1', entitlementCode: 'searches_monthly', amount: -5 }),
      ).rejects.toThrow('non-negative');
    });

    it('rejects consumption on non-consumable grants (revoked)', async () => {
      const service = new EntitlementsService(
        repo({ grants: [grant({ status: 'revoked' })] }),
        () => new Date(NOW),
      );

      await expect(
        service.consume({ tenantId: 'tnt_1', businessId: 'biz_1', entitlementCode: 'searches_monthly', amount: 1 }),
      ).rejects.toThrow('not consumable');
    });
  });
});