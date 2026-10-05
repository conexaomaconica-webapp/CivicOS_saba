import { describe, it, expect } from 'vitest';
import {
  expandPlans,
  expandRecognitions,
  expandRelationships,
  parseGeoCookie,
  planLabel,
  relationshipLabel,
} from '@/lib/directory/business-filters';

describe('filtros de /guia/empresas', () => {
  it('plano: cada opção cobre todos os códigos possíveis no banco', () => {
    expect(expandPlans(['ouro'])).toEqual(expect.arrayContaining(['ouro', 'acacia', 'gold']));
    expect(expandPlans(['prata'])).toEqual(expect.arrayContaining(['prata', 'compasso']));
    expect(expandPlans(['bronze'])).toEqual(expect.arrayContaining(['bronze', 'esquadro']));
    expect(expandPlans(['prata', 'bronze']).length).toBeGreaterThanOrEqual(4);
  });

  it('plano: rótulo canônico', () => {
    expect(planLabel('ouro')).toBe('Acácia');
    expect(planLabel('prata')).toBe('Compasso');
    expect(planLabel('bronze')).toBe('Esquadro');
  });

  it('vínculo maçônico: converte para os tipos reais do banco', () => {
    expect(expandRelationships(['brother'])).toEqual(['owner', 'equity_partner']);
    expect(expandRelationships(['representative'])).toEqual(['sales_representative', 'authorized_agent']);
    expect(expandRelationships(['wife', 'child'])).toEqual(['family_owner']);
    expect(expandRelationships(['owner'])).toEqual(['owner']);
    expect(relationshipLabel('wife')).toContain('Familiar');
  });

  it('selos: Coluna de Honra usa a chave do banco', () => {
    expect(expandRecognitions(['pedra_fundamental', 'coluna_honra'])).toEqual(['pedra_fundamental', 'coluna_de_honra']);
  });

  it('cookie de localização', () => {
    expect(parseGeoCookie('-12.971,-38.501')).toEqual({ lat: -12.971, lng: -38.501 });
    expect(parseGeoCookie(encodeURIComponent('-12.971,-38.501'))).toEqual({ lat: -12.971, lng: -38.501 });
    expect(parseGeoCookie('abc,def')).toBeNull();
    expect(parseGeoCookie('120,10')).toBeNull();
    expect(parseGeoCookie(undefined)).toBeNull();
  });
});
