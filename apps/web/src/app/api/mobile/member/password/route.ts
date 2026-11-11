import { validatePassword } from '@/lib/auth/validation';
import {
  authenticateMobileRequest,
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
  const auth = await authenticateMobileRequest(request);
  if (!auth.ok) {
    return mobileJsonResponse({ success: false, error: auth.error }, auth.status);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJsonResponse({ success: false, error: 'JSON inválido.' }, 400);
  }

  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!currentPassword) {
    return mobileJsonResponse({ success: false, error: 'Informe sua senha atual.' }, 400);
  }
  const invalid = validatePassword(newPassword);
  if (invalid) {
    return mobileJsonResponse({ success: false, error: invalid }, 400);
  }
  if (newPassword !== confirmPassword) {
    return mobileJsonResponse(
      { success: false, error: 'A confirmação não confere com a nova senha.' },
      400
    );
  }
  if (newPassword === currentPassword) {
    return mobileJsonResponse(
      { success: false, error: 'A nova senha deve ser diferente da senha atual.' },
      400
    );
  }

  const { user, userClient, adminClient } = auth.ctx;
  if (!user.email) {
    return mobileJsonResponse({ success: false, error: 'Usuário sem e-mail associado.' }, 400);
  }

  const clients = createMobileSupabaseClients();
  if (!clients) {
    return mobileJsonResponse({ success: false, error: 'Serviço indisponível.' }, 503);
  }

  const { error: verifyError } = await clients.anonClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return mobileJsonResponse({ success: false, error: 'A senha atual está incorreta.' }, 401);
  }

  if (adminClient) {
    const { error: adminErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (adminErr) {
      return mobileJsonResponse(
        { success: false, error: 'Não foi possível alterar a senha agora. Tente novamente.' },
        400
      );
    }
  } else {
    const { error: updateError } = await userClient.auth.updateUser({ password: newPassword });
    if (updateError) {
      return mobileJsonResponse(
        { success: false, error: 'Não foi possível alterar a senha agora. Tente novamente.' },
        400
      );
    }
  }

  return mobileJsonResponse({ success: true, message: 'Senha alterada com sucesso.' });
}

