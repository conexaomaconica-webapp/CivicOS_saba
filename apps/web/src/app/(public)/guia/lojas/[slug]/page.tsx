import type { Metadata } from 'next';
import { appUrl } from '@/lib/seo/app-url';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Phone, Mail, Globe, Navigation, ChevronRight, Image as ImageIcon, AtSign } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { StructuredData } from '@/components/seo/StructuredData';
import { formatMeetingDay, formatMeetingTime } from '@/lib/lodges/format';
import { canonicalPotencyCode } from '@/lib/lodges/potency';
import { LodgeLogoZoom } from '@/components/public/directory/LodgeLogoZoom';
import { LodgeGallery } from '@/components/public/directory/LodgeGallery';
import '@/styles/directory-home.css';


function contactHref(type: string, value: string): string | null {
  if (type === 'email') return `mailto:${value}`;
  if (type === 'website') return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  if (type === 'instagram' || type === 'fraternity_instagram') {
    if (/^https?:\/\//i.test(value)) return value;
    return `https://instagram.com/${value.trim().replace(/^@/, '')}`;
  }
  if (type === 'whatsapp') return `https://wa.me/55${value.replace(/\D/g, '').replace(/^55/, '')}`;
  return null;
}

type Props = {
  params: Promise<{ slug: string }>;
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
    return { title: { absolute: 'Loja Maçônica não encontrada | Conexão Maçônica' }, robots: { index: false, follow: false } };
  }

  const lodgeTitle = `${lodge.name}${lodge.code_number ? ` nº ${lodge.code_number}` : ''}`.replace(/\s+/g, ' ').trim();
  return {
    title: { absolute: `${lodgeTitle} | Conexão Maçônica` },
    description: `Informações institucionais, potências, ritos, endereço e reuniões da ${lodge.name} em ${lodge.city || ''} - ${lodge.state || ''}.`,
    alternates: { canonical: appUrl(`/guia/lojas/${slug}`) },
    // Política da Sprint 2: as páginas de loja só entram no Google quando tiverem conteúdo próprio (hoje ~120 palavras).
    robots: { index: false, follow: true },
  };
}

