import React from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { BusinessProfileTabs } from '@/components/dashboard/business/BusinessProfileTabs';

interface PerfilPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessProfileEditPage({ params }: PerfilPageProps) {
  const resolvedParams = await params;
  const businessId = resolvedParams.id;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  const supabase = createClient(url, key);

  // Busca dados da empresa
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .maybeSingle();

  // Busca plano vigente
  const { data: planCode } = await supabase.rpc('_effective_business_plan', {
    p_tenant_id: business?.tenant_id || '00000000-0000-0000-0000-000000000001',
    p_business_id: businessId,
  });

  // Busca limite de fotos na galeria via plan_entitlements
  const { data: galleryLimit } = await supabase.rpc('_get_plan_entitlement', {
    p_tenant_id: business?.tenant_id || '00000000-0000-0000-0000-000000000001',
    p_plan_code: planCode || 'ouro',
    p_feature_code: 'gallery_photos_limit',
  });

  // Busca fotos da galeria em business_media
  const { data: mediaItems } = await supabase
    .from('business_media')
    .select('id, url, title, display_order')
    .eq('business_id', businessId)
    .eq('media_type', 'image')
    .order('display_order', { ascending: true });

  const initialData = {
    name: business?.name || 'Empresa Exemplo',
    tagline: business?.tagline || null,
    category: business?.category || 'Tecnologia',
    description: business?.description || null,
    legalName: business?.legal_name || null,
    documentNumber: business?.document_number || null,
    phone: business?.phone || null,
    whatsapp: business?.whatsapp || null,
    email: business?.public_email || null,
    website: business?.website || null,
    street: business?.street || null,
    number: business?.number || null,
    neighborhood: business?.neighborhood || null,
    city: business?.city || 'São Paulo',
    state: business?.state || 'SP',
    zipCode: business?.zip_code || null,
    logoUrl: business?.logo_url || null,
    coverUrl: business?.cover_url || null,
  };

  const galleryItems = (mediaItems || []).map(m => ({
    id: m.id,
    url: m.url,
    title: m.title || null,
    displayOrder: m.display_order,
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <Link href={`/dashboard/empresas/${businessId}`} className="hover:underline">
              {initialData.name}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Edição de Perfil</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Perfil Comercial do Anunciante</h1>
          <p className="text-xs text-slate-500">
            Gerencie dados comerciais, mídias, fotos da galeria, contatos e localização.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/guia/${business?.slug || 'empresa-ouro'}`}
            target="_blank"
            className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ver no Guia Público
          </Link>
        </div>
      </div>

      {/* Formulário Tabulado */}
      <BusinessProfileTabs
        businessId={businessId}
        initialData={initialData}
        galleryItems={galleryItems}
        galleryLimit={galleryLimit ?? 10}
      />
    </div>
  );
}
