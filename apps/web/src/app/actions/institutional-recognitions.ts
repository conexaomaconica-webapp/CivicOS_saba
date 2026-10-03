'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';

export interface InstitutionalRecognitionDTO {
  id: string;
  key: 'pedra_fundamental' | 'selo_ouro' | 'selo_prata' | 'selo_bronze';
  title: string;
  description: string;
  tooltip?: string;
  seal_url: string;
  compact_seal_url: string;
  sealUrl?: string;
  compactSealUrl?: string;
  header_display: 'badge' | 'horizontal_seal';
  header_scale?: number;
  card_display?: 'circular_seal' | 'horizontal_seal' | 'badge_text';
  priority_order: number;
  is_active: boolean;
  max_quota?: number;
  updated_at: string;
}

const DEFAULT_RECOGNITIONS: InstitutionalRecognitionDTO[] = [
  {
    id: 'rec_pedra_fundamental',
    key: 'pedra_fundamental',
    title: 'Pedra Fundamental',
    description: 'Condecoração histórica destinada às empresas fundadoras da Conexão Maçônica.',
    tooltip: 'Condecoração de fundador, independente do plano comercial e sem natureza de benefício ou entitlement.',
    seal_url: '/selos/pedra-fundamental.svg',
    compact_seal_url: '/selos/pedra-fundamental-compact.svg',
    sealUrl: '/selos/pedra-fundamental.svg',
    compactSealUrl: '/selos/pedra-fundamental-compact.svg',
    header_display: 'badge',
    header_scale: 100,
    card_display: 'circular_seal',
    priority_order: 1,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_ouro',
    key: 'selo_ouro',
    title: 'Selo Acácia',
    description: 'Reconhecimento e presença comercial de máxima distinção para empresas do Plano Acácia.',
    tooltip: 'Concedido a todos os anunciantes ativos no Plano Acácia.',
    seal_url: '/selos/plano-ouro.svg',
    compact_seal_url: '/selos/plano-ouro-compact.svg',
    sealUrl: '/selos/plano-ouro.svg',
    compactSealUrl: '/selos/plano-ouro-compact.svg',
    header_display: 'badge',
    priority_order: 2,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_prata',
    key: 'selo_prata',
    title: 'Selo Compasso',
    description: 'Identificação comercial das empresas ativas no Plano Compasso.',
    tooltip: 'Exibido para anunciantes ativos no Plano Compasso.',
    seal_url: '/selos/plano-prata.svg',
    compact_seal_url: '/selos/plano-prata.svg',
    sealUrl: '/selos/plano-prata.svg',
    compactSealUrl: '/selos/plano-prata.svg',
    header_display: 'badge',
    priority_order: 3,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_bronze',
    key: 'selo_bronze',
    title: 'Selo Esquadro',
    description: 'Identificação comercial das empresas ativas no Plano Esquadro.',
    tooltip: 'Exibido para anunciantes ativos no Plano Esquadro.',
    seal_url: '/selos/plano-bronze.svg',
    compact_seal_url: '/selos/plano-bronze.svg',
    sealUrl: '/selos/plano-bronze.svg',
    compactSealUrl: '/selos/plano-bronze.svg',
    header_display: 'badge',
    priority_order: 4,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
];

export async function getInstitutionalRecognitionsAction() {
  try {
    const supabase = await createServerSideClient();

    const { data: dbRows, error } = await (supabase as any)
      .from('institutional_recognitions')
      .select('*')
      .in('key', ['pedra_fundamental', 'selo_ouro', 'selo_prata', 'selo_bronze'])
      .order('priority_order', { ascending: true });

    if (error || !dbRows || dbRows.length === 0) {
      return { success: true, data: DEFAULT_RECOGNITIONS };
    }

    let homeSections: any[] = [];
    try {
      const { data: homeSettings } = await (supabase as any)
        .from('directory_home_settings')
        .select('sections_config')
        .maybeSingle();
      if (homeSettings?.sections_config && Array.isArray(homeSettings.sections_config)) {
        homeSections = homeSettings.sections_config;
      }
    } catch {}

    const merged = DEFAULT_RECOGNITIONS.map((defItem) => {
      const dbItem = dbRows.find((r: any) => r.key === defItem.key);
      const pedraFallback = defItem.key === 'pedra_fundamental'
        ? homeSections.find((s: any) => s.id === 'pedra_fundamental')?.card_display
        : undefined;

      if (!dbItem) {
        return {
          ...defItem,
          card_display: pedraFallback || defItem.card_display || 'circular_seal',
        };
      }

      const sealUrl = dbItem.seal_url || dbItem.sealUrl || defItem.seal_url;
      const compactSealUrl = dbItem.compact_seal_url || dbItem.compactSealUrl || defItem.compact_seal_url;
      return {
        ...defItem,
        ...dbItem,
        title: dbItem.title || defItem.title,
        description: dbItem.description || defItem.description,
        tooltip: dbItem.tooltip || defItem.tooltip,
        seal_url: sealUrl,
        compact_seal_url: compactSealUrl,
        sealUrl: sealUrl,
        compactSealUrl: compactSealUrl,
        header_display: dbItem.header_display === 'horizontal_seal' ? 'horizontal_seal' : 'badge',
        header_scale: typeof dbItem.header_scale === 'number' ? dbItem.header_scale : (defItem.header_scale || 100),
        card_display: dbItem.card_display || pedraFallback || defItem.card_display || 'circular_seal',
        priority_order: typeof dbItem.priority_order === 'number' ? dbItem.priority_order : defItem.priority_order,
        is_active: typeof dbItem.is_active === 'boolean' ? dbItem.is_active : defItem.is_active,
      };
    });

    return { success: true, data: merged };
  } catch (_e) {
    return { success: true, data: DEFAULT_RECOGNITIONS };
  }
}

export async function uploadRecognitionSealAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }
    const file = formData.get('file') as File | null;
    const sealType = (formData.get('sealType') as string) || 'seal';

    if (!file) {
      return { success: false, error: 'Nenhum arquivo de imagem foi enviado.' };
    }

    // Validação estrita de tamanho (máximo 2 MB)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, error: 'Tamanho de arquivo excedido. O limite máximo é 2 MB.' };
    }

    // Validação estrita de extensão e MIME type (SVG, PNG, WebP)
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['svg', 'png', 'webp'];
    const allowedMimeTypes = ['image/svg+xml', 'image/png', 'image/webp'];

    if (!allowedExts.includes(fileExt)) {
      return { success: false, error: `Extensão .${fileExt} não permitida. Utilize apenas .svg, .png ou .webp.` };
    }

    if (file.type && !allowedMimeTypes.includes(file.type)) {
      return { success: false, error: `Tipo de arquivo ${file.type} inválido. Utilize apenas imagens SVG, PNG ou WebP.` };
    }

    const cleanType = sealType.replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `seal-${cleanType}-${Date.now()}.${fileExt}`;
    const filePath = `recognitions/${fileName}`;
    const contentType = file.type || (fileExt === 'svg' ? 'image/svg+xml' : fileExt === 'webp' ? 'image/webp' : 'image/png');

    // Upload exclusivo para o Supabase Storage (business-assets)
    const { error: uploadErr } = await supabase.storage
      .from('business-assets')
      .upload(filePath, file, { upsert: true, contentType });

    if (uploadErr) {
      console.error('[uploadRecognitionSealAction] Storage Error:', uploadErr.message);
      return {
        success: false,
        error: `Falha no upload para o Supabase Storage: ${uploadErr.message}. O selo atual foi preservado.`,
      };
    }

    const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath);
    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha no processamento do upload do selo.' };
  }
}

