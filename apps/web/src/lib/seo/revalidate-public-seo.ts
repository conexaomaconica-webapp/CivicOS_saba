import { revalidatePath } from 'next/cache';

/**
 * Chamar quando uma empresa é publicada, suspensa, reprovada ou muda de slug: o sitemap e as listagens públicas
 * passam a refletir a mudança na hora (sem esperar a releitura horária). A página da empresa em si é dinâmica.
 */
export function revalidatePublicSeo(slug?: string | null): void {
  try {
    revalidatePath('/sitemap.xml');
    revalidatePath('/guia');
    revalidatePath('/guia/empresas');
    if (slug) revalidatePath(`/guia/${slug}`);
  } catch {
    // Revalidação nunca pode quebrar a ação de negócio (ex.: chamada fora do contexto de requisição).
  }
}
