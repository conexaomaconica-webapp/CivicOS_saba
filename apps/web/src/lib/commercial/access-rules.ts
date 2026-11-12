/**
 * Regras puras de acesso do Módulo Comercial (sem I/O), espelhando as funções SQL da migration 234.
 * Mantidas em um módulo à parte para serem testáveis e para a interface decidir o que exibir.
 * A autorização DEFINITIVA é sempre a do banco (RLS) e a dos serviços de backend.
 */

/** Permissões comerciais específicas (espelham o CHECK de commercial_access_grants na migration 228). */
export const COMMERCIAL_PERMISSIONS = [
  'representatives.read',
  'representatives.manage',
  'leads.manage',
  'attributions.manage',
  'rules.manage',
  'rules.approve',
  'commissions.read',
  'commissions.approve',
  'payouts.manage',
  'documents.read',
  'settings.manage',
  'audit.read',
] as const;

export type CommercialPermission = (typeof COMMERCIAL_PERMISSIONS)[number];

export type RepresentativeStatus = 'invited' | 'pending_review' | 'active' | 'suspended' | 'terminated';

/**
 * Escopos de acesso do representante:
 *  - self: o próprio cadastro (qualquer status);
 *  - operational: leads, evidências e documentos (somente ATIVO);
 *  - financial: atribuições, créditos, liberações e repasses (ativo, suspenso e desligado: histórico preservado).
 */
export type RepresentativeScope = 'self' | 'operational' | 'financial';

export function representativeScopeAllows(status: RepresentativeStatus, scope: RepresentativeScope): boolean {
  if (scope === 'self') return true;
  if (scope === 'operational') return status === 'active';
  return status === 'active' || status === 'suspended' || status === 'terminated';
}

export const REPRESENTATIVE_STATUS_LABEL: Record<RepresentativeStatus, string> = {
  invited: 'Convidado',
  pending_review: 'Em análise',
  active: 'Ativo',
  suspended: 'Suspenso',
  terminated: 'Desligado',
};

export const LEDGER_ENTRY_LABEL: Record<string, string> = {
  accrual: 'Comissão',
  reversal: 'Estorno',
  adjustment: 'Ajuste',
  payout: 'Repasse',
  payout_reversal: 'Estorno de repasse',
};

/** Centavos (inteiro) para moeda brasileira, sem usar ponto flutuante nos cálculos. */
export function formatCentsBRL(cents: number | string | bigint | null | undefined): string {
  if (cents === null || cents === undefined || cents === '') return 'R$ 0,00';
  const value = typeof cents === 'bigint' ? cents : BigInt(Math.trunc(Number(cents)));
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const reais = (abs / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = (abs % BigInt(100)).toString().padStart(2, '0');
  return `${negative ? '-' : ''}R$ ${reais},${centavos}`;
}

/** Permissões "virtuais" de leitura, atendidas por permissões de gestão (espelha has_commercial_permission, migration 234). */
export type CommercialPermissionNeed = CommercialPermission | 'rules.read';

export function permissionSatisfies(granted: readonly string[], needed: CommercialPermissionNeed): boolean {
  if (granted.includes(needed)) return true;
  if (needed === 'representatives.read') return granted.includes('representatives.manage');
  if (needed === 'commissions.read') return granted.includes('commissions.approve') || granted.includes('payouts.manage');
  if (needed === 'rules.read') return granted.includes('rules.manage') || granted.includes('rules.approve');
  return false;
}
