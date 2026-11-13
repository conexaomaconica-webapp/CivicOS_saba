import crypto from 'node:crypto';

/**
 * Cliente mínimo do Firebase Cloud Messaging (HTTP v1), sem dependências.
 * A chave da conta de serviço fica SOMENTE no servidor: FIREBASE_SERVICE_ACCOUNT_JSON.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedAccount: ServiceAccount | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

export type ServiceAccountParseResult =
  | { ok: true; account: ServiceAccount }
  | { ok: false; reason: 'missing' | 'invalid_json' | 'missing_fields'; detail?: string };

/**
 * Interpreta FIREBASE_SERVICE_ACCOUNT_JSON (JSON puro ou base64). Tolerante a erros comuns de colagem:
 * BOM, aspas envolvendo o valor e quebras de linha reais dentro da private_key. Nunca devolve nem registra
 * o conteúdo da chave: o diagnóstico informa apenas a CATEGORIA do problema.
 */
export function parseServiceAccount(rawValue: string | undefined | null): ServiceAccountParseResult {
  let raw = (rawValue ?? '').replace(/^﻿/, '').trim();
  if (!raw) return { ok: false, reason: 'missing' };

  // Aspas envolvendo o valor inteiro (ex.: "{...}" ou '{...}').
  if (raw.length > 1 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) {
    raw = raw.slice(1, -1).trim();
  }

  const candidates: string[] = [];
  if (raw.startsWith('{')) {
    candidates.push(raw);
    // Quebras de linha REAIS dentro da private_key invalidam o JSON: escapa só dentro desse campo.
    candidates.push(
      raw.replace(/("private_key"\s*:\s*")([\s\S]*?)(")/, (_m, a: string, key: string, b: string) => `${a}${key.replace(/\r?\n/g, '\\n')}${b}`),
    );
    // JSON "escapado" (aspas escapadas, como quando colado de um string literal).
    candidates.push(raw.replace(/\\"/g, '"'));
  } else {
    try {
      candidates.push(Buffer.from(raw, 'base64').toString('utf8').replace(/^﻿/, '').trim());
    } catch {
      /* segue para o erro abaixo */
    }
  }

  let parsed: Record<string, unknown> | null = null;
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === 'object') {
        parsed = value as Record<string, unknown>;
        break;
      }
    } catch {
      /* tenta o próximo candidato */
    }
  }
  if (!parsed) return { ok: false, reason: 'invalid_json' };

  const missing = ['project_id', 'client_email', 'private_key'].filter((k) => typeof parsed![k] !== 'string' || !(parsed![k] as string).trim());
  if (missing.length > 0) return { ok: false, reason: 'missing_fields', detail: missing.join(', ') };

  return {
    ok: true,
    account: {
      project_id: String(parsed.project_id),
      client_email: String(parsed.client_email),
      private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
    },
  };
}

/** Diagnóstico seguro (sem segredos) para o admin: situação da configuração do Firebase no servidor. */
export function getFirebaseConfigStatus(): { configured: boolean; reason?: string; projectId?: string; clientEmail?: string } {
  const result = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (result.ok) return { configured: true, projectId: result.account.project_id, clientEmail: result.account.client_email };
  const messages: Record<string, string> = {
    missing: 'A variável FIREBASE_SERVICE_ACCOUNT_JSON não está definida neste ambiente (confira o nome, o ambiente Production/Preview e faça um novo deploy depois de salvar).',
    invalid_json: 'A variável existe, mas o conteúdo não é um JSON válido (nem base64 de um JSON). Cole o arquivo inteiro sem aspas ou use o valor em base64.',
    missing_fields: `O JSON foi lido, mas faltam campos obrigatórios (${result.detail}). Use o arquivo completo da conta de serviço.`,
  };
  return { configured: false, reason: messages[result.reason] };
}

export function getFirebaseServiceAccount(): ServiceAccount | null {
  if (cachedAccount) return cachedAccount;
  const result = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!result.ok) return null;
  cachedAccount = result.account;
  return cachedAccount;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** JWT assinado (RS256) que a conta de serviço troca por um token de acesso. */
