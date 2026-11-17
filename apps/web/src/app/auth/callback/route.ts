import { NextResponse, type NextRequest } from 'next/server';
import { createServerSideClient } from '@/lib/supabase/server';
import { sanitizeInternalRedirect } from '@/lib/auth/internal-redirect';
import { clearAccountTempPassword } from '@/lib/auth/account-temp-password-admin';
import { getAccountTempPasswordState } from '@/lib/auth/account-temp-password';

/**
 * Exchanges the Auth code (e-mail confirmation / password recovery) for a
 * session and forwards the user to the intended destination.
 *
 * `next` só aceita caminho interno (antes aceitava qualquer endereço, o que permitia redirecionar a pessoa para outro site).
 * Quando o link falha (expirado, já usado, aberto em outro navegador), a pessoa volta para a tela certa COM uma mensagem,
 * em vez de cair no login sem explicação.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeInternalRedirect(searchParams.get('next')) ?? '/dashboard';

  if (code) {
    try {
      const supabase = await createServerSideClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Fluxo de recuperação de senha (termina em /update-password): ver o comentário em /auth/confirm.
        if (next.startsWith('/update-password') && data?.user && getAccountTempPasswordState(data.user.app_metadata) !== 'none') {
          await clearAccountTempPassword(data.user.id, data.user.app_metadata);
        }
        return NextResponse.redirect(new URL(next, request.url));
      }
    } catch {
      // Cai no redirecionamento de falha abaixo.
    }
  }

  const failure = next.startsWith('/update-password') ? '/forgot-password?erro=link_invalido' : '/login?error=sessao_invalida';
  return NextResponse.redirect(new URL(failure, request.url));
}
