import Link from 'next/link';
import { Gift, Heart, MessageSquareText, UserRound } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';

export const metadata = { title: 'Minha Conta | Conexão Maçônica' };

export default async function MemberDashboardPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, favorites, benefits, reviews] = await Promise.all([
    (supabase as any).from('profiles').select('name, city, state, phone, avatar_url').eq('id', user!.id).maybeSingle(),
    (supabase as any).from('business_favorites').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    (supabase as any).from('business_benefit_redemptions').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    (supabase as any).from('business_reviews').select('*', { count: 'exact', head: true }).eq('author_id', user!.id).eq('status', 'pending'),
  ]);
  const cards = [{ label: 'Empresas favoritas', value: favorites.count || 0, icon: Heart }, { label: 'Benefícios resgatados', value: benefits.count || 0, icon: Gift }, { label: 'Avaliações em moderação', value: reviews.count || 0, icon: MessageSquareText }];
  const incomplete = !profile?.name || !profile?.city || !profile?.state || !profile?.phone;
  return <div className="space-y-7"><div><p className="text-sm text-stone-500">Área do Membro</p><h1 className="font-serif text-3xl font-bold text-[#4B161B]">Olá, {profile?.name?.split(' ')[0] || 'Membro'}</h1></div>{incomplete && <Link href="/minha-conta/perfil" className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><UserRound className="h-5 w-5" /><span><strong>Complete seu perfil</strong><br />Adicione telefone, cidade, UF e foto.</span></Link>}<div className="grid gap-4 sm:grid-cols-3">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"><Icon className="h-5 w-5 text-[#C9A227]" /><p className="mt-4 text-3xl font-black text-stone-900">{value}</p><p className="text-sm text-stone-500">{label}</p></div>)}</div><div className="grid gap-4 sm:grid-cols-2"><Link href="/minha-conta/beneficios" className="rounded-2xl border border-stone-200 bg-white p-6 hover:border-[#C9A227]"><h2 className="font-serif font-bold text-[#4B161B]">Meus benefícios</h2><p className="mt-1 text-sm text-stone-500">Consulte códigos, validade e histórico.</p></Link><Link href="/minha-conta/perfil" className="rounded-2xl border border-stone-200 bg-white p-6 hover:border-[#C9A227]"><h2 className="font-serif font-bold text-[#4B161B]">Meu perfil</h2><p className="mt-1 text-sm text-stone-500">Gerencie seus dados e sua foto.</p></Link></div></div>;
}
