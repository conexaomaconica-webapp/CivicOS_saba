import { redirect } from 'next/navigation';

export default async function GuiaEventRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/eventos/${slug}`);
}

