import { notFound } from 'next/navigation';
import { getApprovalDossierAction } from '@/lib/admin/admin-approval-service';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { toPublicBusinessPresentation } from '@/lib/business/public-business-presentation';

export default async function PreviewAprovacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const res = await getApprovalDossierAction(id);
  if (!res.success || !res.dossier) {
    return notFound();
  }

  const { dossier } = res;

  if (!dossier.contract.plan_code) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-screen bg-stone-50">
        <h2 className="text-xl font-bold text-stone-800 mb-2">Pré-visualização Bloqueada</h2>
        <p className="text-stone-600">O anúncio não pode ser pré-visualizado porque não possui um plano comercial definido.</p>
      </div>
    );
  }

  // Build a DetailRow based on ApprovalDossier360 for preview
  const previewDetailRow: any = {
    id: dossier.business_id,
    business_id: dossier.business_id,
    business_slug: dossier.business_id,
    name: dossier.company.name,
    category: dossier.company.category,
    description: dossier.company.description,
    effective_plan_code: dossier.contract.plan_code,
    
    is_verified: dossier.recognitions.is_verified,
    is_pedra_fundamental: dossier.recognitions.is_pedra_fundamental,
    is_coluna_honra: dossier.recognitions.is_coluna_honra,
    is_founder: dossier.recognitions.is_founder,

    responsible: {
      name: dossier.responsible.full_name,
      business_role: 'Responsável',
      community_label: dossier.masonic_link.affiliation_role,
      organization: dossier.masonic_link.lodge_name,
    },

    locations: [{
      is_headquarters: true,
      address: dossier.company.address,
      city: dossier.company.city,
      state: dossier.company.uf,
    }],

    contacts: [
      { type: 'phone', value: dossier.company.phone },
      { type: 'whatsapp', value: dossier.company.whatsapp },
      { type: 'email', value: dossier.company.email },
      { type: 'website', value: dossier.company.website },
      { type: 'instagram', value: dossier.company.instagram },
    ].filter(c => c.value),

    media: [
      ...(dossier.media.banner_url ? [{ url: dossier.media.banner_url, media_type: 'image', title: 'Capa' }] : []),
      ...(dossier.media.logo_url ? [{ url: dossier.media.logo_url, media_type: 'image', title: 'Logo' }] : []),
    ],

    // Empty for preview unless fetched by another mean
    benefits: [],
    services: [],
    events: [],
    posts: [],
    
    entitlements: {
      gallery_photos_limit: dossier.plan_entitlements.gallery_photos_limit,
      services_limit: dossier.plan_entitlements.services_limit,
      benefits_limit: dossier.plan_entitlements.benefits_limit,
      events_limit: dossier.plan_entitlements.events_limit,
      posts_limit: dossier.plan_entitlements.posts_limit,
    }
  };

  const presentation = toPublicBusinessPresentation(previewDetailRow, []);

  return (
    <div className="bg-stone-50 min-h-screen">
      <BusinessProfileRenderer business={presentation} />
    </div>
  );
}