export default async function MasonicLodgeDetailPage({ params }: Props) {
  const { slug } = await params;
  const headerStore = await headers();
  const rawHost = headerStore.get('host') ?? 'localhost';
  const host = rawHost.split(':')[0] || 'localhost';

  const supabase = await createServerSideClient();
  const tenantBrand = await resolveTenantBrandContext();

  // Membro = qualquer pessoa com sessão ativa (cadastro gratuito). Ela vê os dados marcados como reservados.
  let isMember = false;
  try {
    const { data: authData } = await supabase.auth.getUser();
    isMember = Boolean(authData?.user);
  } catch {}
  const returnPath = `/guia/lojas/${slug}`;
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?redirect=${encodeURIComponent(returnPath)}`;

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
      const [{ data: rawContacts }, { data: rawMeetings }, { data: rawGallery }] = await Promise.all([
        (supabase as any).from('organization_contacts').select('id, type, value, label').eq('organization_id', rawOrg.id).eq('is_public', true),
        (supabase as any).from('organization_meetings').select('id, meeting_day, meeting_time, label').eq('organization_id', rawOrg.id).eq('is_public', true).order('sort_order'),
        (supabase as any).from('organization_media').select('id, url, alt, type').eq('organization_id', rawOrg.id).order('sort_order'),
      ]);
      lodge = {
        id: rawOrg.id,
        slug: rawOrg.slug || rawOrg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: rawOrg.name,
        code_number: rawOrg.code_number,
        potency: canonicalPotencyCode(rawOrg.potency),
        potency_name: canonicalPotencyCode(rawOrg.potency),
        rite: rawOrg.rite,
        foundation_date: rawOrg.foundation_date,
        city: rawOrg.city,
        state: rawOrg.state,
        cep: rawOrg.cep,
        address: rawOrg.show_address || isMember ? rawOrg.address : null,
        latitude: rawOrg.latitude,
        longitude: rawOrg.longitude,
        logo_url: rawOrg.logo_url,
        cover_url: rawOrg.cover_url,
        worshipful_master_name: rawOrg.show_worshipful_master || isMember ? rawOrg.worshipful_master_name : null,
        show_worshipful_master: rawOrg.show_worshipful_master,
        show_address: rawOrg.show_address,
        contacts: rawContacts || [],
        meetings: (rawMeetings || []).map((meeting: any) => ({ id: meeting.id, day: meeting.meeting_day, time: meeting.meeting_time, label: meeting.label })),
        gallery: rawGallery || [],
      };
    }
  }

  if (!lodge) {
    notFound();
  }

  // Localização exata (coordenadas/endereço) só quando o endereço é público ou a pessoa é membro logado.
  // Caso contrário o mapa mostra apenas a cidade e não há botão de rota.
  const canShowExactLocation = Boolean(lodge.address) || isMember;
  const cityQuery = [lodge.city, lodge.state, 'Brasil'].filter(Boolean).join(', ');
  const exactQuery =
    lodge.latitude != null && lodge.longitude != null
      ? `${lodge.latitude},${lodge.longitude}`
      : lodge.address
      ? [lodge.name, lodge.address, lodge.city, lodge.state].filter(Boolean).join(', ')
      : null;
  const mapQuery = canShowExactLocation && exactQuery ? exactQuery : cityQuery;
  const hasMap = Boolean(mapQuery.replace(/[,\s]|Brasil/g, ''));
  const mapEmbedUrl = hasMap
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=${canShowExactLocation && exactQuery ? 16 : 12}&ie=UTF8&iwloc=&output=embed`
    : null;
  const mapsUrl =
    canShowExactLocation && exactQuery
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(exactQuery)}`
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
            <LodgeLogoZoom
              logoUrl={lodge.logo_url}
              potency={lodge.potency}
              lodgeName={lodge.name}
              className="w-24 h-24 rounded-2xl bg-white p-2 shadow-xl border-2 border-amber-300"
              fallbackIconClassName="w-12 h-12 text-[#3b0b14]"
            />

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Reuniões */}
              <div className="flex flex-col">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Dias de Reunião</h4>
                {lodge.meetings && lodge.meetings.length > 0 ? (
                  <div className="flex flex-1 flex-col gap-2">
                    {lodge.meetings.map((m: any) => (
                      <div key={m.id} className="flex flex-1 flex-col justify-center gap-1 p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs">
                        <p className="font-bold text-stone-900 text-sm">
                          {formatMeetingDay(m.day, m.label)} {m.time ? `às ${formatMeetingTime(m.time)}` : ''}
                        </p>
                        {m.label && !/do mês$/i.test(m.label) && <p className="text-stone-600 text-xs">{m.label}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">Informação de reuniões sob consulta fraternal.</p>
                )}
              </div>

              {/* Venerável Mestre */}
              <div className="flex flex-col">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Administração</h4>
                {lodge.worshipful_master_name ? (
                  <div className="flex flex-1 flex-col justify-center gap-1 p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs">
                    <p className="font-bold text-stone-900 text-sm">{lodge.worshipful_master_name}</p>
                    <p className="text-stone-600 text-xs">Venerável Mestre</p>
                  </div>
                ) : lodge.show_worshipful_master === false && !isMember ? (
                  <div className="flex flex-1 flex-col justify-center gap-2 p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-stone-700">
                    <p>A administração desta loja é visível apenas para membros cadastrados.</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
                      <Link href={loginHref} className="text-amber-900 hover:underline">Entrar</Link>
                      <Link href={registerHref} className="text-amber-900 hover:underline">Cadastre-se grátis</Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    {isMember && lodge.show_worshipful_master === false
                      ? 'O Venerável Mestre desta loja ainda não foi informado.'
                      : 'Administração não informada.'}
                  </p>
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
            ) : lodge.show_address === false && !isMember ? (
              <p className="text-xs text-stone-600">
                O endereço completo é visível apenas para membros cadastrados.{' '}
                <Link href={loginHref} className="font-bold text-amber-900 hover:underline">Entrar</Link>{' · '}
                <Link href={registerHref} className="font-bold text-amber-900 hover:underline">Cadastre-se grátis</Link>
              </p>
            ) : (
              <p className="text-xs text-stone-500">Endereço no Oriente de {lodge.city} - {lodge.state}.</p>
            )}

            {mapEmbedUrl && (
              <div className="space-y-3">
                <div className="h-64 overflow-hidden rounded-xl border border-stone-300 bg-stone-100">
                  <iframe
                    title={`Mapa de localização — ${lodge.name}`}
                    src={mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full"
                  />
                </div>

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-amber-900 text-white font-bold text-xs py-3 px-5 rounded-xl hover:bg-amber-800 transition-colors w-full sm:w-auto shadow-xs"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Traçar rota no Google Maps</span>
                  </a>
                )}
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

              <LodgeGallery images={lodge.gallery} lodgeName={lodge.name} />
            </div>
          )}
        </div>

        {/* Coluna Direita: Contatos e Resumo (4 colunas) */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-4 sticky top-24">
            <h3 className="font-serif font-bold text-lg text-gray-900 border-b pb-2">Contatos Institucionais</h3>

            {lodge.contacts && lodge.contacts.length > 0 ? (
              <div className="space-y-3">
                {lodge.contacts.map((c: any) => {
                  const href = contactHref(c.type, c.value);
                  const content = (
                    <>
                    {c.type === 'phone' && <Phone className="w-4 h-4 text-amber-900 shrink-0" />}
                    {c.type === 'whatsapp' && <Phone className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {c.type === 'email' && <Mail className="w-4 h-4 text-blue-600 shrink-0" />}
                    {c.type === 'website' && <Globe className="w-4 h-4 text-amber-900 shrink-0" />}
                    {(c.type === 'instagram' || c.type === 'fraternity_instagram') && <AtSign className="w-4 h-4 text-pink-600 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      {c.label && <p className="text-[10px] font-bold text-stone-500 uppercase">{c.label}</p>}
                      <p className="font-semibold text-stone-900 truncate">{c.value}</p>
                    </div>
                    </>
                  );
                  return href ? (
                    <a key={c.id} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs p-2.5 rounded-xl bg-stone-50 border border-stone-200 hover:border-pink-300 hover:bg-pink-50/40 transition-colors">
                      {content}
                    </a>
                  ) : (
                    <div key={c.id} className="flex items-center gap-3 text-xs p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                      {content}
                    </div>
                  );
                })}
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