function buildAssertion(account: ServiceAccount, now: number = Math.floor(Date.now() / 1000)): string {
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
  return `${header}.${claims}.${base64Url(signature)}`;
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const assertion = buildAssertion(account, now);

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

// ---------------------------------------------------------------------------
// Teste de conexão (admin): valida a configuração de ponta a ponta SEM enviar notificação a ninguém.
// Nunca devolve nem registra segredo: só categorias, códigos públicos de erro e o projeto/e-mail da conta.
// ---------------------------------------------------------------------------

export type ServiceAccountFormat = 'missing' | 'json' | 'json_with_quotes' | 'base64' | 'unknown';

/** Como o valor da variável parece estar colado (sem revelar o conteúdo). */
export function detectServiceAccountFormat(rawValue: string | undefined | null): ServiceAccountFormat {
  const raw = (rawValue ?? '').replace(/^﻿/, '').trim();
  if (!raw) return 'missing';
  if (raw.length > 1 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) return 'json_with_quotes';
  if (raw.startsWith('{')) return 'json';
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw)) return 'base64';
  return 'unknown';
}

const FORMAT_LABEL: Record<ServiceAccountFormat, string> = {
  missing: 'ausente',
  json: 'JSON puro',
  json_with_quotes: 'JSON entre aspas (tolerado)',
  base64: 'base64',
  unknown: 'formato não reconhecido',
};

export type ConnectionStep = {
  id: 'config' | 'key' | 'auth' | 'fcm';
  label: string;
  ok: boolean;
  skipped?: boolean;
  detail: string;
};

export type FirebaseConnectionTest = {
  ok: boolean;
  steps: ConnectionStep[];
  projectId?: string;
  clientEmail?: string;
  /** Ambiente e versão que estão respondendo (ex.: "production · versão 15e7c8f"). */
  environment: string;
};

function describeEnvironment(): string {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'desconhecido';
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  return sha ? `${env} · versão ${sha}` : env;
}

function publicErrorStatus(text: string): string | null {
  try {
    const status = JSON.parse(text)?.error?.status;
    return typeof status === 'string' ? status : null;
  } catch {
    return null;
  }
}

const AUTH_ADVICE: Record<string, string> = {
  invalid_grant:
    'O Google recusou a conta de serviço (invalid_grant): a chave pode ter sido revogada/excluída, a conta desativada ou o relógio do servidor está fora de hora. Gere uma nova chave no Firebase e atualize a variável.',
  invalid_client: 'O Google não reconhece esta conta de serviço (invalid_client). Confirme o client_email do arquivo.',
  unauthorized_client: 'A conta de serviço não está autorizada para este escopo (unauthorized_client).',
  invalid_scope: 'Escopo recusado pelo Google (invalid_scope).',
};

/**
 * Testa, em 4 etapas e sem enviar nenhuma notificação: (1) variável legível, (2) chave privada utilizável,
 * (3) autenticação no Google, (4) Firebase Cloud Messaging aceita a conta no projeto (envio com validate_only).
 */
