export type FilterCategory = { id: string; slug: string; name: string; icon_name?: string | null; business_count?: number };

const collator = new Intl.Collator('pt-BR');

/**
 * Categorias do filtro "Todas as Categorias" do guia: todas as que têm empresa publicada
 * (função public_directory_categories). Se a função ainda não existir no banco ou vier vazia,
 * usa a lista de reserva (as categorias em destaque), para o filtro nunca ficar sem opções.
 */
export async function fetchFilterCategories(
  supabase: any,
  host: string,
  fallback: FilterCategory[] = [],
): Promise<FilterCategory[]> {
  try {
    const { data, error } = await supabase.rpc('public_directory_categories', { p_host: host });
    if (!error && Array.isArray(data) && data.length > 0) {
      return (data as FilterCategory[])
        .filter((category) => category?.slug && category?.name)
        .sort((a, b) => collator.compare(a.name, b.name));
    }
  } catch {}
  return fallback;
}
