import { listMyBusinessConnectionsAction } from '@/app/actions/connections';
import { ConnectionsClient } from './connections-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Conexões · Portal do Anunciante',
  robots: { index: false, follow: false },
};

export default async function AdvertiserConnectionsPage() {
  const result = await listMyBusinessConnectionsAction();
  return (
    <ConnectionsClient
      initialItems={result.items}
      metrics={result.metrics}
      businessName={result.businessName || null}
      loadError={result.success ? null : result.error || 'Não foi possível carregar as conexões.'}
    />
  );
}
