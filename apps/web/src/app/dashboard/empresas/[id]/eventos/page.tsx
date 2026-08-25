import { redirect } from 'next/navigation';

export default async function LegacyEventsPage() {
  redirect('/anunciante/conteudo/eventos');
}
