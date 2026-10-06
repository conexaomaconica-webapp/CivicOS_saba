import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import ProfileTabs from '@/app/minha-conta/perfil/profile-tabs';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Meus Dados e Senha · Portal do Anunciante | Conexão Maçônica',
  robots: { index: false, follow: false },
};

/**
 * Dados pessoais e senha do operador da conta: o mesmo cadastro (profiles) e as mesmas regras da Área do Membro,
 * sem dados de exemplo. A empresa em si é editada em "Perfil da Empresa".
 */
export default async function AdvertiserAccountPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fanunciante%2Fconta');

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('name, email, phone, city, state, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const providers: string[] = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
  const canChangePassword = providers.length === 0 || providers.includes('email');

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-left">
      <div>
        <p className="text-sm text-stone-500">Minha Conta</p>
        <h1 className="font-serif text-2xl font-bold text-[var(--member-primary,#5d1523)] sm:text-3xl">Meus dados e senha</h1>
        <p className="mt-1 text-sm text-stone-600">
          Dados da pessoa que opera esta conta. Eles não são publicados no Guia. Para alterar os dados da empresa, use{' '}
          <a href="/anunciante/empresa" className="font-bold underline">Perfil da Empresa</a>.
        </p>
      </div>
      <ProfileTabs
        initialTab={aba === 'senha' ? 'senha' : 'dados'}
        canChangePassword={canChangePassword}
        profile={{
          name: profile?.name || user.user_metadata?.name || '',
          email: user.email || profile?.email || '',
          phone: profile?.phone || '',
          city: profile?.city || '',
          state: profile?.state || '',
          avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        }}
      />
    </div>
  );
}
