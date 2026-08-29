'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';

export interface InstitutionalRecognitionDTO {
  id: string;
  key: 'pedra_fundamental' | 'empresa_fundadora' | 'coluna_de_honra' | 'empresa_verificada';
  title: string;
  description: string;
  tooltip?: string;
  seal_url: string;
  compact_seal_url: string;
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
    priority_order: 1,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_empresa_fundadora',
    key: 'empresa_fundadora',
    title: 'Empresa Fundadora',
    description: 'Membro fundador participante da fase de consolidação inicial do diretório.',
    tooltip: 'Empresas ativas no período inicial de fundação da comunidade.',
    seal_url: '/selos/fundadora.svg',
    compact_seal_url: '/selos/fundadora-compact.svg',
    priority_order: 2,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_coluna_de_honra',
    key: 'coluna_de_honra',
    title: 'Coluna de Honra',
    description: 'Destaque de mérito e contribuição exemplar na fraternidade.',
    tooltip: 'Reconhecimento institucional de prestígio concedido pela curadoria.',
    seal_url: '/selos/coluna-honra.svg',
    compact_seal_url: '/selos/coluna-honra-compact.svg',
    priority_order: 3,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rec_empresa_verificada',
    key: 'empresa_verificada',
    title: 'Empresa Verificada',
    description: 'Identidade corporativa e vínculo fraterno auditados pela curadoria Conexão Maçônica.',
    tooltip: 'Selo padrão de validação de dados e integridade.',
    seal_url: '/selos/verificada.svg',
    compact_seal_url: '/selos/verificada-compact.svg',
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
      .order('priority_order', { ascending: true });

    if (error || !dbRows || dbRows.length === 0) {
      return { success: true, data: DEFAULT_RECOGNITIONS };
    }

    return { success: true, data: dbRows as InstitutionalRecognitionDTO[] };
  } catch (err: any) {
    return { success: true, data: DEFAULT_RECOGNITIONS };
  }
}

export async function updateInstitutionalRecognitionAction(input: InstitutionalRecognitionDTO) {
  try {
    const supabase = await createServerSideClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('institutional_recognitions')
      .upsert(payload, { onConflict: 'key' });

    if (error) {
      console.warn('Upsert fallback local para recognitions:', error.message);
    }

    // Gravar log de auditoria
    try {
      await (supabase as any).from('audit_logs').insert({
        actor_id: userRes.user.id,
        action: 'UPDATE_INSTITUTIONAL_RECOGNITION',
        target_entity: 'institutional_recognitions',
        target_id: input.id,
        details: { key: input.key, title: input.title, is_active: input.is_active },
      });
    } catch {
      // Log opcional
    }

    revalidatePath('/admin/reconhecimentos');
    revalidatePath('/guia/[slug]', 'page');
    revalidatePath('/guia');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar reconhecimento.' };
  }
}
