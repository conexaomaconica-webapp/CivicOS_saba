import React from 'react';
import AccountsClient from './accounts-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contas de anunciantes e membros | Admin',
  robots: { index: false, follow: false },
};

/**
 * Contas de anunciantes e membros. O acesso a /admin/* é protegido pelo middleware (perfis administrativos) e CADA ação e a
 * listagem revalidam, no servidor, que quem chama é master ou admin (lib/admin/admin-accounts-service.ts).
 */
export default function AdminAccountsPage() {
  return <AccountsClient />;
}
