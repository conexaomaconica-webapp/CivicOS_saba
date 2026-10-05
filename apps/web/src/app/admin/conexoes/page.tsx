import { listModerationQueueAction } from '@/app/actions/connections';
import { ConnectionsModerationClient } from './moderation-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mural de Conexões · Moderação · Admin',
  robots: { index: false, follow: false },
};

export default async function AdminConnectionsModerationPage() {
  const [photos, reports] = await Promise.all([
    listModerationQueueAction('fotos_pendentes'),
    listModerationQueueAction('denuncias'),
  ]);

  return (
    <ConnectionsModerationClient
      initialPhotos={photos.items}
      initialReports={reports.items}
      loadError={photos.success && reports.success ? null : photos.error || reports.error || 'Não foi possível carregar a fila.'}
    />
  );
}
