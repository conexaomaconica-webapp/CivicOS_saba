import Link from 'next/link';
import Image from 'next/image';
import type { DirectoryBusiness } from '@/lib/seo/directory-seo';

export type Crumb = { name: string; href?: string };

/** Modelo comum das páginas de cidade e de categoria: breadcrumb, H1, texto de abertura, links internos e lista. */
export function DirectorySeoPage({
  crumbs,
  title,
  intro,
  businesses,
  related,
  relatedTitle,
}: {
  crumbs: Crumb[];
  title: string;
  intro: string;
  businesses: DirectoryBusiness[];
  related?: Array<{ href: string; label: string }>;
  relatedTitle?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Você está em" className="text-sm text-stone-600">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((crumb, index) => (
            <li key={crumb.name} className="flex items-center gap-1">
              {index > 0 ? <span aria-hidden>›</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="font-semibold text-[#5d1523] hover:underline">
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current="page">{crumb.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#2a0a10] sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl leading-relaxed text-stone-700">{intro}</p>

      {related && related.length > 0 ? (
        <section className="mt-8" aria-label={relatedTitle}>
          <h2 className="text-lg font-bold text-[#2a0a10]">{relatedTitle}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex rounded-full border border-[#5d1523]/25 bg-white px-4 py-1.5 text-sm font-semibold text-[#5d1523] hover:border-[#5d1523]/60">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10" aria-label="Empresas">
        <h2 className="text-lg font-bold text-[#2a0a10]">Empresas ({businesses.length})</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {businesses.map((business) => (
            <li key={business.slug}>
              <Link
                href={`/guia/${business.slug}`}
                className="flex h-full gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-[#C9A227] hover:shadow-md"
              >
                {business.logoUrl ? (
                  <Image
                    src={business.logoUrl}
                    alt={`Logo de ${business.name}`}
                    width={64}
                    height={64}
                    className="h-16 w-16 flex-none rounded-xl object-contain"
                  />
                ) : null}
                <span className="min-w-0">
                  <span className="block font-bold text-[#2a0a10]">{business.name}</span>
                  {business.category ? <span className="block text-xs font-semibold text-[#8a6d12]">{business.category}</span> : null}
                  {business.description ? (
                    <span className="mt-1 block text-sm leading-snug text-stone-600">{business.description.slice(0, 110)}{business.description.length > 110 ? '…' : ''}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
