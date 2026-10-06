'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';

export interface MemberFavoriteItem {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  logo_url: string | null;
  category_name: string | null;
  city: string | null;
  state: string | null;
}

async function currentHost(): Promise<string> {
  return ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
}

/** Favoritos do membro logado, na ordem em que foram salvos (mais recentes primeiro). */
export async function listMyFavoritesAction(): Promise<{ success: boolean; items: MemberFavoriteItem[]; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, items: [], error: 'Sessão expirada. Entre novamente.' };

    const host = await currentHost();
    const { data: slugs, error } = await (supabase as any).rpc('my_favorite_slugs', { p_host: host });
    if (error) return { success: false, items: [], error: 'Não foi possível carregar seus favoritos.' };
    const favoriteSlugs: string[] = Array.isArray(slugs) ? slugs : [];
    if (favoriteSlugs.length === 0) return { success: true, items: [] };

    const { data: search } = await (supabase as any).rpc('public_businesses_search', {
      p_host: host,
      p_slugs: favoriteSlugs,
      p_page: 1,
      p_page_size: Math.max(favoriteSlugs.length, 50),
    });
    const bySlug = new Map<string, any>((search?.items ?? []).map((item: any) => [item.slug, item]));
    const items = favoriteSlugs
      .map((slug) => bySlug.get(slug))
      .filter(Boolean)
      .map((b: any): MemberFavoriteItem => ({
        id: String(b.id),
        slug: String(b.slug),
        name: String(b.name),
        short_description: b.short_description ?? null,
        logo_url: b.logo_url ?? null,
        category_name: b.category_name ?? null,
        city: b.city ?? null,
        state: b.state ?? null,
      }));
    return { success: true, items };
  } catch (err) {
    console.error('[listMyFavoritesAction]', err);
    return { success: false, items: [], error: 'Não foi possível carregar seus favoritos.' };
  }
}

/** Remove um favorito da conta (a lista local do navegador é limpa pelo cliente). */
export async function removeMyFavoriteAction(slug: string): Promise<{ success: boolean }> {
  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };
    const { data, error } = await (supabase as any).rpc('set_my_favorite', {
      p_host: await currentHost(),
      p_slug: slug,
      p_favorite: false,
    });
    revalidatePath('/minha-conta/favoritos');
    revalidatePath('/minha-conta');
    return { success: !error && data === true };
  } catch {
    return { success: false };
  }
}
