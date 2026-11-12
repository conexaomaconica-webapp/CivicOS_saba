import crypto from 'node:crypto';

/**
 * Cliente mínimo do Firebase Cloud Messaging (HTTP v1), sem dependências.
 * A chave da conta de serviço fica SOMENTE no servidor: FIREBASE_SERVICE_ACCOUNT_JSON.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedAccount: ServiceAccount | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

export function getFirebaseServiceAccount(): ServiceAccount | null {
  if (cachedAccount) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    cachedAccount = {
      project_id: String(parsed.project_id),
      client_email: String(parsed.client_email),
      private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
    };
    return cachedAccount;
  } catch {
    return null;
  }
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key);
  const assertion = `${header}.${claims}.${base64Url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`Falha na autenticação com o Firebase (${res.status}).`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in || 3600) };
  return json.access_token;
}

export type PushPayload = {
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  ttlSeconds: number;
};

export type PushSendResult = { ok: true } | { ok: false; invalidToken: boolean; error: string };

export async function sendPushToToken(token: string, payload: PushPayload): Promise<PushSendResult> {
  const account = getFirebaseServiceAccount();
  if (!account) return { ok: false, invalidToken: false, error: 'FIREBASE_SERVICE_ACCOUNT_JSON não configurada.' };

  try {
    const accessToken = await getAccessToken(account);
    const notification: Record<string, string> = { title: payload.title };
    if (payload.body) notification.body = payload.body;
    if (payload.imageUrl) notification.image = payload.imageUrl;

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification,
          data: payload.route ? { route: payload.route } : undefined,
          android: { priority: 'HIGH', ttl: `${Math.max(60, Math.floor(payload.ttlSeconds))}s` },
        },
      }),
    });
    if (res.ok) return { ok: true };

    const text = await res.text();
    const invalidToken = res.status === 404 || /UNREGISTERED|not a valid FCM registration token/i.test(text);
    return { ok: false, invalidToken, error: `FCM ${res.status}: ${text.slice(0, 200)}` };
  } catch (error) {
    return { ok: false, invalidToken: false, error: error instanceof Error ? error.message : 'Erro ao enviar push.' };
  }
}
