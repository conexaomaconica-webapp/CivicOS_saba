import { redirect } from 'next/navigation';

export default async function LegacyFinancialPage() {
  redirect('/anunciante/pagamentos');
}
