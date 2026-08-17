import React from 'react';
import type { Metadata } from 'next';
import { ShellWrapper } from '@/components/shell/ShellWrapper';

export const metadata: Metadata = {
  title: 'Administração',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellWrapper>{children}</ShellWrapper>;
}