export async function testFirebaseConnection(): Promise<FirebaseConnectionTest> {
  const environment = describeEnvironment();
  const steps: ConnectionStep[] = [];
  const skip = (id: ConnectionStep['id'], label: string) =>
    steps.push({ id, label, ok: false, skipped: true, detail: 'Não executado: corrija a etapa anterior.' });
  const done = (ok: boolean): FirebaseConnectionTest => ({ ok, steps, environment });

  // 1) Variável
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const parsed = parseServiceAccount(raw);
  if (!parsed.ok) {
    const status = getFirebaseConfigStatus();
    steps.push({ id: 'config', label: 'Variável FIREBASE_SERVICE_ACCOUNT_JSON', ok: false, detail: status.reason ?? 'Configuração inválida.' });
    skip('key', 'Chave privada');
    skip('auth', 'Autenticação no Google');
    skip('fcm', 'Firebase Cloud Messaging');
    return done(false);
  }
  const account = parsed.account;
  const result = (ok: boolean): FirebaseConnectionTest => ({ ...done(ok), projectId: account.project_id, clientEmail: account.client_email });
  steps.push({
    id: 'config',
    label: 'Variável FIREBASE_SERVICE_ACCOUNT_JSON',
    ok: true,
    detail: `Lida com sucesso (${FORMAT_LABEL[detectServiceAccountFormat(raw)]}). Projeto: ${account.project_id}.`,
  });

  // 2) Chave privada
  let assertion: string;
  try {
    if (!/-----BEGIN (RSA )?PRIVATE KEY-----/.test(account.private_key)) throw new Error('cabeçalho');
    assertion = buildAssertion(account);
  } catch {
    steps.push({
      id: 'key',
      label: 'Chave privada',
      ok: false,
      detail:
        'A private_key não pôde ser usada para assinar (cabeçalho ausente ou conteúdo corrompido, em geral por quebras de linha ou caracteres alterados na colagem). Use o arquivo original inteiro ou o valor em base64.',
    });
    skip('auth', 'Autenticação no Google');
    skip('fcm', 'Firebase Cloud Messaging');
    return result(false);
  }
  steps.push({ id: 'key', label: 'Chave privada', ok: true, detail: 'A chave assina corretamente.' });

  // 3) Autenticação (sempre uma chamada nova; não usa o token em cache)
  let accessToken: string;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      let code = 'erro';
      try {
        const c = JSON.parse(text)?.error;
        if (typeof c === 'string') code = c;
      } catch {
        /* mantém o código genérico */
      }
      steps.push({
        id: 'auth',
        label: 'Autenticação no Google',
        ok: false,
        detail: AUTH_ADVICE[code] ?? `O Google recusou a autenticação (HTTP ${res.status}, ${code}).`,
      });
      skip('fcm', 'Firebase Cloud Messaging');
      return result(false);
    }
    accessToken = ((await res.json()) as { access_token: string }).access_token;
  } catch {
    steps.push({ id: 'auth', label: 'Autenticação no Google', ok: false, detail: 'Sem resposta do Google (rede ou tempo esgotado). Tente novamente.' });
    skip('fcm', 'Firebase Cloud Messaging');
    return result(false);
  }
  steps.push({ id: 'auth', label: 'Autenticação no Google', ok: true, detail: `Conta de serviço aceita (${account.client_email}).` });

  // 4) FCM: validate_only com um token propositalmente inválido. Chegar ao erro de "token inválido" prova que a
  //    autenticação, a API e o projeto estão corretos, sem entregar nada a nenhum aparelho.
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        validate_only: true,
        message: { token: 'teste-de-conexao-nao-e-um-aparelho', notification: { title: 'Teste de conexão' } },
      }),
      signal: AbortSignal.timeout(10000),
    });
    const text = res.ok ? '' : await res.text();
    const status = publicErrorStatus(text);
    if (res.ok || (res.status === 400 && (status === 'INVALID_ARGUMENT' || /registration token/i.test(text)))) {
      steps.push({
        id: 'fcm',
        label: 'Firebase Cloud Messaging',
        ok: true,
        detail: 'O Firebase aceitou a conta neste projeto (teste sem envio: nenhuma notificação foi enviada).',
      });
      return result(true);
    }
    const advice: Record<number, string> = {
      401: 'Autenticação recusada pelo FCM. Gere uma nova chave da conta de serviço.',
      403: 'Permissão negada. Ative a "Firebase Cloud Messaging API (V1)" no projeto e confirme que a conta de serviço tem o papel "Firebase Cloud Messaging Admin" (ou "Firebase Admin").',
      404: 'Projeto não encontrado no FCM: o project_id da chave não corresponde a um projeto Firebase com mensagens habilitadas.',
    };
    steps.push({
      id: 'fcm',
      label: 'Firebase Cloud Messaging',
      ok: false,
      detail: advice[res.status] ?? `O FCM respondeu HTTP ${res.status}${status ? ` (${status})` : ''}. ${res.status >= 500 || res.status === 429 ? 'Instabilidade temporária: tente novamente.' : ''}`.trim(),
    });
    return result(false);
  } catch {
    steps.push({ id: 'fcm', label: 'Firebase Cloud Messaging', ok: false, detail: 'Sem resposta do FCM (rede ou tempo esgotado). Tente novamente.' });
    return result(false);
  }
}
