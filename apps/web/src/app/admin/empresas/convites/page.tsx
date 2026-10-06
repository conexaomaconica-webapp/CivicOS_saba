import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listSignupInvitesAction } from '@/lib/onboarding/signup-invite-service';
import { isEmailConfigured } from '@/lib/email/send-email';
import InvitesClient from './invites-client';

export const metadata: Metadata = { title: 'Convites de cadastro', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SignupInvitesPage() {
  const result = await listSignupInvitesAction();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="border-b border-stone-300 pb-4">
        <Link href="/admin/empresas" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#3B0B14]">
          <ArrowLeft className="h-4 w-4" /> Voltar para empresas
        </Link>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Convites de cadastro</h1>
        <p className="mt-1 text-sm text-stone-600">
          Envie um link para o cliente preencher os dados da empresa. Você confere tudo antes de criar o cadastro; contrato e
          pagamento só avançam depois da conferência. O cadastro manual continua disponível em Nova empresa.
        </p>
      </div>
      {result.error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{result.error}</p>}
      <InvitesClient initialItems={result.items} emailConfigured={isEmailConfigured()} />
    </main>
  );
}
