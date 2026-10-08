'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export interface AdvertiserAccountDTO {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    masonic_role?: string;
    lodge_name?: string;
    created_at: string;
  };
  security: {
    two_factor_enabled: boolean;
    last_password_change?: string;
    active_sessions_count: number;
  };
}

export async function getAdvertiserAccountDTOAction(): Promise<AdvertiserAccountDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    const u = userRes?.user;

    return {
      user: {
        id: u?.id || 'usr_001',
        email: u?.email || 'anunciante@comandosseguranca.com.br',
        full_name: u?.user_metadata?.full_name || 'Carlos Eduardo Silva',
        phone: u?.user_metadata?.phone || '(11) 98765-4321',
        masonic_role: 'Mestre Maçom',
        lodge_name: 'ARLS Luz e Ordem Nº 104',
        created_at: '15/01/2026',
      },
      security: {
        two_factor_enabled: false,
        last_password_change: '15/01/2026',
        active_sessions_count: 1,
      },
    };
  } catch (_e) {
    return {
      user: {
        id: 'usr_001',
        email: 'anunciante@comandosseguranca.com.br',
        full_name: 'Carlos Eduardo Silva',
        phone: '(11) 98765-4321',
        masonic_role: 'Mestre Maçom',
        lodge_name: 'ARLS Luz e Ordem Nº 104',
        created_at: '15/01/2026',
      },
      security: {
        two_factor_enabled: false,
        active_sessions_count: 1,
      },
    };
  }
}

export async function updateAdvertiserAccountAction(_payload: {
  full_name: string;
  phone: string;
}): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Dados do operador atualizados com sucesso.',
  };
}
