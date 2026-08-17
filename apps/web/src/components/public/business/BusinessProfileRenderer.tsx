import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { BusinessBronzeTemplate } from './BusinessBronzeTemplate';
import { BusinessPrataTemplate } from './BusinessPrataTemplate';
import { BusinessOuroTemplate } from './BusinessOuroTemplate';

type BusinessProfileRendererProps = {
  business: PublicBusinessPresentation;
};

/**
 * BusinessProfileRenderer
 * 
 * Componente produtivo que resolve o template visual com base estritamente
 * no `effectivePlan` retornado pelo backend / contratos de autoridade pública.
 * 
 * Regras Comerciais & Guardrails:
 * 1. effectivePlan == null → falha fechado (não renderiza recursos comerciais nem concede Bronze grátis).
 * 2. effectivePlan == 'bronze' → renderiza variante Bronze.
 * 3. effectivePlan == 'prata' → renderiza variante Prata.
 * 4. effectivePlan == 'ouro' → renderiza variante Ouro (com destaque especial de isFounder se ativo).
 * 5. Empresa Fundadora (isFounder) e Empresa Verificada (isVerified) são selos independentes de autoridade.
 */
export function BusinessProfileRenderer({ business }: BusinessProfileRendererProps) {
  const { effectivePlan } = business.authority;

  // Fail closed: empresa sem plano efetivo ativo não concede template público comercial.
  if (!effectivePlan) {
    return (
      <div className="cm-bronze-page text-center py-16">
        <div className="max-w-md mx-auto p-8 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Perfil Indisponível</h2>
          <p className="text-sm text-gray-600">
            Esta empresa não possui uma assinatura de plano público ativa no momento.
          </p>
        </div>
      </div>
    );
  }

  // Switch de template por plano efetivo resolvido no backend
  switch (effectivePlan) {
    case 'bronze':
      return <BusinessBronzeTemplate business={business} />;
    case 'prata':
      return <BusinessPrataTemplate business={business} />;
    case 'ouro':
      return <BusinessOuroTemplate business={business} />;
    default:
      return <BusinessBronzeTemplate business={business} />;
  }
}
