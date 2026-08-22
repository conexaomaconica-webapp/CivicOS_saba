'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Building2,
  Hand,
  Heart,
  ShoppingBasket,
  Store,
  Utensils,
  ChevronRight,
  Tag,
  Star,
  Award,
  ShieldCheck,
  Compass,
  Landmark,
  Phone,
  Car,
  Home,
  Scale,
  Stethoscope,
  Wrench,
  Palette,
  Globe,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  hand: Hand,
  building: Building2,
  heart: Heart,
  briefcase: Briefcase,
  store: Store,
  shopping: ShoppingBasket,
  tag: Tag,
  star: Star,
  award: Award,
  shield: ShieldCheck,
  compass: Compass,
  landmark: Landmark,
  phone: Phone,
  car: Car,
  home: Home,
  scale: Scale,
  juridico: Scale,
  stethoscope: Stethoscope,
  saude: Stethoscope,
  wrench: Wrench,
  servicos: Wrench,
  palette: Palette,
  globe: Globe,
  sparkles: Sparkles,
};

export type DirectoryCategoryItem = {
  id: string;
  slug: string;
  name: string;
  icon_name?: string | null;
};

type DirectoryCategoriesProps = {
  categories?: DirectoryCategoryItem[];
  onCategorySelect?: (slug: string) => void;
};

export function DirectoryCategories({ categories = [], onCategorySelect }: DirectoryCategoriesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!categories.length) return null;

  const handleCategoryClick = (catSlug: string) => {
    if (onCategorySelect) {
      onCategorySelect(catSlug);
      return;
    }
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('cat', catSlug);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}#todas`);
  };

  return (
    <section className="dh-container my-8">
      {/* Botão 'Ver todas' alinhado à direita */}
      <div className="flex justify-end mb-4">
        <Link
          href="/guia#todas"
          className="text-xs font-bold text-amber-900 flex items-center gap-1 hover:underline bg-white/60 px-3 py-1.5 rounded-full border border-amber-900/10 shadow-2xs"
        >
          <span>Ver todas</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid de Categorias Centralizadas */}
      <div className="dh-categories-grid">
        {categories.map((cat) => {
          const rawIcon = (cat.icon_name || '').toLowerCase().trim();
          // Dynamic icon resolution with elegant fallback if icon is not mapped or missing
          const IconComp = ICON_MAP[rawIcon] || Briefcase;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.slug)}
              className="dh-category-card"
              title={`Filtrar por ${cat.name}`}
            >
              <div className="dh-category-card__icon">
                <IconComp className="w-5 h-5" />
              </div>
              <span className="dh-category-card__name">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
