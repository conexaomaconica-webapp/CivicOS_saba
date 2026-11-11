import {
  authenticateMobileRequest,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
} from '@/lib/mobile/mobile-api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return mobileCorsOptionsResponse();
}

export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (!auth.ok) {
    return mobileJsonResponse({ success: false, error: auth.error }, auth.status);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJsonResponse({ success: false, error: 'JSON inválido.' }, 400);
  }

  const mode = typeof body?.mode === 'string' ? body.mode : 'sync';
  const db = auth.ctx.userClient as any;
  const host = auth.ctx.host;

  if (mode === 'sync') {
    const rawSlugs = Array.isArray(body?.slugs) ? body.slugs : [];
    const slugs = rawSlugs.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    const { data, error } = await db.rpc('sync_my_favorites', {
      p_host: host,
      p_slugs: slugs,
    });
    if (error) {
      return mobileJsonResponse({ success: false, error: 'Não foi possível sincronizar seus favoritos.' }, 400);
    }
    return mobileJsonResponse({
      success: true,
      slugs: Array.isArray(data) ? data : slugs,
    });
  }

  if (mode === 'toggle') {
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const favorite = Boolean(body?.favorite);
    if (!slug) {
      return mobileJsonResponse({ success: false, error: 'Empresa inválida.' }, 400);
    }
    const { error } = await db.rpc('set_my_favorite', {
      p_host: host,
      p_slug: slug,
      p_favorite: favorite,
    });
    if (error) {
      return mobileJsonResponse({ success: false, error: 'Não foi possível atualizar favorito.' }, 400);
    }
    return mobileJsonResponse({ success: true });
  }

  if (mode === 'clear') {
    const { error } = await db.rpc('clear_my_favorites', { p_host: host });
    if (error) {
      return mobileJsonResponse({ success: false, error: 'Não foi possível limpar favoritos.' }, 400);
    }
    return mobileJsonResponse({ success: true, slugs: [] });
  }

  return mobileJsonResponse({ success: false, error: 'Ação inválida.' }, 400);
}

