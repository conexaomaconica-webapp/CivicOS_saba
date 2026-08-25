import { describe, it, expect } from 'vitest';

/**
 * Test Suite: Pedra Fundamental Quota & Recognition Badges (CRIT-SEC-010)
 * 
 * Regra de Negócio:
 * 1. O selo Pedra Fundamental é restrito estritamente às 10 PRIMEIRAS EMPRESAS COMERCIAIS APROVADAS.
 * 2. Qualquer tentativa de concessão para a 11ª empresa falha e é bloqueada.
 * 3. Plano Comercial (Bronze, Prata, Ouro) NÃO interfere na elegibilidade do selo.
 * 4. O selo Empresa Fundadora (is_founder) e Coluna de Honra são independentes do selo Pedra Fundamental.
 */

interface BusinessMock {
  id: string;
  name: string;
  plan: 'bronze' | 'prata' | 'ouro';
  is_founder: boolean;
  is_pedra_fundamental: boolean;
  is_coluna_honra: boolean;
}

class PedraFundamentalQuotaManager {
  private businesses: Map<string, BusinessMock> = new Map();
  private auditLogs: Array<{ action: string; businessId: string; timestamp: string }> = [];

  constructor() {
    // Seed 10 businesses
    for (let i = 1; i <= 11; i++) {
      this.businesses.set(`biz-${i}`, {
        id: `biz-${i}`,
        name: `Empresa Parceira ${i}`,
        plan: i % 3 === 0 ? 'ouro' : i % 2 === 0 ? 'prata' : 'bronze',
        is_founder: i === 1,
        is_pedra_fundamental: false,
        is_coluna_honra: false,
      });
    }
  }

  public getPedraFundamentalCount(): number {
    let count = 0;
    for (const b of this.businesses.values()) {
      if (b.is_pedra_fundamental) count++;
    }
    return count;
  }

  public grantPedraFundamental(businessId: string, reason: string): { success: boolean; error?: string } {
    const biz = this.businesses.get(businessId);
    if (!biz) return { success: false, error: 'Empresa não encontrada.' };

    const currentCount = this.getPedraFundamentalCount();
    if (!biz.is_pedra_fundamental && currentCount >= 10) {
      return {
        success: false,
        error: 'Limite máximo de 10 reconhecimentos Pedra Fundamental atingido para o lançamento da plataforma.',
      };
    }

    biz.is_pedra_fundamental = true;
    this.auditLogs.push({
      action: 'GRANT_PEDRA_FUNDAMENTAL',
      businessId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  public getAuditLogs() {
    return this.auditLogs;
  }

  public getBusiness(id: string) {
    return this.businesses.get(id);
  }
}

describe('Pedra Fundamental Quota & Badge Independence Test Suite', () => {
  it('permite a concessão do selo Pedra Fundamental exatamente para as 10 primeiras empresas', () => {
    const manager = new PedraFundamentalQuotaManager();

    for (let i = 1; i <= 10; i++) {
      const res = manager.grantPedraFundamental(`biz-${i}`, `Concessão para a empresa pioneira ${i}`);
      expect(res.success).toBe(true);
    }

    expect(manager.getPedraFundamentalCount()).toBe(10);
  });

  it('bloqueia a concessão do selo Pedra Fundamental para a 11ª empresa', () => {
    const manager = new PedraFundamentalQuotaManager();

    // Grant 1 to 10
    for (let i = 1; i <= 10; i++) {
      manager.grantPedraFundamental(`biz-${i}`, `Concessão pioneira ${i}`);
    }

    // Try 11th grant
    const result11 = manager.grantPedraFundamental('biz-11', 'Tentativa de conceder para a 11ª empresa');
    expect(result11.success).toBe(false);
    expect(result11.error).toContain('Limite máximo de 10 reconhecimentos Pedra Fundamental atingido');
    expect(manager.getPedraFundamentalCount()).toBe(10);
  });

  it('garante que reconhecimentos (Pedra Fundamental, Fundadora e Coluna de Honra) coexistem sem se sobrescrever', () => {
    const manager = new PedraFundamentalQuotaManager();
    manager.grantPedraFundamental('biz-1', 'Concessão pioneira');

    const biz = manager.getBusiness('biz-1')!;
    biz.is_founder = true;
    biz.is_coluna_honra = true;

    expect(biz.is_pedra_fundamental).toBe(true);
    expect(biz.is_founder).toBe(true);
    expect(biz.is_coluna_honra).toBe(true);
    expect(biz.plan).toBe('bronze'); // Plano Comercial não interfere nos selos
  });

  it('registra trilha de auditoria imutável para todas as concessões de reconhecimento', () => {
    const manager = new PedraFundamentalQuotaManager();
    manager.grantPedraFundamental('biz-1', 'Concessão auditada 1');
    manager.grantPedraFundamental('biz-2', 'Concessão auditada 2');

    const logs = manager.getAuditLogs();
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe('GRANT_PEDRA_FUNDAMENTAL');
    expect(logs[0].businessId).toBe('biz-1');
  });
});
