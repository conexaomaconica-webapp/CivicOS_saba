import { describe, it, expect } from 'vitest';
import {
  expandPlans,
  expandRecognitions,
  expandRelationships,
  parseGeoCookie,
  planLabel,
  relationshipLabel,
  RELATIONSHIP_OPTIONS,
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

  it('vínculo maçônico: só Maçom, Cunhada e Sobrinho(a); ids antigos são convertidos e os removidos descartados', () => {
    expect(RELATIONSHIP_OPTIONS.map((o) => o.label)).toEqual(['Maçom', 'Cunhada', 'Sobrinho(a)']);
    expect(expandRelationships(['macom', 'cunhada'])).toEqual(['macom', 'cunhada']);
    expect(expandRelationships(['brother'])).toEqual(['macom']);
    expect(expandRelationships(['wife', 'child'])).toEqual(['cunhada', 'sobrinho']);
    expect(expandRelationships(['family'])).toEqual(['cunhada', 'sobrinho']);
    expect(expandRelationships(['representative', 'staff', 'institutional'])).toEqual([]);
    expect(relationshipLabel('wife')).toBe('Cunhada');
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
