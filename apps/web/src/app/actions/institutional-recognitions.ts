'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';

export interface InstitutionalRecognitionDTO {
  id: string;
  key: 'pedra_fundamental' | 'coluna_de_honra' | 'selo_ouro';
  title: string;
  description: string;
  tooltip?: string;
  seal_url: string;
  compact_seal_url: string;
  sealUrl?: string;
  compactSealUrl?: string;
  priority_order: number;
  is_active: boolean;
  updated_at: string;
}

const DEFAULT_RECOGNITIONS: InstitutionalRecognitionDTO[] = [
  {
    id: 'rec_pedra_fundamental',
    key: 'pedra_fundamental',
    title: 'Selo Pedra Fundamental (10/10)',
    description: 'Reconhecimento histórico/institucional permanente dos 10 primeiros apoiadores da rede Conexão Maçônica.',
    tooltip: 'Concedido exclusivamente aos 10 primeiros apoiadores históricos da plataforma. Não é um plano nem entitlement de upgrade.',
    seal_url: '/selos/pedra-fundamental.svg',
    compact_seal_url: '/selos/pedra-fundamental-compact.svg',
    sealUrl: '/selos/pedra-fundamental.svg',
    compactSealUrl: '/selos/pedra-fundamental-compact.svg',
    priority_order: 1,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_coluna_de_honra',
    key: 'coluna_de_honra',
    title: 'Coluna de Honra (Empresa Fundadora)',
    description: 'Membro fundador e destaque de mérito e contribuição exemplar na fraternidade.',
    tooltip: 'Reconhecimento institucional aos membros fundadores da comunidade.',
    seal_url: '/selos/coluna-honra.svg',
    compact_seal_url: '/selos/coluna-honra-compact.svg',
    sealUrl: '/selos/coluna-honra.svg',
    compactSealUrl: '/selos/coluna-honra-compact.svg',
    priority_order: 2,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_selo_ouro',
    key: 'selo_ouro',
    title: 'Selo Anunciante Ouro',
    description: 'Reconhecimento e presença comercial de máxima distinção para empresas do Plano Ouro.',
    tooltip: 'Concedido a todos os anunciantes ativos no Plano Ouro.',
    seal_url: '/selos/plano-ouro.svg',
    compact_seal_url: '/selos/plano-ouro-compact.svg',
    sealUrl: '/selos/plano-ouro.svg',
    compactSealUrl: '/selos/plano-ouro-compact.svg',
    priority_order: 3,
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
      .in('key', ['pedra_fundamental', 'coluna_de_honra', 'selo_ouro'])
      .order('priority_order', { ascending: true });

    if (error || !dbRows || dbRows.length === 0) {
      return { success: true, data: DEFAULT_RECOGNITIONS };
    }

    const merged = DEFAULT_RECOGNITIONS.map((defItem) => {
      const dbItem = dbRows.find((r: any) => r.key === defItem.key);
      if (!dbItem) return defItem;
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
    const compactSealUrl = input.compact_seal_url || input.compactSealUrl || sealUrl;

    const dbPayload = {
      id: input.id,
      key: input.key,
      title: input.title,
      description: input.description,
      tooltip: input.tooltip || null,
      seal_url: sealUrl,
      compact_seal_url: compactSealUrl,
      priority_order: typeof input.priority_order === 'number' ? input.priority_order : 1,
      is_active: typeof input.is_active === 'boolean' ? input.is_active : true,
      updated_at: new Date().toISOString(),
    };

    // 1. Tentar upsert nativo por 'key'
    const { error: upsertErr } = await (supabase as any)
      .from('institutional_recognitions')
      .upsert(dbPayload, { onConflict: 'key' });

    let saveErr = upsertErr;

    // 2. Se upsert nativo falhar, tentar update/insert por id como fallback
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
      } else {
        const { error: insertErr } = await (supabase as any)
          .from('institutional_recognitions')
          .insert(dbPayload);
        saveErr = insertErr;
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
        after_value: { key: input.key, title: input.title, is_active: input.is_active, seal_url: sealUrl },
      });
    } catch {
      // Log opcional
    }

    revalidatePath('/admin/reconhecimentos');
    revalidatePath('/guia', 'layout');

    return { success: true, data: returnPayload };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar reconhecimento.' };
  }
}
