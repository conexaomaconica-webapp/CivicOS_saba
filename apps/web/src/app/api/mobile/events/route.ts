import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function formatDateBR(dateString?: string | null): string {
  if (!dateString) return 'Data a confirmar';
  try {
    const raw = dateString.split('T')[0];
    const [year, month, day] = (raw || '').split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {}
  return dateString || 'Data a confirmar';
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 503, headers: corsHeaders });
    }

    const dbReader = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      : createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

    const adminDb = dbReader as any;

    const [platformRes, businessRes] = await Promise.all([
      adminDb
        .from('platform_events')
        .select('*')
        .eq('status', 'published')
        .order('event_date', { ascending: true })
        .limit(50),
      adminDb
        .from('business_events')
        .select('*, businesses:business_id(id, name, slug, city)')
        .eq('is_active', true)
        .eq('publication_status', 'published')
        .order('starts_at', { ascending: true })
        .limit(50),
    ]);

    const rawPlatform = (platformRes.data as any[]) || [];
    const rawBusiness = (businessRes.data as any[]) || [];

    const normalizedPlatform = rawPlatform.map((p) => {
      const isLodge = !(p.badge_text || '').toLowerCase().includes('empresa');
      return {
        id: p.id,
        slug: p.slug || p.id,
        title: p.title,
        summary: p.description || p.subtitle || null,
        event_date: formatDateBR(p.event_date) + (p.start_time ? ` às ${p.start_time.slice(0, 5)}` : ''),
        location_label: p.venue_name || null,
        city: p.city || 'Feira de Santana',
        state: 'BA',
        organizer_name: p.venue_name || 'Loja Maçônica',
        organizer_type: isLodge ? 'lodge' : 'business',
        cover_url: p.cover_image_url || null,
        cta_url: null,
      };
    });

    const normalizedBusiness = rawBusiness.map((b) => {
      const biz = b.businesses;
      const startsAtDate = b.starts_at ? b.starts_at.split('T')[0] : '';
      const startsAtTime = b.starts_at && b.starts_at.includes('T') ? b.starts_at.split('T')[1].slice(0, 5) : '';

      return {
        id: b.id,
        slug: b.id,
        title: b.title,
        summary: b.description || null,
        event_date: formatDateBR(startsAtDate) + (startsAtTime ? ` às ${startsAtTime}` : ''),
        location_label: b.location_name || biz?.name || null,
        city: biz?.city || 'Feira de Santana',
        state: 'BA',
        organizer_name: biz?.name || 'Empresa Parceira',
        organizer_type: 'business',
        cover_url: b.cover_image_url || null,
        cta_url: b.external_ticket_url || null,
      };
    });

    const allEvents = [...normalizedPlatform, ...normalizedBusiness];

    return NextResponse.json(
      { events: allEvents },
      { headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Falha ao carregar eventos', message: err?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
