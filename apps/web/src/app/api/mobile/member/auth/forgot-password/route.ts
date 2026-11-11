import {
  createMobileSupabaseClients,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
} from '@/lib/mobile/mobile-api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return mobileCorsOptionsResponse();
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJsonResponse({ success: false, error: 'JSON inválido.' }, 400);
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return mobileJsonResponse({ success: false, error: 'Informe um e-mail válido.' }, 400);
  }

  const clients = createMobileSupabaseClients();
  if (!clients) {
    return mobileJsonResponse({ success: false, error: 'Serviço indisponível.' }, 503);
  }

  const { error } = await clients.anonClient.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://conexaomaconica.com.br/update-password',
  });

  if (error) {
    return mobileJsonResponse(
      { success: false, error: 'Não foi possível enviar o e-mail de recuperação agora. Tente novamente.' },
      400
    );
  }

  return mobileJsonResponse({
    success: true,
    message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação de senha.',
  });
}

