import Link from 'next/link';
import { MapPin, ShieldCheck, Star } from 'lucide-react';
import type { EffectiveBusinessPlan } from '@/lib/business/effective-business-plan';
import { hasBusinessEntitlement } from '@/lib/business/effective-business-plan';

export interface GuiaBusiness {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  description: string | null;
  address: string | null;
  plan_tier: string | null;
}

type BusinessCardProps = {
  business: GuiaBusiness;
  categoryName?: string;
  featured?: boolean;
  effectivePlan?: EffectiveBusinessPlan;
  /** LGPD: selo só quando há vínculo ativo + consentimento de publicação vigente. */
  verified?: boolean;
  isFounder?: boolean;
};

const tierOf = (tier: string | null): 'ouro' | 'prata' | 'bronze' | 'outro' => {
  if (tier === 'ouro') return 'ouro';
  if (tier === 'prata') return 'prata';
  if (tier === 'bronze') return 'bronze';
  return 'outro';
};

export function BusinessCard({
  business,
  categoryName,
  featured = false,
  effectivePlan,
  verified = false,
  isFounder = false,
}: BusinessCardProps) {
  const tier = tierOf(effectivePlan?.effectiveTier ?? business.plan_tier);
  const isOuro = tier === 'ouro';
  const isPrata = tier === 'prata';
  const isBronze = tier === 'bronze';
  const isFeatured =
    effectivePlan != null &&
    (featured || hasBusinessEntitlement(effectivePlan, 'featured_listing'));
  const href = `/guia/${business.slug ?? business.id}`;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border bg-secondary shadow-sm transition-all hover:shadow-md ${
        isOuro ? 'border-highlight' : 'border-default'
      }`}
    >
      <Link href={href} className="block relative group" aria-label={`Ver empresa ${business.name}`}>
        <div
          className={`relative flex items-center justify-center ${
            isFeatured ? 'h-32' : 'h-24'
          } ${
            isOuro
              ? 'bg-[linear-gradient(135deg,var(--color-primary-700),var(--color-primary-500))]'
              : isPrata
                ? 'bg-[linear-gradient(135deg,var(--color-gray-300),var(--color-gray-200))]'
                : 'bg-tertiary'
          }`}
        >
          <span
            className={`text-3xl font-bold ${
              isOuro || isPrata ? 'text-white' : 'text-secondary'
            }`}
            aria-hidden="true"
          >
            {business.name.charAt(0).toUpperCase()}
          </span>

          {isOuro && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-highlight px-2 py-1 text-[0.65rem] font-bold text-gray-900">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              DESTAQUE OURO
            </span>
          )}
          {isPrata && (
            <span className="absolute right-3 top-3 rounded-md border border-default bg-secondary px-2 py-1 text-[0.65rem] font-bold text-primary">
              PLANO PRATA
            </span>
          )}
          {isBronze && (
            <span className="absolute right-3 top-3 rounded-md border border-amber-800/20 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 text-[0.65rem] font-bold text-amber-900 dark:text-amber-300">
              PLANO BRONZE
            </span>
          )}
          {verified && (
            <span
              className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[0.65rem] font-bold text-white"
              title="Vínculo cadastral verificado"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              VERIFICADO
            </span>
          )}
          {isFounder && (
            <span
              className="absolute left-3 bottom-2 inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-0.5 text-[0.6rem] font-bold text-white"
              title="Empresa Fundadora"
            >
              ★ FUNDADORA
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {categoryName && (
          <span className="text-xs font-bold uppercase tracking-wide text-highlight-active">
            {categoryName}
          </span>
        )}
        <h3 className="text-lg font-bold text-primary">
          <Link href={href} className="hover:text-accent transition-colors">
            {business.name}
          </Link>
        </h3>
        {business.description && (
          <p className="line-clamp-2 text-sm text-secondary">
            {business.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-highlight-active" aria-hidden="true" />
          <span className="truncate">
            {business.address
              ? business.address.split(',')[0]
              : 'Endereço não disponível'}
          </span>
        </div>

        <Link
          href={href}
          className={`mt-auto inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
            isOuro
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'border border-accent text-accent hover:bg-accent-subtle'
          }`}
        >
          Ver empresa
        </Link>
      </div>
    </article>
  );
}
