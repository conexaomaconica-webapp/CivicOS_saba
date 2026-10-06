import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { QrLandingClient } from './qr-landing-client';

type Props = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

// Página de entrada do QR físico: rota de ação, não indexável.
export const metadata: Metadata = {
  title: 'Conexão Maçônica · Registrar experiência',
  robots: { index: false, follow: false },
};

export default async function BusinessQrLandingPage({ params }: Props) {
  const { slug } = await params;
  if (!slug || slug.length > 160) notFound();

  const host = ((await headers()).get('host') ?? 'localhost').split(':')[0] || 'localhost';
  const supabase = await createServerSideClient();
  const { data } = await supabase.rpc('public_business_detail', { p_business_slug: slug, p_host: host });
  const detail = Array.isArray(data) ? data[0] : undefined;
  if (!detail) notFound();

  return <QrLandingClient slug={detail.business_slug || slug} name={detail.business_name} />;
}
