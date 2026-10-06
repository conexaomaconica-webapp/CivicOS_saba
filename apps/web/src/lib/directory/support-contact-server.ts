import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import { DEFAULT_SUPPORT_WHATSAPP, parseSupportContact, type SupportContact } from '@/lib/directory/support-contact';

/**
 * Contato de suporte do tenant do domínio acessado (botão flutuante). Qualquer falha de leitura devolve o contato padrão:
 * o botão nunca pode quebrar uma página pública.
 */
export const getPublicSupportContact = cache(async (): Promise<SupportContact> => {
  const fallback: SupportContact = { whatsapp: DEFAULT_SUPPORT_WHATSAPP, email: '' };
  try {
    const host = (await headers()).get('host') ?? 'localhost:3000';
    const supabase = await createServerSideClient();
    const { data: tenantId } = await (supabase as any).rpc('_resolve_public_tenant_id', { p_host: host });
    if (!tenantId) return fallback;
    const { data } = await (supabase as any)
      .from('directory_home_settings')
      .select('sections_config')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return parseSupportContact(data?.sections_config);
  } catch {
    return fallback;
  }
});
