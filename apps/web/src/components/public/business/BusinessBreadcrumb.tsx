import Link from 'next/link';
import type { BreadcrumbItem } from '@/lib/seo/business-breadcrumb';

/**
 * Caminho de navegação da página da empresa (Início > Guia > Cidade > Categoria > Empresa). Os mesmos itens vão para o
 * JSON-LD BreadcrumbList da página, então o que o Google lê é o que a pessoa vê. Os links também ligam a empresa às
 * páginas de cidade e de categoria. Discreto de propósito: não altera o desenho do perfil.
 */
export function BusinessBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Você está em" className="mx-auto w-full max-w-6xl px-4 pb-1 pt-3 text-xs text-stone-600 sm:px-6">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden>›</span> : null}
            {item.href ? (
              <Link href={item.href as never} className="font-semibold text-[#5d1523] hover:underline">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-stone-800">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
