import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import MemberProfileForm from './member-profile-form';

export const metadata = { title: 'Meu Perfil | Conexão Maçônica' };

export default async function MemberProfilePage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fminha-conta%2Fperfil');
  const { data: profile } = await (supabase as any).from('profiles').select('name, email, phone, city, state, avatar_url').eq('id', user.id).maybeSingle();
  return <div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm text-stone-500">Minha Conta</p><h1 className="font-serif text-3xl font-bold text-[#4B161B]">Meu perfil</h1><p className="mt-1 text-sm text-stone-600">Gerencie seus dados pessoais. Eles não são publicados sem uma finalidade e autorização específicas.</p></div><MemberProfileForm profile={{ name: profile?.name || user.user_metadata?.name || '', email: user.email || profile?.email || '', phone: profile?.phone || '', city: profile?.city || '', state: profile?.state || '', avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null }} /></div>;
}
