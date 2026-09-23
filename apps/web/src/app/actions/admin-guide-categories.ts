'use server';

import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import type { Database } from '@/types/database.types';

export type AdminGuideCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  tenant_id: string | null;
};

export async function listAdminGuideCategoriesAction(): Promise<{
  success: boolean;
  categories: AdminGuideCategory[];
  error?: string;
}> {
  try {
    await assertPlatformAdminAccess();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, categories: [], error: 'Configuração segura do Supabase indisponível.' };
    }

    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await adminClient
      .from('categories')
      .select('id, name, slug, icon, is_active, tenant_id')
      .is('tenant_id', null)
      .order('display_order')
      .order('name');

    if (error) return { success: false, categories: [], error: error.message };
    return { success: true, categories: data ?? [] };
  } catch (error) {
    return {
      success: false,
      categories: [],
      error: error instanceof Error ? error.message : 'Não foi possível carregar o catálogo de categorias.',
    };
  }
}

export async function setAdminGuideCategoryStatusAction(
  categoryId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertPlatformAdminAccess();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId)) {
      return { success: false, error: 'Categoria inválida.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Configuração segura do Supabase indisponível.' };
    }

    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await adminClient
      .from('categories')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', categoryId)
      .is('tenant_id', null)
      .select('id')
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Categoria global não encontrada.' };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Não foi possível alterar o status.' };
  }
}

type UpdateAdminGuideCategoryInput = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  isActive: boolean;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createCategoryAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function updateAdminGuideCategoryAction(
  input: UpdateAdminGuideCategoryInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertPlatformAdminAccess();
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();
    if (!isUuid(input.id)) return { success: false, error: 'Categoria inválida.' };
    if (name.length < 2 || name.length > 100) return { success: false, error: 'Informe um nome entre 2 e 100 caracteres.' };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { success: false, error: 'O slug deve conter apenas letras minúsculas, números e hífens.' };
    if (input.icon && !/^[a-z0-9-]{1,50}$/.test(input.icon)) return { success: false, error: 'Ícone inválido.' };

    const adminClient = createCategoryAdminClient();
    if (!adminClient) return { success: false, error: 'Configuração segura do Supabase indisponível.' };
    const { data, error } = await adminClient
      .from('categories')
      .update({ name, slug, icon: input.icon, is_active: input.isActive, updated_at: new Date().toISOString() })
      .eq('id', input.id)
      .is('tenant_id', null)
      .select('id')
      .maybeSingle();
    if (error) return { success: false, error: error.code === '23505' ? 'Já existe uma categoria com esse slug.' : error.message };
    if (!data) return { success: false, error: 'Categoria global não encontrada.' };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Não foi possível editar a categoria.' };
  }
}

export async function deleteAdminGuideCategoryAction(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await assertPlatformAdminAccess();
    if (!isUuid(categoryId)) return { success: false, error: 'Categoria inválida.' };
    const adminClient = createCategoryAdminClient();
    if (!adminClient) return { success: false, error: 'Configuração segura do Supabase indisponível.' };

    const [{ count: businessLinks, error: linksError }, { count: childCategories, error: childrenError }] = await Promise.all([
      adminClient.from('business_categories').select('category_id', { count: 'exact', head: true }).eq('category_id', categoryId),
      adminClient.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', categoryId),
    ]);
    if (linksError) return { success: false, error: linksError.message };
    if (childrenError) return { success: false, error: childrenError.message };
    if ((businessLinks || 0) > 0) {
      return { success: false, error: 'Esta categoria está vinculada a empresas. Migre esses vínculos antes de excluí-la.' };
    }
    if ((childCategories || 0) > 0) {
      return { success: false, error: 'Esta categoria possui subcategorias. Reorganize-as antes de excluir.' };
    }

    const { data, error } = await adminClient
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .is('tenant_id', null)
      .select('id')
      .maybeSingle();
    if (error) {
      const linked = error.code === '23503';
      return { success: false, error: linked ? 'Esta categoria possui vínculos e não pode ser excluída. Remova ou migre os vínculos primeiro.' : error.message };
    }
    if (!data) return { success: false, error: 'Categoria global não encontrada.' };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Não foi possível excluir a categoria.' };
  }
}
