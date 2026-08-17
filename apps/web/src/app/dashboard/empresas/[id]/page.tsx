import React from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';

interface BusinessDashboardPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessDashboardPage({ params }: BusinessDashboardPageProps) {
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

  const tenantId = business?.tenant_id || '00000000-0000-0000-0000-000000000001';

  // Busca plano vigente
  const { data: planCode } = await supabase.rpc('_effective_business_plan', {
    p_tenant_id: tenantId,
    p_business_id: businessId,
  });

  const activePlan = planCode || 'ouro';

  // Busca cotas vigentes via plan_entitlements
  const { data: servicesLimit } = await supabase.rpc('_get_plan_entitlement', {
    p_tenant_id: tenantId,
    p_plan_code: activePlan,
    p_feature_code: 'services_limit',
  });

  const { data: benefitsLimit } = await supabase.rpc('_get_plan_entitlement', {
    p_tenant_id: tenantId,
    p_plan_code: activePlan,
    p_feature_code: 'benefits_limit',
  });

  const { data: galleryLimit } = await supabase.rpc('_get_plan_entitlement', {
    p_tenant_id: tenantId,
    p_plan_code: activePlan,
    p_feature_code: 'gallery_photos_limit',
  });

  // Contagem de serviços ativos
  const { count: servicesCount } = await supabase
    .from('business_services')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .eq('is_active', true);

  // Contagem de benefícios ativos
  const { count: benefitsCount } = await supabase
    .from('business_benefits')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .eq('is_active', true);

  // Contagem de fotos na galeria
  const { count: galleryCount } = await supabase
    .from('business_media')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .eq('media_type', 'image');

  const name = business?.name || 'Empresa Exemplo';
  const slug = business?.slug || 'empresa-ouro';
  const logoUrl = business?.logo_url || null;
  const coverUrl = business?.cover_url || null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">{name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
          <p className="text-xs text-slate-500">
            Painel Geral de Gestão do Anunciante
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/guia/${slug}`}
            target="_blank"
            className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ver Perfil no Guia Público
          </Link>
        </div>
      </div>

      {/* Banner do Perfil & Plano Vigente */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-slate-800 via-blue-950 to-slate-900">
          {coverUrl && (
            <Image
              src={coverUrl}
              alt="Capa"
              fill
              className="object-cover opacity-60"
              unoptimized
            />
          )}
        </div>
        <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4 -mt-10">
            <div className="w-20 h-20 rounded-xl bg-white border-2 border-white shadow-md relative overflow-hidden flex items-center justify-center font-bold text-slate-400 bg-slate-100">
              {logoUrl ? (
                <Image src={logoUrl} alt={name} fill className="object-cover" unoptimized />
              ) : (
                name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{name}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                Plano {activePlan.replace('_', ' ')}
              </span>
            </div>
          </div>

          <Link
            href={`/dashboard/empresas/${businessId}/perfil`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
          >
            Editar Perfil & Mídias
          </Link>
        </div>
      </div>

      {/* Cards de Resumo das Cotas Canônicas (plan_entitlements) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card Serviços */}
        <Link
          href={`/dashboard/empresas/${businessId}/servicos`}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-colors block group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Serviços Ativos</span>
            <span className="text-xs font-bold text-blue-600 group-hover:underline">Gerenciar &rarr;</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {servicesCount || 0} <span className="text-xs font-normal text-slate-500">/ {servicesLimit ?? 25} permitidos</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (((servicesCount || 0) / (servicesLimit || 1)) * 100))}%` }}
            />
          </div>
        </Link>

        {/* Card Benefícios */}
        <Link
          href={`/dashboard/empresas/${businessId}/beneficios`}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-colors block group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Benefícios Ativos</span>
            <span className="text-xs font-bold text-blue-600 group-hover:underline">Gerenciar &rarr;</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {benefitsCount || 0} <span className="text-xs font-normal text-slate-500">/ {benefitsLimit ?? 3} permitidos</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (((benefitsCount || 0) / (benefitsLimit || 1)) * 100))}%` }}
            />
          </div>
        </Link>

        {/* Card Galeria de Fotos */}
        <Link
          href={`/dashboard/empresas/${businessId}/perfil`}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-colors block group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Galeria de Fotos</span>
            <span className="text-xs font-bold text-blue-600 group-hover:underline">Gerenciar &rarr;</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {galleryCount || 0} <span className="text-xs font-normal text-slate-500">/ {galleryLimit ?? 10} permitidas</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (((galleryCount || 0) / (galleryLimit || 1)) * 100))}%` }}
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
