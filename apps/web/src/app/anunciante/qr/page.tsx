import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { CompanyQrClient } from './company-qr-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'QR Code da empresa · Portal do Anunciante',
  robots: { index: false, follow: false },
};

export default async function AdvertiserQrPage() {
  const supabase = await createServerSideClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('name, slug')
    .eq('owner_id', userRes.user.id)
    .maybeSingle();

  if (!business || !business.slug) {
    return <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">Empresa não localizada.</p>;
  }

  return <CompanyQrClient name={business.name} slug={business.slug} />;
}
