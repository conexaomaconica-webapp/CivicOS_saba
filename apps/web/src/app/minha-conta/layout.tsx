import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { getSignedMemberAvatarUrl } from '@/lib/member/member-profile-service';
import MemberShell from './member-shell';

export const metadata = { robots: { index: false, follow: false } };

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fminha-conta');
  const { data: profile } = await (supabase as any).from('profiles').select('name, avatar_url').eq('id', user.id).maybeSingle();
  const brand = await resolveTenantBrandContext();
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    (supabase as any).from('businesses').select('id').eq('owner_id', user.id).limit(1),
    (supabase as any).from('business_members').select('id').eq('user_id', user.id).limit(1),
  ]);
  const avatarUrl = await getSignedMemberAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url, supabase);
  return <MemberShell brand={{ name: brand.appName || 'Conexão Maçônica', logoUrl: brand.logoUrl, primaryColor: brand.primaryColor }} member={{ name: profile?.name || user.user_metadata?.name || 'Membro', avatarUrl, hasBusiness: Boolean(owned?.length || memberships?.length) }}>{children}</MemberShell>;
}

