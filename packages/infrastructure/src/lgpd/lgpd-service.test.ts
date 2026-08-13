import { describe, it, expect } from 'vitest';

import type { LgpdRepository } from './lgpd-repository';
import type {
  AcceptanceRecord,
  ConsentRecord,
  LegalDocument,
  LegalDocumentVersion,
  PersonalDataExport,
} from './lgpd-types';
import { LgpdError, LgpdService } from './lgpd-service';

const NOW = '2026-08-11T12:00:00.000Z';

function versionRegistry(rows?: AcceptanceRecord[], consents?: ConsentRecord[]): LgpdRepository {
  const version: LegalDocumentVersion = {
    id: 'ver_1',
    documentId: 'doc_1',
    code: 'terms',
    version: '2026.1',
    contentMarkdown: '# Termos de Uso',
    effectiveDate: '2026-01-01T00:00:00.000Z',
  };
  const acceptanceRows = rows ?? [];
  const consentRows = consents ?? [];

  return {
    ensureDocument: (input): Promise<LegalDocument> => Promise.resolve({ id: 'doc_1', code: input.code, title: input.title }),
    publishVersion: (input) => Promise.resolve({ ...version, version: input.version, code: input.code }),
    getDocumentVersion: (code, vers) => Promise.resolve(code === 'terms' && vers === '2026.1' ? version : null),
    createAcceptance: (input): Promise<AcceptanceRecord> => Promise.resolve({
      id: 'acc_1',
      tenantId: input.tenantId,
      userId: input.userId,
      documentCode: 'terms',
      documentVersionId: input.documentVersionId,
      documentVersion: '2026.1',
      sessionEvidenceId: input.sessionEvidenceId,
      evidenceMetadata: input.evidenceMetadata ?? {},
      acceptedAt: NOW,
    }),
    createConsent: (input): Promise<ConsentRecord> => Promise.resolve({
      id: 'con_1',
      tenantId: input.tenantId,
      userId: input.userId,
      purpose: input.purpose,
      granted: input.granted ?? true,
      createdAt: NOW,
    }),
    withdrawConsent: (id, reason): Promise<ConsentRecord | null> => {
      const consent = consentRows.find((c) => c.id === id);
      return Promise.resolve(consent === undefined ? null : { ...consent, granted: false, withdrawnReason: reason, withdrawnAt: NOW });
    },
    listConsents: () => Promise.resolve(consentRows),
    listAcceptances: () => Promise.resolve(acceptanceRows),
    exportPersonalData: (tenantId, userId): Promise<PersonalDataExport> => Promise.resolve({
      userId,
      email: 'user@example.com',
      profile: {},
      consents: consentRows,
      acceptances: acceptanceRows,
      tenantRoles: [],
      businessMemberships: [],
    }),
  };
}

describe('LgpdService', () => {
  it('hashEvidence produces a stable SHA-256 digest', () => {
    const service = new LgpdService(versionRegistry(), () => new Date(NOW));

    const a = service.hashEvidence(['terms', '2026.1', 'user_1', NOW]);
    const b = service.hashEvidence(['terms', '2026.1', 'user_1', NOW]);

    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(service.hashEvidence(['terms', '2026.1', 'user_2', NOW]));
  });

  it('records an acceptance of a published version with minimized evidence', async () => {
    const service = new LgpdService(versionRegistry(), () => new Date(NOW));

    const acceptance = await service.acceptDocument('tnt_1', 'user_1', 'terms', '2026.1');

    expect(acceptance.documentVersion).toBe('2026.1');
    expect(acceptance.sessionEvidenceId).toMatch(/^[a-f0-9]{64}$/);
    expect(acceptance.sessionEvidenceId).not.toContain('user_1');
  });

  it('rejects acceptance of an unpublished document version', async () => {
    const service = new LgpdService(versionRegistry(), () => new Date(NOW));

    await expect(
      service.acceptDocument('tnt_1', 'user_1', 'terms', '2030.0'),
    ).rejects.toThrow(LgpdError);
  });

  it('grants and withdraws consent by purpose', async () => {
    const granted = { id: 'con_1', tenantId: 'tnt_1', userId: 'user_1', purpose: 'marketing', granted: true, createdAt: NOW };
    const service = new LgpdService(versionRegistry([], [granted]), () => new Date(NOW));

    const withdrawn = await service.withdrawConsent('tnt_1', 'user_1', 'marketing', 'não quero');

    expect(withdrawn.granted).toBe(false);
    expect(withdrawn.withdrawnReason).toBe('não quero');
  });

  it('is idempotent when the consent was already withdrawn', async () => {
    const withdrawnRecord: ConsentRecord = {
      id: 'con_1',
      tenantId: 'tnt_1',
      userId: 'user_1',
      purpose: 'marketing',
      granted: false,
      withdrawnAt: NOW,
      withdrawnReason: 'não quero',
      createdAt: NOW,
    };
    const service = new LgpdService(versionRegistry([], [withdrawnRecord]), () => new Date(NOW));

    const result = await service.withdrawConsent('tnt_1', 'user_1', 'marketing');

    expect(result.granted).toBe(false);
  });

  it('throws consent_not_found when revoking an unknown purpose', async () => {
    const service = new LgpdService(versionRegistry(), () => new Date(NOW));

    await expect(
      service.withdrawConsent('tnt_1', 'user_1', 'newsletter'),
    ).rejects.toThrow('No consent found');
  });

  it('exports personal data for the LGPD portability right', async () => {
    const acceptance = {
      id: 'acc_1',
      tenantId: 'tnt_1',
      userId: 'user_1',
      documentCode: 'terms',
      documentVersionId: 'ver_1',
      documentVersion: '2026.1',
      sessionEvidenceId: 'a1b2c3',
      evidenceMetadata: {},
      acceptedAt: NOW,
    };
    const service = new LgpdService(versionRegistry([acceptance], []), () => new Date(NOW));

    const exportData = await service.exportPersonalData('tnt_1', 'user_1');

    expect(exportData.userId).toBe('user_1');
    expect(exportData.acceptances).toHaveLength(1);
  });
});