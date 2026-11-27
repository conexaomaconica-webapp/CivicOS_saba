import { describe, expect, it } from 'vitest';
import { sortBusinessesBySearchRelevance } from '../search-relevance';

describe('sortBusinessesBySearchRelevance', () => {
  it('prioritizes business name prefix match over surname substring match in responsible/reference', () => {
    const items = [
      {
        id: '1',
        name: 'Comandos',
        category_name: 'Segurança e terceirização',
        responsible_name: 'Irmão: Douglas Ramos',
        is_pedra_fundamental: true,
        effective_plan_code: 'acacia',
      },
      {
        id: '2',
        name: 'Aretuza Prado',
        category_name: 'Arquitetura e interiores',
        responsible_name: 'Cunhada: Aretuza de Lemos Prado Ramos',
        reference_mason_name: 'Ir. Douglas Dantas Ramos',
        effective_plan_code: 'acacia',
      },
      {
        id: '3',
        name: 'DeltaPrev',
        category_name: 'Engenharia e Segurança Contra Incêndio',
        responsible_name: 'Ir.: Douglas Ramos',
        effective_plan_code: 'compasso',
      },
      {
        id: '4',
        name: 'AMO Clínica Veterinária',
        category_name: 'Serviços Veterinários',
        effective_plan_code: 'esquadro',
      },
    ];

    const sorted = sortBusinessesBySearchRelevance(items, 'AMO');
    expect(sorted.map((item) => item.name)).toEqual([
      'AMO Clínica Veterinária',
      'Comandos',
      'Aretuza Prado',
      'DeltaPrev',
    ]);
  });

  it('keeps masonic member results prioritized when searching by member name', () => {
    const items = [
      {
        id: '1',
        name: 'AMO Clínica Veterinária',
        category_name: 'Serviços Veterinários',
      },
      {
        id: '2',
        name: 'Comandos',
        responsible_name: 'Douglas Ramos',
      },
    ];

    const sorted = sortBusinessesBySearchRelevance(items, 'Ir. Douglas');
    expect(sorted[0]?.name).toBe('Comandos');
  });
});

