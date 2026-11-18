import { listAdminConnectionsAction } from '@/lib/admin/admin-connections-service';
import { AllConnectionsClient } from './all-connections-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mural de Conexões · Todas as conexões · Admin',
  robots: { index: false, follow: false },
};

export default async function AdminAllConnectionsPage() {
  const result = await listAdminConnectionsAction({ page: 1 });
  return (
    <AllConnectionsClient
      initial={result.success ? result : null}
      loadError={result.success ? null : result.error}
    />
  );
}
