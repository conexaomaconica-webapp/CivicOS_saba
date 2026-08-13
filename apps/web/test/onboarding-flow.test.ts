import { describe, it, expect } from 'vitest';
import {
  validateResponsibleStep,
  hasResponsibleStepErrors,
  validateResponsibleRelationship,
  RESPONSIBLE_RELATIONSHIP_LABELS,
} from '../src/lib/onboarding/onboarding-validation';
import {
  saveResponsibleDraft,
  loadResponsibleDraft,
  clearResponsibleDraft,
  RESPONSIBLE_DRAFT_KEY,
  type ResponsiveStorage,
} from '../src/lib/onboarding/responsible-flow';

function makeStorage(): ResponsiveStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe('validateResponsibleStep · ADV-001 (CRIT-VSC-003)', () => {
  it('aceita dados válidos de proprietário', () => {
    const errors = validateResponsibleStep({
      name: 'João Silva',
      email: 'joao@exemplo.com',
      relationship: 'owner',
    });
    expect(hasResponsibleStepErrors(errors)).toBe(false);
  });

  it('valida campos obrigatórios e relação (CRIT-TRN-023)', () => {
    const errors = validateResponsibleStep({ name: ' ', email: 'invalido', relationship: '' });
    expect(hasResponsibleStepErrors(errors)).toBe(true);
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.relationship).toBeTruthy();
  });

  it('rejeita relação fora do domínio válido', () => {
    expect(validateResponsibleRelationship('admin')).toBeTruthy();
    expect(validateResponsibleRelationship('owner')).toBeNull();
  });

  it('expõe rótulos para as relações declaráveis', () => {
    expect(RESPONSIBLE_RELATIONSHIP_LABELS.owner).toContain('Proprietário');
    expect(RESPONSIBLE_RELATIONSHIP_LABELS.representative).toContain('Representante');
  });
});

describe('saveResponsibleDraft · ADV-001', () => {
  it('persiste e recupera o rascunho do responsável', () => {
    const storage = makeStorage();
    const saved = saveResponsibleDraft(
      { name: 'Maria', email: 'maria@exemplo.com', relationship: 'representative' },
      storage,
    );

    expect(saved?.savedAt).toBeTruthy();
    expect(storage.getItem(RESPONSIBLE_DRAFT_KEY)).toBeTruthy();

    const loaded = loadResponsibleDraft(storage);
    expect(loaded).toMatchObject({
      name: 'Maria',
      email: 'maria@exemplo.com',
      relationship: 'representative',
    });
  });

  it('retorna null quando não há rascunho prévio', () => {
    expect(loadResponsibleDraft(makeStorage())).toBeNull();
  });

  it('ignora rascunho corrompido', () => {
    const storage = makeStorage();
    storage.setItem(RESPONSIBLE_DRAFT_KEY, '{corrompido');
    expect(loadResponsibleDraft(storage)).toBeNull();
  });

  it('limpa o rascunho', () => {
    const storage = makeStorage();
    saveResponsibleDraft({ name: 'A', email: 'a@b.com', relationship: 'owner' }, storage);
    clearResponsibleDraft(storage);
    expect(loadResponsibleDraft(storage)).toBeNull();
  });
});