export async function updateInstitutionalRecognitionAction(input: InstitutionalRecognitionDTO) {
  try {
    const supabase = await createServerSideClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const sealUrl = input.seal_url || input.sealUrl || '';
    const compactSealUrl = input.compact_seal_url || input.compactSealUrl || '';
    const cardDisplay = input.card_display || 'circular_seal';

    const dbPayload: any = {
      id: input.id,
      key: input.key,
      title: input.title,
      description: input.description,
      tooltip: input.tooltip || null,
      seal_url: sealUrl,
      compact_seal_url: compactSealUrl,
      header_display: input.header_display === 'horizontal_seal' ? 'horizontal_seal' : 'badge',
      header_scale: typeof input.header_scale === 'number' ? input.header_scale : 100,
      card_display: cardDisplay,
      priority_order: typeof input.priority_order === 'number' ? input.priority_order : 1,
      is_active: typeof input.is_active === 'boolean' ? input.is_active : true,
      updated_at: new Date().toISOString(),
    };

    const stripUnsupportedColumns = (payload: any, err?: any) => {
      const p = { ...payload };
      if (err?.code === 'PGRST204' || err?.message?.includes('header_scale')) {
        delete p.header_scale;
      }
      if (err?.code === 'PGRST204' || err?.message?.includes('card_display')) {
        delete p.card_display;
      }
      return p;
    };

    // 1. Tentar upsert nativo por 'key'
    const { error: upsertErr } = await (supabase as any)
      .from('institutional_recognitions')
      .upsert(dbPayload, { onConflict: 'key' });

    let saveErr = upsertErr;

    // 2. Se upsert nativo falhar por ausência de colunas no PostgREST schema (PGRST204), tentar sem elas
    if (saveErr && (saveErr.code === 'PGRST204' || saveErr.message?.includes('header_scale') || saveErr.message?.includes('card_display'))) {
      const fallbackPayload = stripUnsupportedColumns(dbPayload, saveErr);
      const { error: retryErr } = await (supabase as any)
        .from('institutional_recognitions')
        .upsert(fallbackPayload, { onConflict: 'key' });
      saveErr = retryErr;
    }

    // 3. Se ainda houver erro, tentar update/insert por id como fallback
    if (saveErr) {
      const { data: existingRow } = await (supabase as any)
        .from('institutional_recognitions')
        .select('id')
        .eq('key', input.key)
        .maybeSingle();

      if (existingRow) {
        const { error: updateErr } = await (supabase as any)
          .from('institutional_recognitions')
          .update(dbPayload)
          .eq('id', existingRow.id);
        saveErr = updateErr;

        if (saveErr && (saveErr.code === 'PGRST204' || saveErr.message?.includes('header_scale') || saveErr.message?.includes('card_display'))) {
          const fallbackPayload = stripUnsupportedColumns(dbPayload, saveErr);
          const { error: retryUpdateErr } = await (supabase as any)
            .from('institutional_recognitions')
            .update(fallbackPayload)
            .eq('id', existingRow.id);
          saveErr = retryUpdateErr;
        }
      } else {
        const { error: insertErr } = await (supabase as any)
          .from('institutional_recognitions')
          .insert(dbPayload);
        saveErr = insertErr;

        if (saveErr && (saveErr.code === 'PGRST204' || saveErr.message?.includes('header_scale') || saveErr.message?.includes('card_display'))) {
          const fallbackPayload = stripUnsupportedColumns(dbPayload, saveErr);
          const { error: retryInsertErr } = await (supabase as any)
            .from('institutional_recognitions')
            .insert(fallbackPayload);
          saveErr = retryInsertErr;
        }
      }
    }

    if (saveErr) {
      console.error('[updateInstitutionalRecognitionAction] DB Error:', saveErr.message);
      return {
        success: false,
        error: `Falha no Supabase (${saveErr.code || 'DB'}): ${saveErr.message}`,
      };
    }

    const returnPayload: InstitutionalRecognitionDTO = {
      ...input,
      seal_url: sealUrl,
      compact_seal_url: compactSealUrl,
      sealUrl,
      compactSealUrl,
      updated_at: dbPayload.updated_at,
    };

    // Gravar log de auditoria
    try {
      await (supabase as any).from('admin_audit_logs').insert({
        actor_id: userRes.user.id,
        action: 'UPDATE_INSTITUTIONAL_RECOGNITION',
        entity_type: 'institutional_recognitions',
        entity_id: input.id,
        after_value: { key: input.key, title: input.title, is_active: input.is_active, seal_url: sealUrl, card_display: cardDisplay },
      });
    } catch {
      // Log opcional
    }

    // Persistência secundária resiliente em directory_home_settings caso a tabela ainda não tenha a coluna
    if (input.key === 'pedra_fundamental') {
      try {
        const { data: homeSettings } = await (supabase as any)
          .from('directory_home_settings')
          .select('id, sections_config')
          .maybeSingle();

        if (homeSettings?.id) {
          const currentSections: any[] = Array.isArray(homeSettings.sections_config)
            ? [...homeSettings.sections_config]
            : [];
          const idx = currentSections.findIndex((s) => s.id === 'pedra_fundamental');
          if (idx >= 0) {
            currentSections[idx] = { ...currentSections[idx], card_display: cardDisplay };
          } else {
            currentSections.push({ id: 'pedra_fundamental', card_display: cardDisplay });
          }

          await (supabase as any)
            .from('directory_home_settings')
            .update({ sections_config: currentSections, updated_at: new Date().toISOString() })
            .eq('id', homeSettings.id);
        }
      } catch {}
    }

    revalidatePath('/admin/reconhecimentos');
    revalidatePath('/guia', 'layout');

    return { success: true, data: returnPayload };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar reconhecimento.' };
  }
}

