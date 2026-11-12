/**
 * Ordenação de serviços da empresa (business_services).
 * Antes, todos os serviços nasciam com display_order = 0 (empate), o que deixava a
 * ordem indefinida no Postgres e fazia a posição mudar ao editar. Aqui a ordem é
 * sempre determinística (display_order, created_at, id) e normalizada em 1..n.
 */

type ServiceOrderRow = { id: string; display_order: number | null; created_at: string | null };

function compareServiceOrder(a: ServiceOrderRow, b: ServiceOrderRow): number {
  const byOrder = (a.display_order ?? 0) - (b.display_order ?? 0);
  if (byOrder !== 0) return byOrder;
  const byCreated = (a.created_at ?? '').localeCompare(b.created_at ?? '');
  if (byCreated !== 0) return byCreated;
  return a.id.localeCompare(b.id);
}

/** Próxima posição ao final da lista da empresa. */
export async function getNextServiceOrder(writer: any, businessId: string): Promise<number> {
  const { data } = await writer
    .from('business_services')
    .select('display_order')
    .eq('business_id', businessId)
    .order('display_order', { ascending: false })
    .limit(1);
  const max = Number(data?.[0]?.display_order ?? 0);
  return (Number.isFinite(max) ? max : 0) + 1;
}

/** Move um serviço uma posição para cima/baixo, normalizando a ordem da empresa. */
export async function moveBusinessService(
  writer: any,
  businessId: string,
  serviceId: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await writer
    .from('business_services')
    .select('id, display_order, created_at')
    .eq('business_id', businessId);
  if (error) return { success: false, error: error.message };

  const rows = ([...(data || [])] as ServiceOrderRow[]).sort(compareServiceOrder);
  const index = rows.findIndex((row) => row.id === serviceId);
  if (index < 0) return { success: false, error: 'Serviço não encontrado.' };

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target >= 0 && target < rows.length) {
    [rows[index], rows[target]] = [rows[target]!, rows[index]!];
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    if (row.display_order === i + 1) continue;
    const { error: updateError } = await writer
      .from('business_services')
      .update({ display_order: i + 1 })
      .eq('id', row.id)
      .eq('business_id', businessId);
    if (updateError) return { success: false, error: updateError.message };
  }
  return { success: true };
}
