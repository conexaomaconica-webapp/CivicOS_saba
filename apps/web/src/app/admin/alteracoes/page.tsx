import { listChangeRequestsForAdminAction } from '@/lib/admin/admin-change-requests-service';
import ChangeRequestsClient from './change-requests-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Alterações dos anunciantes · Admin Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminChangeRequestsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const view = aba === 'decididas' ? 'decided' : 'pending';
  const result = await listChangeRequestsForAdminAction(view);
  return <ChangeRequestsClient view={view} items={result.items} loadError={result.success ? null : result.error ?? 'Erro ao carregar.'} />;
}
