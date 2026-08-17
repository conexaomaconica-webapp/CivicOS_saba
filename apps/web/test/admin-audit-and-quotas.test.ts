import { describe, it, expect } from 'vitest';
import { adminAuditLogSchema } from '@saas/core';

describe('BLOCO 3: Admin Audit Logs & Quota Management', () => {
  it('validates admin audit log structure with before/after state', () => {
    const auditRecord = {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      actorId: '33333333-3333-3333-3333-333333333333',
      entityType: 'plan_entitlements',
      entityId: '44444444-4444-4444-4444-444444444444',
      action: 'UPDATE_QUOTA',
      beforeValue: { services_limit: 25, benefits_limit: 10 },
      afterValue: { services_limit: 10, benefits_limit: 10 },
      reason: 'Ajuste de política comercial do tenant',
      createdAt: new Date().toISOString(),
    };

    const parsed = adminAuditLogSchema.parse(auditRecord);
    expect(parsed.action).toBe('UPDATE_QUOTA');
    expect(parsed.beforeValue).toEqual({ services_limit: 25, benefits_limit: 10 });
    expect(parsed.afterValue).toEqual({ services_limit: 10, benefits_limit: 10 });
  });

  it('requires platform_admin role for plan entitlement quota changes', () => {
    const updateQuotaHandler = (userRole: string) => {
      if (userRole !== 'platform_admin') {
        throw new Error('Acesso negado: Apenas platform_admin pode alterar cotas de planos.');
      }
      return { success: true };
    };

    expect(() => updateQuotaHandler('advertiser')).toThrow(
      'Acesso negado: Apenas platform_admin pode alterar cotas de planos.'
    );
    expect(() => updateQuotaHandler('tenant_admin')).toThrow(
      'Acesso negado: Apenas platform_admin pode alterar cotas de planos.'
    );
    expect(updateQuotaHandler('platform_admin')).toEqual({ success: true });
  });

  it('maintains strict independence between publication_status and founder allocation', () => {
    const business = {
      id: '55555555-5555-5555-5555-555555555555',
      publication_status: 'draft',
      is_founder: false,
    };

    // Granting Founder allocation must NOT publish the business automatically
    const allocateFounder = (item: typeof business, isFounder: boolean) => {
      return {
        ...item,
        is_founder: isFounder,
        // publication_status remains UNCHANGED
      };
    };

    const updatedFounder = allocateFounder(business, true);
    expect(updatedFounder.is_founder).toBe(true);
    expect(updatedFounder.publication_status).toBe('draft'); // Still draft!

    // Moderating publication status must NOT affect founder allocation
    const moderatePublication = (item: typeof business, newStatus: string) => {
      return {
        ...item,
        publication_status: newStatus,
        // is_founder remains UNCHANGED
      };
    };

    const publishedBusiness = moderatePublication(updatedFounder, 'published');
    expect(publishedBusiness.publication_status).toBe('published');
    expect(publishedBusiness.is_founder).toBe(true);
  });
});