export async function getPedraFundamentalQuotaAction(): Promise<{ quota: number; allocated: number }> {
  try {
    const supabase = await createServerSideClient();

    const { count: allocatedCount } = await (supabase as any)
      .from('business_recognitions')
      .select('id', { count: 'exact', head: true })
      .eq('recognition_key', 'pedra_fundamental')
      .eq('is_active', true);

    const { data: homeSettings } = await (supabase as any)
      .from('directory_home_settings')
      .select('sections_config')
      .limit(1)
      .maybeSingle();

    let quota = 50;
    if (homeSettings && Array.isArray(homeSettings.sections_config)) {
      const cfg = homeSettings.sections_config.find((s: any) => s.id === 'pedra_fundamental');
      if (cfg && typeof cfg.max_quota === 'number' && cfg.max_quota > 0) {
        quota = cfg.max_quota;
      }
    }

    return { quota, allocated: allocatedCount || 0 };
  } catch {
    return { quota: 50, allocated: 0 };
  }
}

export async function updatePedraFundamentalQuotaAction(
  newQuota: number
): Promise<{ success: boolean; quota?: number; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    if (!newQuota || newQuota < 1 || newQuota > 1000) {
      return { success: false, error: 'A cota deve ser um número entre 1 e 1000.' };
    }

    const { data: homeSettings } = await (supabase as any)
      .from('directory_home_settings')
      .select('id, sections_config')
      .limit(1)
      .maybeSingle();

    if (homeSettings) {
      const currentSections: any[] = Array.isArray(homeSettings.sections_config) ? [...homeSettings.sections_config] : [];
      const idx = currentSections.findIndex((s) => s.id === 'pedra_fundamental');
      if (idx >= 0) {
        currentSections[idx] = { ...currentSections[idx], max_quota: newQuota };
      } else {
        currentSections.push({ id: 'pedra_fundamental', max_quota: newQuota });
      }

      await (supabase as any)
        .from('directory_home_settings')
        .update({ sections_config: currentSections, updated_at: new Date().toISOString() })
        .eq('id', homeSettings.id);
    }

    try {
      await (supabase as any).from('admin_audit_logs').insert({
        actor_id: userRes.user.id,
        action: 'UPDATE_PEDRA_FUNDAMENTAL_QUOTA',
        entity_type: 'institutional_recognitions',
        entity_id: 'pedra_fundamental',
        after_value: { max_quota: newQuota },
        reason: `Cota máxima da Pedra Fundamental ajustada para ${newQuota} empresas.`,
      });
    } catch {}

    revalidatePath('/admin');
    revalidatePath('/admin/reconhecimentos');
    revalidatePath('/admin/empresas/nova');
    revalidatePath('/admin/empresas');

    return { success: true, quota: newQuota };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar cota da Pedra Fundamental.' };
  }
}

