import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getSignedMemberAvatarUrl } from '@/lib/member/member-profile-service';
import ProfileTabs from './profile-tabs';

export const metadata = { title: { absolute: 'Meu Perfil | Conexão Maçônica' } };

export default async function MemberProfilePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fminha-conta%2Fperfil');
  const { data: profile } = await (supabase as any).from('profiles').select('name, email, phone, city, state, avatar_url').eq('id', user.id).maybeSingle();
  const providers: string[] = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
  const canChangePassword = providers.length === 0 || providers.includes('email');
  const avatarUrl = await getSignedMemberAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url, supabase);
  return <div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm text-stone-500">Minha Conta</p><h1 className="font-serif text-3xl font-bold text-[var(--member-primary)]">Meu perfil</h1><p className="mt-1 text-sm text-stone-600">Gerencie seus dados pessoais. Eles não são publicados sem uma finalidade e autorização específicas.</p></div><ProfileTabs initialTab={aba === 'senha' ? 'senha' : 'dados'} canChangePassword={canChangePassword} profile={{ name: profile?.name || user.user_metadata?.name || '', email: user.email || profile?.email || '', phone: profile?.phone || '', city: profile?.city || '', state: profile?.state || '', avatarUrl }} /></div>;
}
