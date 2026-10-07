import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { DirectorySeoPage } from '@/components/public/directory/DirectorySeoPage';
import { StructuredData } from '@/components/seo/StructuredData';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { appUrl } from '@/lib/seo/app-url';
import { categoryPath, cityPath, findCity, isCityIndexable } from '@/lib/seo/directory-seo';
import { getDirectoryIndex } from '@/lib/seo/directory-seo-server';
import '@/styles/directory-home.css';

type Props = { params: Promise<{ slug: string; cidade: string }> };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, cidade } = await params;
  const city = findCity(await getDirectoryIndex(), slug, cidade);
  if (!city) return { title: 'Página não encontrada', robots: { index: false, follow: false } };

  const place = `${city.cityName} - ${city.uf}`;
  const title = `Empresas em ${place} | Conexão Maçônica`;
  const description = `Encontre ${plural(city.businesses.length, 'empresa', 'empresas')} da comunidade maçônica em ${place}: serviços, contatos, localização e ofertas no Conexão Maçônica.`;
  const canonical = appUrl(cityPath(city));
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: isCityIndexable(city) ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'Conexão Maçônica', locale: 'pt_BR' },
  };
}

export default async function CityDirectoryPage({ params }: Props) {
  const { slug, cidade } = await params;
  const city = findCity(await getDirectoryIndex(), slug, cidade);
  if (!city) notFound();

  const place = `${city.cityName} - ${city.uf}`;
  const topCategories = city.categories.slice(0, 5).map((c) => c.name.toLowerCase());
  const intro =
    `O Conexão Maçônica reúne ${plural(city.businesses.length, 'empresa publicada', 'empresas publicadas')} em ${place}` +
    (topCategories.length ? `, com destaque para ${topCategories.join(', ')}` : '') +
    '. Cada empresa tem página própria com serviços, localização e formas de contato.';

  const crumbs = [
    { name: 'Início', href: '/' },
    { name: 'Guia', href: '/guia' },
    { name: city.stateName },
    { name: city.cityName },
  ];
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: city.stateName },
      { '@type': 'ListItem', position: 4, name: city.cityName, item: appUrl(cityPath(city)) },
    ],
  };
  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Empresas em ${place}`,
    url: appUrl(cityPath(city)),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: city.businesses.slice(0, 50).map((b, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: b.name,
        url: appUrl(`/guia/${b.slug}`),
      })),
    },
  };

  return (
    <FavoritesProvider>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={listSchema} />
      <DirectoryHeader selectedCity={city.cityName} availableCities={[city.cityName]} />
      <DirectorySeoPage
        crumbs={crumbs}
        title={`Empresas em ${place}`}
        intro={intro}
        businesses={city.businesses}
        relatedTitle="Categorias"
        related={city.categories.map((c) => ({ href: categoryPath(city, c.slug), label: `${c.name} (${c.businesses.length})` }))}
      />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}
