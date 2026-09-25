import React from 'react';
import type { Metadata } from 'next';
import { CheckinClient } from './check-in-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: _ } = await params;
  return {
    title: 'Check-in · Admin Conexão Maçônica',
    robots: { index: false, follow: false },
  };
}

export default async function CheckinPage({ params }: PageProps) {
  const { id } = await params;
  return <CheckinClient eventId={id} />;
}
