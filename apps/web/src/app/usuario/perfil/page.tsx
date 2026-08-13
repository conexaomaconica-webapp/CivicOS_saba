import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import ProfileForm from './profile-form';
import CommunityLinks from './community-links';

export const metadata = {
  title: 'Meu Perfil & Segurança',
};

const TAB_STYLE = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-weight-semibold)',
  textDecoration: 'none',
  transition: 'background-color var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)',
  display: 'inline-block',
} as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showVinculos = tab === 'vinculos';

  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fusuario%2Fperfil');
  }

  const {
    data: profile,
  } = await supabase
    .from('profiles')
    .select('name, email, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = typeof metadata.name === 'string' ? metadata.name : '';

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-8) var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>
        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          Meu Perfil
        </h1>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Gerencie seus dados pessoais e a segurança da sua conta.
        </p>

        <nav
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-6)',
            backgroundColor: 'var(--bg-tertiary)',
            padding: 'var(--space-1)',
            borderRadius: 'var(--radius-lg)',
            width: 'fit-content',
          }}
        >
          <a
            href="/usuario/perfil"
            style={{
              ...TAB_STYLE,
              backgroundColor: showVinculos ? 'transparent' : 'var(--bg-primary)',
              color: showVinculos ? 'var(--text-secondary)' : 'var(--text-primary)',
            }}
          >
            Perfil
          </a>
          <a
            href="/usuario/perfil?tab=vinculos"
            style={{
              ...TAB_STYLE,
              backgroundColor: showVinculos ? 'var(--bg-primary)' : 'transparent',
              color: showVinculos ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            Vínculos Comunitários
          </a>
        </nav>

        {showVinculos ? (
          <CommunityLinks />
        ) : (
          <ProfileForm
            user={{
              id: user.id,
              email: user.email ?? '',
              name: profile?.name ?? metadataName ?? '',
            }}
            profile={{
              role: profile?.role ?? 'usuario_comum',
              createdAt: profile?.created_at ?? user.created_at,
            }}
          />
        )}
      </div>
    </main>
  );
}