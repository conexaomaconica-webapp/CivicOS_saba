import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSideClient } from '@/lib/supabase/server';
import { sanitizeInternalRedirect } from '@/lib/auth/internal-redirect';

/**
 * Confirmação dos links enviados por e-mail pelo Supabase Auth (recuperar senha, cadastro, convite, link de acesso, troca de e-mail).
 *
 * Usa `token_hash` + `verifyOtp` NO SERVIDOR. Diferente do fluxo por `code` (PKCE), não depende do navegador onde o pedido foi feito:
 * o link funciona se for aberto em outro navegador, no aplicativo de e-mail do celular ou em outro aparelho, e não depende da lista
 * de "Redirect URLs" do painel. O link vem do modelo de e-mail: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...
 */

const OTP_TYPES: readonly EmailOtpType[] = ['recovery', 'signup', 'invite', 'magiclink', 'email_change', 'email'];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const rawType = searchParams.get('type');

  // Recuperação e convite terminam sempre na tela de definir senha; os demais respeitam `next` (somente caminho interno).
  const requestedNext = sanitizeInternalRedirect(searchParams.get('next'));
  const goToPasswordForm = rawType === 'recovery' || rawType === 'invite';
  const next = goToPasswordForm ? '/update-password' : requestedNext ?? '/';

  const failure = rawType === 'recovery' ? '/forgot-password?erro=link_invalido' : '/login?error=link_invalido';

  if (!tokenHash || !isOtpType(rawType)) {
    return NextResponse.redirect(new URL(failure, request.url));
  }

  try {
    const supabase = await createServerSideClient();
    const { error } = await supabase.auth.verifyOtp({ type: rawType, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  } catch {
    // Cai no redirecionamento de falha abaixo (sem expor detalhes do erro).
  }

  return NextResponse.redirect(new URL(failure, request.url));
}
