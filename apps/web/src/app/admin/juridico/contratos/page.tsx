import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';
import ContractsManagementClient from './contracts-management-client';
import { loadManagedDocumentsAction } from '@/lib/contracts/legal-document-management-service';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';

export const metadata = {
  title: 'Admin · Modelos de Contratos & Jurídico — Conexão Maçônica',
};

export default async function AdminJuridicoContratosPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fadmin%2Fjuridico%2Fcontratos');
  }

  const profile = await getProfileAuthorization(supabase, user.id);

  const role = profile?.role || user.user_metadata?.role;
  if (!isPlatformAdminRole(role)) {
    redirect('/anunciante');
  }

  const { tipo } = await searchParams;
  const initialDocType = tipo === 'termos' ? 'termos' : tipo === 'privacidade' ? 'privacidade' : 'anunciante';
  const result = await loadManagedDocumentsAction();
  return <ContractsManagementClient initialDocType={initialDocType} initialDocuments={result.documents} />;
}
