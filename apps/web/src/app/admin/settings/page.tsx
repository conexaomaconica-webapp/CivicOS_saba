import type { Metadata } from 'next';
import { listAdminUsersAction } from '@/lib/admin/admin-users-service';
import SettingsUsersClient from './settings-users-client';

export const metadata: Metadata = {
  title: 'Usuários & Permissões · Admin Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const res = await listAdminUsersAction();

  return (
    <div className="p-4 md:p-6">
      <SettingsUsersClient
        initialUsers={res.users || []}
        currentUserId={res.currentUserId || ''}
        actorRole={res.actorRole || 'member'}
      />
    </div>
  );
}
