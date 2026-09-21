'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { assertPlatformAdminAccess } from './admin-auth-helper';
import { validateEmail, validateName, validatePassword } from '@/lib/auth/validation';
import { sanitizeCnpj, validateCnpj, validatePhone } from '@/lib/onboarding/onboarding-validation';
import type { Database } from '@/types/database.types';

export interface CreateAdminAdvertiserInput {
  tenantId: string;
  responsibleName: string;
  responsibleEmail: string;
  temporaryPassword: string;
  tradingName: string;
  legalName: string;
  cnpj: string;
  phone: string;
  categoryId: string;
  planCode: string;
}

export interface CreateAdminAdvertiserResult {
  success: boolean;
  businessId?: string;
  temporaryPasswordCreated?: boolean;
  error?: string;
}

export async function createAdminAdvertiserAction(
  input: CreateAdminAdvertiserInput,
): Promise<CreateAdminAdvertiserResult> {
  try {
    const { supabase, user: admin } = await assertPlatformAdminAccess();
    const tenantId = input.tenantId.trim();
    const responsibleName = input.responsibleName.trim();
    const responsibleEmail = input.responsibleEmail.trim().toLowerCase();
    const temporaryPassword = input.temporaryPassword;
    const tradingName = input.tradingName.trim();
    const legalName = input.legalName.trim();
    const cnpj = sanitizeCnpj(input.cnpj);
    const phone = input.phone.trim();
    const categoryId = input.categoryId.trim();
    const planCode = input.planCode.trim().toLowerCase();

    const validationError = validateName(responsibleName)
      ?? validateEmail(responsibleEmail)
      ?? validatePassword(temporaryPassword)
      ?? validateName(tradingName)
      ?? validateName(legalName)
      ?? validateCnpj(cnpj)
      ?? (phone ? validatePhone(phone) : null);
    if (validationError) return { success: false, error: validationError };
    if (!tenantId || !categoryId || !planCode) {
      return { success: false, error: 'Tenant, categoria e plano são obrigatórios.' };
    }

    const [{ data: tenant }, { data: category }, { data: plan }, { data: duplicate }] = await Promise.all([
      (supabase as any).from('tenants').select('id').eq('id', tenantId).maybeSingle(),
      (supabase as any).from('categories').select('id, name').eq('id', categoryId).eq('is_active', true).maybeSingle(),
      (supabase as any).from('plan_payment_rules').select('plan_code').eq('tenant_id', tenantId).eq('plan_code', planCode).maybeSingle(),
      (supabase as any).from('businesses').select('id').eq('tenant_id', tenantId).eq('cnpj', cnpj).maybeSingle(),
    ]);
    if (!tenant) return { success: false, error: 'Tenant inválido.' };
    if (!category) return { success: false, error: 'Categoria inválida ou inativa.' };
    if (!plan) return { success: false, error: 'Plano não disponível para o tenant selecionado.' };
    if (duplicate) return { success: false, error: 'Este CNPJ já está cadastrado neste tenant.' };

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };
    }
    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', responsibleEmail)
      .maybeSingle();

    let ownerId = existingProfile?.id ?? null;
    let temporaryPasswordCreated = false;
    if (!ownerId) {
      const { data: createdAccount, error: accountError } = await adminClient.auth.admin.createUser({
        email: responsibleEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name: responsibleName,
          full_name: responsibleName,
          tenant_id: tenantId,
          role: 'advertiser',
          must_change_password: true,
        },
      });
      if (accountError || !createdAccount.user) {
        return { success: false, error: accountError?.message ?? 'Não foi possível criar a conta do responsável.' };
      }
      ownerId = createdAccount.user.id;
      temporaryPasswordCreated = true;
    }

    const { data: business, error: businessError } = await (adminClient as any)
      .from('businesses')
      .insert({
        tenant_id: tenantId,
        owner_id: ownerId,
        name: tradingName,
        legal_name: legalName,
        cnpj,
        category: category.name,
        phone: phone || null,
        plan_code: planCode,
        plan_tier: planCode,
        publication_status: 'draft',
        is_active: true,
      })
      .select('id')
      .single();
    if (businessError || !business) {
      if (temporaryPasswordCreated && ownerId) await adminClient.auth.admin.deleteUser(ownerId);
      return { success: false, error: businessError?.message ?? 'Não foi possível criar a empresa.' };
    }

    await (adminClient as any).from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: admin.id,
      entity_type: 'business',
      entity_id: business.id,
      action: 'ADMIN_CREATE_ADVERTISER',
      after_value: { responsible_email: responsibleEmail, plan_code: planCode, publication_status: 'draft' },
      reason: 'Cadastro de anunciante realizado pelo administrador.',
    });

    revalidatePath('/admin/empresas');
    revalidatePath('/admin/aprovacoes');
    return { success: true, businessId: business.id, temporaryPasswordCreated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao cadastrar anunciante.' };
  }
}
