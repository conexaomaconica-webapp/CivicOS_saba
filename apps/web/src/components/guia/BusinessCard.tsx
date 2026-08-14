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
};

const tierOf = (tier: string | null): 'ouro' | 'prata' | 'outro' => {
  if (tier === 'ouro') return 'ouro';
  if (tier === 'prata') return 'prata';
  return 'outro';
};

export function BusinessCard({
  business,
  categoryName,
  featured = false,
  effectivePlan,
  verified = false,
}: BusinessCardProps) {
  const tier = tierOf(effectivePlan?.effectiveTier ?? null);
  const isOuro = tier === 'ouro';
  const isPrata = tier === 'prata';
  const isFeatured =
    effectivePlan != null &&
    (featured || hasBusinessEntitlement(effectivePlan, 'featured_listing'));
  const href = `/guia/${business.slug ?? business.id}`;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border bg-secondary shadow-sm transition-all ${
        isOuro ? 'border-highlight' : 'border-default'
      }`}
    >
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
        {verified && (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[0.65rem] font-bold text-white"
            title="Vínculo maçônico verificado com consentimento de publicação"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            VERIFICADO
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {categoryName && (
          <span className="text-xs font-bold uppercase tracking-wide text-highlight-active">
            {categoryName}
          </span>
        )}
        <h3 className="text-lg font-bold text-primary">{business.name}</h3>
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
          {isOuro ? 'Ver anúncio premium' : 'Ver detalhes'}
        </Link>
      </div>
    </article>
  );
}
