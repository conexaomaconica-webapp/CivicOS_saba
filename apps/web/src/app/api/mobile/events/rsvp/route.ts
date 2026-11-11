import { NextResponse } from 'next/server';
import { upsertEventRegistrationAction } from '@/app/actions/platform-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version, X-Client-Platform',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json(
        { success: false, error: 'Payload inválido.' },
        { status: 400, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Corpo da requisição deve ser um JSON válido.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
    );
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName : '';
  const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp : '';
  const attendeeType =
    typeof body.attendeeType === 'string'
      ? (body.attendeeType as 'macom' | 'cunhada' | 'familiar' | 'convidado')
      : 'macom';
  const attendanceStatus =
    typeof body.attendanceStatus === 'string'
      ? (body.attendanceStatus as 'confirmed' | 'declined')
      : 'confirmed';

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Evento não identificado para confirmação.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
    );
  }

  const result = await upsertEventRegistrationAction({
    eventId,
    fullName,
    whatsapp,
    email: typeof body.email === 'string' && body.email.trim() ? body.email.trim() : undefined,
    attendeeType,
    masonicOrganization:
      typeof body.masonicOrganization === 'string' && body.masonicOrganization.trim()
        ? body.masonicOrganization.trim()
        : undefined,
    companyName:
      typeof body.companyName === 'string' && body.companyName.trim()
        ? body.companyName.trim()
        : undefined,
    city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : undefined,
    attendanceStatus,
    source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'app_mobile',
    utmSource: typeof body.utmSource === 'string' && body.utmSource.trim() ? body.utmSource.trim() : undefined,
    utmMedium: typeof body.utmMedium === 'string' && body.utmMedium.trim() ? body.utmMedium.trim() : undefined,
    utmCampaign: typeof body.utmCampaign === 'string' && body.utmCampaign.trim() ? body.utmCampaign.trim() : undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'Não foi possível registrar sua presença.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', ...corsHeaders } }
    );
  }

  return NextResponse.json(result, {
    status: 200,
    headers: { 'Cache-Control': 'no-store', ...corsHeaders },
  });
}

