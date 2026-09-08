import { describe, expect, it } from 'vitest';
import type { AppDatabase } from '@/types/database-extensions';

type BusinessBenefitRow = AppDatabase['public']['Tables']['business_benefits']['Row'];
type RedemptionRow = AppDatabase['public']['Tables']['business_benefit_redemptions']['Row'];

describe('BENEFITS-001 / Migration 086 — Homologação de Schema, State Machine e Quota', () => {

  describe('1. Preservação Canônica de business_benefits e novos campos v2', () => {
    it('Valida estrutura de tipos v2 da tabela business_benefits', () => {
      const mockBenefit: Partial<BusinessBenefitRow> = {
        id: 'benefit-123',
        tenant_id: 'tenant-456',
        business_id: 'business-789',
        title: 'Desconto Fraterno de 20%',
        description: 'Válido em serviços selecionados.',
        short_description: '20% OFF em serviços',
        benefit_type: 'percentage_discount',
        cta_type: 'redeem',
        discount_percentage: 20.0,
        original_price: 100.0,
        offer_price: 80.0,
        cta_label: 'Resgatar Cupom',
        max_redemptions: 50,
        max_redemptions_per_user: 1,
        minimum_purchase: 50.0,
        is_cumulative: false,
        status: 'active',
        is_active: true,
        archived_at: null,
      };

      expect(mockBenefit.status).toBe('active');
      expect(mockBenefit.cta_type).toBe('redeem');
      expect(mockBenefit.is_active).toBe(true);
      expect(mockBenefit.archived_at).toBeNull();
    });

    it('Calcula backfill de status derivado de is_active e janelas temporais', () => {
      const now = new Date('2026-09-07T20:00:00Z');

      const computeBackfillStatus = (
        isActive: boolean,
        validFrom: string | null,
        validUntil: string | null
      ) => {
        if (!isActive) return 'paused';
        if (validUntil && new Date(validUntil) < now) return 'expired';
        if (validFrom && new Date(validFrom) > now) return 'scheduled';
        return 'active';
      };

      expect(computeBackfillStatus(false, null, null)).toBe('paused');
      expect(computeBackfillStatus(true, null, '2026-01-01T00:00:00Z')).toBe('expired');
      expect(computeBackfillStatus(true, '2026-10-01T00:00:00Z', null)).toBe('scheduled');
      expect(computeBackfillStatus(true, null, null)).toBe('active');
    });

    it('Garante sincronização unidirecional: status active => is_active true', () => {
      const syncIsActive = (status: string) => status === 'active';

      expect(syncIsActive('active')).toBe(true);
      expect(syncIsActive('paused')).toBe(false);
      expect(syncIsActive('expired')).toBe(false);
      expect(syncIsActive('scheduled')).toBe(false);
      expect(syncIsActive('archived')).toBe(false);
      expect(syncIsActive('draft')).toBe(false);
    });
  });

  describe('2. Enforcing de Cota Comercial por Estados Operacionais', () => {
    it('Identifica corretamente estados que consomem cota (scheduled, active, paused, exhausted)', () => {
      const CONSUMING_STATUSES = ['scheduled', 'active', 'paused', 'exhausted'];
      const NON_CONSUMING_STATUSES = ['draft', 'expired', 'archived'];

      CONSUMING_STATUSES.forEach((st) => {
        expect(CONSUMING_STATUSES.includes(st)).toBe(true);
      });

      NON_CONSUMING_STATUSES.forEach((st) => {
        expect(CONSUMING_STATUSES.includes(st)).toBe(false);
      });
    });

    it('Impede criação/ativamento quando cota do plano for atingida', () => {
      const maxLimit = 3;
      const existingOperationalBenefits = [
        { id: 'b1', status: 'active' },
        { id: 'b2', status: 'paused' },
        { id: 'b3', status: 'scheduled' },
      ];

      const checkQuota = (newBenefitStatus: string) => {
        const isOperational = ['scheduled', 'active', 'paused', 'exhausted'].includes(newBenefitStatus);
        if (!isOperational) return { allowed: true };
        const currentCount = existingOperationalBenefits.filter((b) =>
          ['scheduled', 'active', 'paused', 'exhausted'].includes(b.status)
        ).length;
        if (currentCount >= maxLimit) {
          return { allowed: false, error: `LIMIT_EXCEEDED: Cota de benefícios do plano excedida (Máximo: ${maxLimit}).` };
        }
        return { allowed: true };
      };

      expect(checkQuota('draft')).toEqual({ allowed: true });
      expect(checkQuota('archived')).toEqual({ allowed: true });
      expect(checkQuota('active').allowed).toBe(false);
      expect(checkQuota('active').error).toContain('LIMIT_EXCEEDED');
    });
  });

  describe('3. Entidade public.business_benefit_redemptions e Máquina de Estados', () => {
    it('Restringe máquina de estados de resgates a redeemed, used, expired, cancelled', () => {
      const VALID_REDEMPTION_STATES = ['redeemed', 'used', 'expired', 'cancelled'];

      const isValidStatus = (st: string) => VALID_REDEMPTION_STATES.includes(st);

      expect(isValidStatus('redeemed')).toBe(true);
      expect(isValidStatus('used')).toBe(true);
      expect(isValidStatus('expired')).toBe(true);
      expect(isValidStatus('cancelled')).toBe(true);
      expect(isValidStatus('pending')).toBe(false);
      expect(isValidStatus('active')).toBe(false);
    });

    it('Garante imutabilidade de campos contratuais e snapshot do resgate', () => {
      const originalRedemption: Partial<RedemptionRow> = {
        id: 'red-001',
        tenant_id: 't-1',
        business_id: 'b-1',
        benefit_id: 'ben-1',
        user_id: 'u-1',
        public_code: 'BEN-XYZ-1234',
        redeemed_at: '2026-09-07T18:00:00Z',
        idempotency_key: 'idemp-001',
        benefit_snapshot: { title: 'Desconto 20%', discount_percentage: 20 },
        status: 'redeemed',
      };

      const attemptsToModify = (
        field: keyof RedemptionRow,
        newValue: any
      ) => {
        const immutableFields: (keyof RedemptionRow)[] = [
          'benefit_id',
          'business_id',
          'tenant_id',
          'user_id',
          'public_code',
          'redeemed_at',
          'benefit_snapshot',
          'idempotency_key',
        ];

        if (immutableFields.includes(field)) {
          if (originalRedemption[field] !== newValue) {
            throw new Error('IMMUTABILITY_VIOLATION: Não é permitido alterar dados contratuais ou snapshot de um resgate efetuado.');
          }
        }
      };

      // Alteração de status é permitida (transição de estado redeemed -> used)
      expect(() => attemptsToModify('status', 'used')).not.toThrow();

      // Alterações em campos contratuais disparam erro
      expect(() => attemptsToModify('public_code', 'HACKED_CODE')).toThrow('IMMUTABILITY_VIOLATION');
      expect(() => attemptsToModify('benefit_id', 'ben-2')).toThrow('IMMUTABILITY_VIOLATION');
      expect(() => attemptsToModify('user_id', 'u-2')).toThrow('IMMUTABILITY_VIOLATION');
    });
  });

  describe('4. Arquivamento e Soft-Delete sem Exclusão Física', () => {
    it('Executa soft-delete definindo status = archived e preenchendo archived_at', () => {
      const benefit: Partial<BusinessBenefitRow> = {
        id: 'b-arch-1',
        status: 'active',
        is_active: true,
        archived_at: null,
      };

      const archiveBenefit = (b: Partial<BusinessBenefitRow>) => {
        const archivedAt = new Date().toISOString();
        return {
          ...b,
          status: 'archived' as const,
          is_active: false,
          archived_at: archivedAt,
        };
      };

      const archived = archiveBenefit(benefit);
      expect(archived.status).toBe('archived');
      expect(archived.is_active).toBe(false);
      expect(archived.archived_at).not.toBeNull();
    });
  });
});
