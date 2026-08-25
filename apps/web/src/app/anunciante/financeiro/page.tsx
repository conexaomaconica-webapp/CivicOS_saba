import { redirect } from 'next/navigation';

export default async function RedirectFinanceiroPage() {
  redirect('/anunciante/pagamentos');
}
