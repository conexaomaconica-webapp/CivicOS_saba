import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { listAdminBusinessCategoriesAction } from '@/lib/admin/admin-businesses-service';
import { getSignupInviteForReviewAction } from '@/lib/onboarding/signup-invite-service';
import ReviewClient from './review-client';

export const metadata: Metadata = { title: 'Conferir cadastro enviado', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewSignupInvitePage({ params }: PageProps) {
  const { id } = await params;
  const [{ tenantId }, result] = await Promise.all([resolveCanonicalAdminTenant(), getSignupInviteForReviewAction(id)]);
  if (!result.success || !result.invite) notFound();
  const categories = await listAdminBusinessCategoriesAction(tenantId);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-b border-stone-300 pb-4">
        <Link href="/admin/empresas/convites" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#3B0B14]">
          <ArrowLeft className="h-4 w-4" /> Voltar para convites
        </Link>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Conferir cadastro enviado</h1>
        <p className="mt-1 text-sm text-stone-600">
          Confira e corrija os dados do cliente. Ao criar o cadastro, a empresa fica em rascunho com o vínculo maçônico
          pendente; o contrato e o pagamento seguem o fluxo normal da contratação.
        </p>
      </div>
      <ReviewClient
        tenantId={tenantId}
        invite={result.invite}
        categories={categories.categories}
      />
    </main>
  );
}
