import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { BronzeBusinessProfile } from './layouts/BronzeBusinessProfile';
import { SilverBusinessProfile } from './layouts/SilverBusinessProfile';
import { GoldBusinessProfile } from './layouts/GoldBusinessProfile';

type BusinessProfileRendererProps = {
  business: PublicBusinessPresentation;
};

/**
 * BusinessProfileRenderer
 * 
 * Dispatcher central que recebe o objeto de apresentação canônica `PublicBusinessPresentation`
 * e seleciona o layout apropriado (`BronzeBusinessProfile`, `SilverBusinessProfile` ou `GoldBusinessProfile`)
 * com base estritamente em `business.plan.template` pré-resolvido na camada de presentation.
 */
export function BusinessProfileRenderer({ business }: BusinessProfileRendererProps) {
  // Fail closed: empresa sem plano público ativo ou sem apresentação válida
  if (!business || !business.plan || !business.plan.template) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md mx-auto p-8 border border-stone-800 rounded-2xl bg-stone-900 shadow-xl space-y-3">
          <h2 className="text-xl font-serif font-bold text-stone-100">Perfil Indisponível</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            Esta empresa não possui uma assinatura de plano público ativa no momento.
          </p>
        </div>
      </div>
    );
  }

  // Switch de layout por template pré-resolvido na presentation layer
  switch (business.plan.template) {
    case 'ouro':
      return <GoldBusinessProfile profile={business} />;
    case 'prata':
      return <SilverBusinessProfile profile={business} />;
    case 'bronze':
    default:
      return <BronzeBusinessProfile profile={business} />;
  }
}

