import type { Metadata } from 'next';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { listAdminUsersAction } from '@/lib/admin/admin-users-service';
import SettingsUsersClient from './settings-users-client';

export const metadata: Metadata = {
  title: 'Usuários & Permissões · Admin Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const { user } = await assertPlatformAdminAccess();
  const res = await listAdminUsersAction();

  return (
    <div className="p-4 md:p-6">
      <SettingsUsersClient
        initialUsers={res.users || []}
        currentUserId={user.id}
      />
    </div>
  );
}
