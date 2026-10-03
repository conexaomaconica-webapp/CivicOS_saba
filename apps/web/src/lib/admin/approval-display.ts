export function getCommercialPlanName(technicalCode?: string | null): string {
  if (!technicalCode?.trim()) return 'Não informado';
  const code = technicalCode.trim().toLowerCase().replace(/^plano\s+/, '');
  if (code === 'bronze' || code === 'esquadro') return 'Esquadro';
  if (code === 'prata' || code === 'silver' || code === 'compasso') return 'Compasso';
  if (code === 'ouro' || code === 'gold' || code === 'acacia' || code === 'acácia' || code === 'ouro_founder') return 'Acácia';
  return technicalCode.charAt(0).toUpperCase() + technicalCode.slice(1);
}

const ADMIN_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  pending_review: 'Aguardando análise',
  in_review: 'Em análise',
  under_review: 'Em análise',
  ready: 'Pronto para aprovação',
  approved: 'Aprovado',
  published: 'Publicado',
  rejected: 'Rejeitado',
  suspended: 'Suspenso',
  correction_requested: 'Correção solicitada',
  active: 'Ativo',
  paid: 'Pago',
  trialing: 'Período de teste',
  overdue: 'Em atraso',
  past_due: 'Em atraso',
  canceled: 'Cancelado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
  verified: 'Validado',
};

export function getAdminStatusLabel(status?: string | null): string {
  if (!status?.trim()) return 'Não informado';
  const normalized = status.trim().toLowerCase();
  return ADMIN_STATUS_LABELS[normalized] ?? normalized.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
