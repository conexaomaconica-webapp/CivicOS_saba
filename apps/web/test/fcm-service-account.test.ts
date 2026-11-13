import { describe, expect, it } from 'vitest';
import { parseServiceAccount } from '@/lib/push/fcm';

const KEY = '-----BEGIN PRIVATE KEY-----\nABC123\n-----END PRIVATE KEY-----\n';
const account = { type: 'service_account', project_id: 'conexao-maconica', client_email: 'sa@conexao-maconica.iam.gserviceaccount.com', private_key: KEY };
const json = JSON.stringify(account); // private_key com \n escapado (formato do arquivo baixado)

describe('parseServiceAccount (FIREBASE_SERVICE_ACCOUNT_JSON)', () => {
  it('aceita JSON puro', () => {
    const r = parseServiceAccount(json);
    expect(r.ok && r.account.project_id).toBe('conexao-maconica');
    expect(r.ok && r.account.private_key).toBe(KEY);
  });

  it('aceita base64 do arquivo', () => {
    const r = parseServiceAccount(Buffer.from(json, 'utf8').toString('base64'));
    expect(r.ok).toBe(true);
  });

  it('tolera aspas envolvendo o valor, BOM e espaços', () => {
    expect(parseServiceAccount(`"${json.replace(/"/g, '\\"')}"`).ok).toBe(true);
    expect(parseServiceAccount(`'${json}'`).ok).toBe(true);
    expect(parseServiceAccount(`﻿  ${json}  `).ok).toBe(true);
  });

  it('tolera quebras de linha reais dentro da private_key', () => {
    const withRealNewlines = json.replace(/\\n/g, '\n');
    const r = parseServiceAccount(withRealNewlines);
    expect(r.ok).toBe(true);
    expect(r.ok && r.account.private_key.includes('BEGIN PRIVATE KEY')).toBe(true);
  });

  it('classifica o problema sem revelar o conteúdo', () => {
    expect(parseServiceAccount(undefined)).toEqual({ ok: false, reason: 'missing' });
    expect(parseServiceAccount('   ')).toEqual({ ok: false, reason: 'missing' });
    expect(parseServiceAccount('{"project_id": ')).toEqual({ ok: false, reason: 'invalid_json' });
    expect(parseServiceAccount('isto-nao-e-base64-de-json!!')).toEqual({ ok: false, reason: 'invalid_json' });
    const partial = parseServiceAccount(JSON.stringify({ project_id: 'x' }));
    expect(partial).toEqual({ ok: false, reason: 'missing_fields', detail: 'client_email, private_key' });
    expect(JSON.stringify(partial)).not.toContain('PRIVATE');
  });
});

// ---------------------------------------------------------------------------
// Teste de conexão do admin (testFirebaseConnection): sem rede real, com chave RSA gerada na hora.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto';
import { afterEach, beforeEach, vi } from 'vitest';
import { detectServiceAccountFormat, testFirebaseConnection } from '@/lib/push/fcm';

describe('testFirebaseConnection (admin)', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const goodEnv = JSON.stringify({ project_id: 'conexao-maconica', client_email: 'sa@conexao-maconica.iam.gserviceaccount.com', private_key: privateKey });
  const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body), json: async () => body });
  const previous = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = goodEnv;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (previous === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = previous;
  });

  it('variável ausente: reprova a 1ª etapa, pula as demais e não faz chamadas de rede', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const r = await testFirebaseConnection();
    expect(r.ok).toBe(false);
    expect(r.steps.map((s) => s.id)).toEqual(['config', 'key', 'auth', 'fcm']);
    expect(r.steps[0]!.ok).toBe(false);
    expect(r.steps.slice(1).every((s) => s.skipped)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chave privada corrompida: reprova na etapa da chave, sem rede', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: 'p', client_email: 'sa@p.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nlixo\n-----END PRIVATE KEY-----\n',
    });
    const r = await testFirebaseConnection();
    expect(r.ok).toBe(false);
    expect(r.steps.find((s) => s.id === 'key')!.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Google recusa a conta (invalid_grant): explica a causa e não chama o FCM', async () => {
    fetchMock.mockResolvedValueOnce(reply(400, { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }));
    const r = await testFirebaseConnection();
    expect(r.ok).toBe(false);
    expect(r.steps.find((s) => s.id === 'auth')!.detail).toMatch(/invalid_grant/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('FCM responde "token inválido" ao teste (validate_only): conexão OK, sem enviar nada', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(200, { access_token: 'ya29.token-secreto', expires_in: 3600 }))
      .mockResolvedValueOnce(reply(400, { error: { status: 'INVALID_ARGUMENT', message: 'The registration token is not a valid FCM registration token' } }));
    const r = await testFirebaseConnection();
    expect(r.ok).toBe(true);
    expect(r.projectId).toBe('conexao-maconica');
    const fcmCall = fetchMock.mock.calls[1]!;
    expect(String(fcmCall[0])).toContain('/projects/conexao-maconica/messages:send');
    expect(JSON.parse(fcmCall[1].body).validate_only).toBe(true);
  });

  it('FCM 403: orienta ativar a API e o papel da conta', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(200, { access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValueOnce(reply(403, { error: { status: 'PERMISSION_DENIED' } }));
    const r = await testFirebaseConnection();
    expect(r.ok).toBe(false);
    expect(r.steps.find((s) => s.id === 'fcm')!.detail).toMatch(/Firebase Cloud Messaging API/);
  });

  it('rede indisponível: mensagem amigável', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const r = await testFirebaseConnection();
    expect(r.ok).toBe(false);
    expect(r.steps.find((s) => s.id === 'auth')!.detail).toMatch(/Sem resposta do Google/);
  });

  it('nunca devolve segredos (chave privada, token de acesso, corpo bruto do Google)', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(200, { access_token: 'ya29.token-secreto', expires_in: 3600 }))
      .mockResolvedValueOnce(reply(403, { error: { status: 'PERMISSION_DENIED', message: 'detalhe-interno-do-google' } }));
    const out = JSON.stringify(await testFirebaseConnection());
    expect(out).not.toContain('PRIVATE KEY');
    expect(out).not.toContain(privateKey.split('\n')[1]!);
    expect(out).not.toContain('ya29.token-secreto');
    expect(out).not.toContain('detalhe-interno-do-google');
  });

  it('detecta o formato da variável sem revelar o conteúdo', () => {
    expect(detectServiceAccountFormat(undefined)).toBe('missing');
    expect(detectServiceAccountFormat(goodEnv)).toBe('json');
    expect(detectServiceAccountFormat(`"${goodEnv}"`)).toBe('json_with_quotes');
    expect(detectServiceAccountFormat(Buffer.from(goodEnv).toString('base64'))).toBe('base64');
    expect(detectServiceAccountFormat('###')).toBe('unknown');
  });
});
