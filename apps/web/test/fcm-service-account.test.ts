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
