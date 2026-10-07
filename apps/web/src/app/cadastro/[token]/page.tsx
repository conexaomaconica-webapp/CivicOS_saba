import type { Metadata } from 'next';
import { getSignupInviteByTokenAction } from '@/lib/onboarding/signup-invite-service';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { resolvePortalTheme } from '@/lib/tenant/portal-theme';
import { InviteBrandHeader } from '@/components/onboarding/InviteBrandHeader';
import SignupInviteForm from './signup-invite-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Cadastro da empresa | Conexão Maçônica' },
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

type BrandProps = { logoSrc: string | null; brandName: string; primaryColor: string };

function Notice({ title, text, brand }: { title: string; text: string; brand: BrandProps }) {
  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <InviteBrandHeader {...brand} />
      <div className="mx-auto flex max-w-lg items-center justify-center p-6 pt-12">
        <div className="space-y-2 rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-xl font-bold text-stone-900">{title}</h1>
          <p className="text-sm text-stone-600">{text}</p>
        </div>
      </div>
    </main>
  );
}

export default async function SignupInvitePage({ params }: PageProps) {
  const { token } = await params;
  const invite = await getSignupInviteByTokenAction(token);

  // Identidade do tenant: logomarca e cor primária (ou a oficial da Conexão, sobre a cor padrão).
  const tenant = await resolveTenantBrandContext().catch(() => null);
  const brandName = tenant?.appName || 'Conexão Maçônica';
  const theme = resolvePortalTheme({ name: brandName, logoUrl: tenant?.logoUrl ?? null, primaryColor: tenant?.primaryColor ?? null });
  const brand: BrandProps = { logoSrc: theme.logo, brandName, primaryColor: theme.primary };

  if (invite.state === 'invalid') {
    return <Notice brand={brand} title="Link inválido" text="Este link de cadastro não existe ou foi cancelado. Peça um novo link à equipe da Conexão Maçônica." />;
  }
  if (invite.state === 'expired') {
    return <Notice brand={brand} title="Link expirado" text="O prazo deste link terminou. Peça um novo link à equipe da Conexão Maçônica." />;
  }
  if (invite.state === 'submitted') {
    return <Notice brand={brand} title="Cadastro já enviado" text="Recebemos os dados desta empresa. A equipe vai conferir as informações e entrará em contato para os próximos passos." />;
  }

  return (
    <SignupInviteForm
      token={token}
      invitedName={invite.invitedName}
      invitedEmail={invite.invitedEmail}
      categories={invite.categories ?? []}
      brandName={brand.brandName}
      primaryColor={brand.primaryColor}
      logoSrc={brand.logoSrc}
    />
  );
}
