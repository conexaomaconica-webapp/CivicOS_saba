import { redirect } from 'next/navigation';

export default async function LegacyPostsPage() {
  redirect('/anunciante/conteudo/posts');
}
