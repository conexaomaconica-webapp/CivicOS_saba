import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserContractAction } from '@/lib/advertiser/advertiser-contract-service';
import AdvertiserContractClient from './contract-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Meu Contrato Digital · Portal do Anunciante | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdvertiserContractPage() {
  const supabase = await createServerSideClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect('/login?redirect=%2Fanunciante%2Fcontrato');

  const dto = await getAdvertiserContractAction();
  return <AdvertiserContractClient data={dto} />;
}
