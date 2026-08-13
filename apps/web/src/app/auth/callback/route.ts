import { NextResponse, type NextRequest } from 'next/server';
import { createServerSideClient } from '@/lib/supabase/server';

/**
 * Exchanges the Auth code (e-mail confirmation / password recovery) for a
 * session and forwards the user to the intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSideClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL(`/login?error=sessao_invalida`, request.url));
}