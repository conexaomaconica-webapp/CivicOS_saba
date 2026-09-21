export function getCommercialPlanName(technicalCode: string): string {
  const code = technicalCode.toLowerCase();
  if (code === 'bronze') return 'Esquadro';
  if (code === 'prata' || code === 'silver') return 'Compasso';
  if (code === 'ouro' || code === 'gold') return 'Acácia';
  return technicalCode.charAt(0).toUpperCase() + technicalCode.slice(1);
}