/**
 * Consulta de alta velocidade da preferência ativa de exibição da Pedra Fundamental nos cards do Guia.
 */
export async function getPedraFundamentalCardDisplayAction(): Promise<'circular_seal' | 'horizontal_seal' | 'badge_text'> {
  try {
    const res = await getInstitutionalRecognitionsAction();
    if (res.success && res.data) {
      const pedra = res.data.find((r) => r.key === 'pedra_fundamental');
      if (pedra?.card_display) {
        return pedra.card_display;
      }
    }
    return 'circular_seal';
  } catch {
    return 'circular_seal';
  }
}

export async function getPedraFundamentalCardConfigAction(): Promise<{
  display: 'circular_seal' | 'horizontal_seal' | 'badge_text';
  horizontalSealUrl: string;
}> {
  const fallback = {
    display: 'circular_seal' as const,
    horizontalSealUrl: '/selos/pedra-fundamental.svg',
  };

  try {
    const res = await getInstitutionalRecognitionsAction();
    const pedra = res.data?.find((recognition) => recognition.key === 'pedra_fundamental');
    if (!pedra) return fallback;

    return {
      display: pedra.card_display || fallback.display,
      horizontalSealUrl:
        pedra.compactSealUrl
        || pedra.compact_seal_url
        || pedra.sealUrl
        || pedra.seal_url
        || fallback.horizontalSealUrl,
    };
  } catch {
    return fallback;
  }
}

