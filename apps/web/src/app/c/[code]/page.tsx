import SignupInvitePage from '@/app/cadastro/[token]/page';

// Configuração de rota declarada aqui (o Next não lê `dynamic` quando é apenas reexportado).
export const dynamic = 'force-dynamic';
export const metadata = {
  title: { absolute: 'Cadastro da empresa | Conexão Maçônica' },
  robots: { index: false, follow: false },
};

/**
 * Link curto do convite de cadastro: /c/AB12CD34EF56. Mostra a mesma página de /cadastro/[token]
 * (que continua valendo para os convites antigos, de código longo).
 */
export default async function ShortInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return SignupInvitePage({ params: Promise.resolve({ token: code }) });
}
