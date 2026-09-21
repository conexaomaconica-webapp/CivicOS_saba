export function displayOptionalText(
  value: string | null | undefined,
  fallback = 'Não informado',
): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}
