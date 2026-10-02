import React from 'react';
import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import { getAsaasDynamicConfig } from '@/lib/payment/asaas-config-service';

export const metadata: Metadata = {
  title: 'Painel Administrativo · Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isSandbox = false;
  try {
    const config = await getAsaasDynamicConfig();
    isSandbox = config.environment === 'sandbox';
  } catch (_err) {
    isSandbox = false;
  }

  return <AdminShell isSandbox={isSandbox}>{children}</AdminShell>;
}
