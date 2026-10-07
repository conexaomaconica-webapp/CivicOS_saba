import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { DirectorySeoPage } from '@/components/public/directory/DirectorySeoPage';
import { StructuredData } from '@/components/seo/StructuredData';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { appUrl } from '@/lib/seo/app-url';
import { categoryPath, cityPath, findCategory, findCity, isCategoryIndexable } from '@/lib/seo/directory-seo';
import { getDirectoryIndex } from '@/lib/seo/directory-seo-server';
import '@/styles/directory-home.css';

type Props = { params: Promise<{ slug: string; cidade: string; categoria: string }> };

async function resolve(params: Props['params']) {
  const { slug, cidade, categoria } = await params;
  const city = findCity(await getDirectoryIndex(), slug, cidade);
  const group = city ? findCategory(city, categoria) : null;
  return city && group ? { city, group } : null;
}

function companies(count: number) {
  return count === 1 ? '1 empresa' : `${count} empresas`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return { title: 'Página não encontrada', robots: { index: false, follow: false } };
  const { city, group } = found;

  const place = `${city.cityName} - ${city.uf}`;
  const title = `${group.name} em ${place} | Conexão Maçônica`;
  const description = `${companies(group.businesses.length)} de ${group.name.toLowerCase()} em ${place} na comunidade maçônica. Veja serviços, contatos e localização.`;
  const canonical = appUrl(categoryPath(city, group.slug));
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: isCategoryIndexable(group) ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'Conexão Maçônica', locale: 'pt_BR' },
  };
}

export default async function CategoryDirectoryPage({ params }: Props) {
  const found = await resolve(params);
  if (!found) notFound();
  const { city, group } = found;

  const place = `${city.cityName} - ${city.uf}`;
  const intro = `Há ${companies(group.businesses.length)} de ${group.name.toLowerCase()} em ${place} no Conexão Maçônica. Abra a página de cada uma para ver serviços, localização, horário e contatos.`;

  const crumbs = [
    { name: 'Início', href: '/' },
    { name: 'Guia', href: '/guia' },
    { name: city.stateName },
    { name: city.cityName, href: cityPath(city) },
    { name: group.name },
  ];
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: appUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Guia', item: appUrl('/guia') },
      { '@type': 'ListItem', position: 3, name: city.stateName },
      { '@type': 'ListItem', position: 4, name: city.cityName, item: appUrl(cityPath(city)) },
      { '@type': 'ListItem', position: 5, name: group.name, item: appUrl(categoryPath(city, group.slug)) },
    ],
  };
  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${group.name} em ${place}`,
    url: appUrl(categoryPath(city, group.slug)),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: group.businesses.slice(0, 50).map((b, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: b.name,
        url: appUrl(`/guia/${b.slug}`),
      })),
    },
  };

  const otherCategories = city.categories.filter((c) => c.slug !== group.slug);

  return (
    <FavoritesProvider>
      <StructuredData schema={breadcrumbSchema} />
      <StructuredData schema={listSchema} />
      <DirectoryHeader selectedCity={city.cityName} availableCities={[city.cityName]} />
      <DirectorySeoPage
        crumbs={crumbs}
        title={`${group.name} em ${place}`}
        intro={intro}
        businesses={group.businesses}
        relatedTitle={`Outras categorias em ${city.cityName}`}
        related={[
          { href: cityPath(city), label: `Todas as empresas em ${city.cityName}` },
          ...otherCategories.map((c) => ({ href: categoryPath(city, c.slug), label: `${c.name} (${c.businesses.length})` })),
        ]}
      />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}
