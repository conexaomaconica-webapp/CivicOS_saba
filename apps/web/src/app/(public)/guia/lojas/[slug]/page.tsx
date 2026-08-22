import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Landmark, MapPin, Calendar, Phone, Mail, Globe, Navigation, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';
import '@/styles/directory-home.css';

function appUrl(path: string) {
  return `https://conexaomaconica.com.br${path}`;
}

type Props = {
  params: Promise<{ slug: string }>;
};

const DAY_LABELS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const headerStore = await headers();
  const rawHost = headerStore.get('host') ?? 'localhost';
  const host = rawHost.split(':')[0] || 'localhost';

  const supabase = await createServerSideClient();
  const { data: lodge } = await (supabase as any).rpc('public_lodge_detail', {
    p_host: host,
    p_lodge_slug: slug,
  });

  if (!lodge) {
    return { title: 'Loja Maçônica Não Encontrada | Conexão Maçônica' };
  }

  return {
    title: `${lodge.name} ${lodge.code_number ? `nº ${lodge.code_number}` : ''} | Conexão Maçônica`,
    description: `Informações institucionais, potências, ritos, endereço e reuniões da ${lodge.name} em ${lodge.city || ''} - ${lodge.state || ''}.`,
  };
}

export default async function MasonicLodgeDetailPage({ params }: Props) {
  const { slug } = await params;
  const headerStore = await headers();
  const rawHost = headerStore.get('host') ?? 'localhost';
  const host = rawHost.split(':')[0] || 'localhost';

  const supabase = await createServerSideClient();
  const tenantBrand = await resolveTenantBrandContext();

  let lodge: any = null;
  try {
    const { data: rpcLodge } = await (supabase as any).rpc('public_lodge_detail', {
      p_host: host,
      p_lodge_slug: slug,
    });
    lodge = rpcLodge;
  } catch (err) {
    console.error('RPC public_lodge_detail fallback:', err);
  }

  if (!lodge) {
    const { data: rawOrg } = await (supabase as any)
      .from('organizations')
      .select('*')
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle();

    if (rawOrg) {
      lodge = {
        id: rawOrg.id,
        slug: rawOrg.slug || rawOrg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: rawOrg.name,
        code_number: rawOrg.code_number,
        potency: rawOrg.potency,
        potency_name: rawOrg.potency,
        rite: rawOrg.rite,
        foundation_date: rawOrg.foundation_date,
        city: rawOrg.city,
        state: rawOrg.state,
        cep: rawOrg.cep,
        address: rawOrg.show_address ? rawOrg.address : null,
        latitude: rawOrg.latitude,
        longitude: rawOrg.longitude,
        logo_url: rawOrg.logo_url,
        cover_url: rawOrg.cover_url,
        worshipful_master_name: rawOrg.show_worshipful_master ? rawOrg.worshipful_master_name : null,
        show_worshipful_master: rawOrg.show_worshipful_master,
        show_address: rawOrg.show_address,
        contacts: [],
        meetings: [],
        gallery: [],
      };
    }
  }

  if (!lodge) {
    notFound();
  }

  const mapsUrl = lodge.latitude && lodge.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${lodge.latitude},${lodge.longitude}`
    : lodge.address && lodge.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lodge.name}, ${lodge.address}, ${lodge.city} - ${lodge.state || ''}`)}`
    : null;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1f1914] font-sans antialiased relative">
      <StructuredData
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Place',
          name: `${lodge.name} ${lodge.code_number ? `nº ${lodge.code_number}` : ''}`,
          address: lodge.address ? {
            '@type': 'PostalAddress',
            streetAddress: lodge.address,
            addressLocality: lodge.city,
            addressRegion: lodge.state,
            postalCode: lodge.cep,
          } : undefined,
          url: appUrl(`/guia/lojas/${lodge.slug}`),
        }}
      />

      <DirectoryHeader
        appName={tenantBrand?.appName || 'Conexão Maçônica'}
        logoUrl={tenantBrand?.logoUrl}
      />

      {/* Top Hero Banner */}
      <section className="bg-gradient-to-b from-[#3b0b14] via-[#4d101c] to-[#2b060d] text-white py-12 px-4 relative overflow-hidden">
        <div className="dh-container relative z-10">
          <nav className="flex items-center gap-2 text-xs text-amber-200/80 mb-4">
            <Link href="/guia" className="hover:text-amber-300 transition-colors">
              Início
            </Link>
            <ChevronRight className="w-3 h-3 text-amber-400/60" />
            <Link href="/guia/lojas" className="hover:text-amber-300 transition-colors">
              Lojas Maçônicas
            </Link>
            <ChevronRight className="w-3 h-3 text-amber-400/60" />
            <span className="text-white font-semibold">{lodge.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-xl shrink-0 overflow-hidden flex items-center justify-center border-2 border-amber-300">
              {lodge.logo_url ? (
                <img src={lodge.logo_url} alt={lodge.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Landmark className="w-12 h-12 text-[#3b0b14]" />
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-amber-300">
                {lodge.potency && <span className="bg-amber-400/20 border border-amber-300/40 px-2.5 py-0.5 rounded-full">{lodge.potency_name || lodge.potency}</span>}
                {lodge.rite && <span className="bg-stone-800/60 border border-stone-600 px-2.5 py-0.5 rounded-full text-stone-200">{lodge.rite}</span>}
              </div>

              <h1 className="font-serif font-bold text-3xl md:text-4xl text-white">
                {lodge.name} {lodge.code_number ? `nº ${lodge.code_number}` : ''}
              </h1>

              {(lodge.city || lodge.state) && (
                <div className="flex items-center gap-1.5 text-xs text-amber-100/90">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Oriente de {lodge.city}{lodge.state ? `, ${lodge.state}` : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="dh-container py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Informações Principais (8 colunas) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Card Reuniões e Venerável */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="font-serif font-bold text-xl text-gray-900 border-b pb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-900" />
              <span>Sessões e Administração</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reuniões */}
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Dias de Reunião</h4>
                {lodge.meetings && lodge.meetings.length > 0 ? (
                  <div className="space-y-2">
                    {lodge.meetings.map((m: any) => (
                      <div key={m.id} className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs">
                        <p className="font-bold text-stone-900">
                          {DAY_LABELS[m.day.toLowerCase()] || m.day} {m.time ? `às ${m.time}` : ''}
                        </p>
                        {m.label && <p className="text-stone-600 text-[11px] mt-0.5">{m.label}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">Informação de reuniões sob consulta fraternal.</p>
                )}
              </div>

              {/* Venerável Mestre */}
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Administração</h4>
                {lodge.worshipful_master_name ? (
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
                    <p className="text-stone-500 font-medium">Venerável Mestre</p>
                    <p className="font-bold text-stone-900 text-sm">{lodge.worshipful_master_name}</p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">Administração restrita a membros autorizados.</p>
                )}
              </div>
            </div>
          </div>

          {/* Localização e Mapa */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="font-serif font-bold text-xl text-gray-900 border-b pb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-900" />
              <span>Onde Estamos</span>
            </h2>

            {lodge.address ? (
              <p className="text-sm font-semibold text-stone-800">{lodge.address} — {lodge.city}, {lodge.state}</p>
            ) : (
              <p className="text-xs text-stone-500">Endereço no Oriente de {lodge.city} - {lodge.state}.</p>
            )}

            {mapsUrl && (
              <div className="space-y-3">
                <div className="h-64 bg-stone-200 rounded-xl overflow-hidden relative flex items-center justify-center border border-stone-300">
                  <div className="absolute inset-0 bg-cover bg-center opacity-70 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="relative z-10 text-center bg-white/95 p-4 rounded-xl shadow-lg max-w-xs border">
                    <Landmark className="w-8 h-8 text-[#3b0b14] mx-auto mb-1" />
                    <h5 className="font-bold text-xs text-gray-900">{lodge.name}</h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">{lodge.city}, {lodge.state}</p>
                  </div>
                </div>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-amber-900 text-white font-bold text-xs py-3 px-5 rounded-xl hover:bg-amber-800 transition-colors w-full sm:w-auto shadow-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Como chegar (Abrir no GPS / Google Maps)</span>
                </a>
              </div>
            )}
          </div>

          {/* Galeria de Fotos */}
          {lodge.gallery && lodge.gallery.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h2 className="font-serif font-bold text-xl text-gray-900 border-b pb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-900" />
                <span>Galeria de Fotos da Loja</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {lodge.gallery.map((img: any) => (
                  <div key={img.id} className="h-40 rounded-xl overflow-hidden border border-stone-200 shadow-2xs group relative">
                    <img src={img.url} alt={img.alt || lodge.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Contatos e Resumo (4 colunas) */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4 sticky top-24">
            <h3 className="font-serif font-bold text-lg text-gray-900 border-b pb-2">Contatos Institucionais</h3>

            {lodge.contacts && lodge.contacts.length > 0 ? (
              <div className="space-y-3">
                {lodge.contacts.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 text-xs p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    {c.type === 'phone' && <Phone className="w-4 h-4 text-amber-900 shrink-0" />}
                    {c.type === 'whatsapp' && <Phone className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {c.type === 'email' && <Mail className="w-4 h-4 text-blue-600 shrink-0" />}
                    {c.type === 'website' && <Globe className="w-4 h-4 text-amber-900 shrink-0" />}
                    {c.type === 'instagram' && <Globe className="w-4 h-4 text-pink-600 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      {c.label && <p className="text-[10px] font-bold text-stone-500 uppercase">{c.label}</p>}
                      <p className="font-semibold text-stone-900 truncate">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500">Contatos sob consulta institucional.</p>
            )}

            <div className="pt-4 border-t border-stone-100 text-center">
              <Link
                href="/guia/lojas"
                className="text-xs font-bold text-amber-900 hover:underline inline-flex items-center gap-1"
              >
                <span>&larr; Voltar para a lista de Lojas</span>
              </Link>
            </div>
          </div>
        </aside>
      </main>

      <DirectoryFooter />
    </div>
  );
}
