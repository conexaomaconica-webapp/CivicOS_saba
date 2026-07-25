import { PluginRouteRenderer } from '@/components/presentation/PluginRouteRenderer';

interface DynamicPluginPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function DynamicPluginPage({
  params,
}: DynamicPluginPageProps) {
  const { slug } = await params;
  const pathname = `/${slug.join("/")}`;

  return <PluginRouteRenderer pathname={pathname} />;
}
