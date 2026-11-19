// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

(globalThis as { React?: typeof React }).React = React;

import { BusinessLocationCard } from '../src/components/public/business/sections/BusinessLocationCard';
import { toPublicBusinessPresentation } from '../src/lib/business/public-business-presentation';

afterEach(() => cleanup());

const base = { address: 'Rua das Flores, Centro, Feira de Santana, BA', city: 'Feira de Santana', state: 'BA', mapImage: null };

describe('cartão de localização da página da empresa', () => {
  it('sem coordenadas: mapa e rota pelo endereço em texto (como antes)', () => {
    render(<BusinessLocationCard location={{ ...base, latitude: null, longitude: null }} businessName="Empresa X" />);
    const iframe = screen.getByTitle(/Mapa de localização/) as HTMLIFrameElement;
    expect(iframe.src).toContain(encodeURIComponent(base.address));
    expect(screen.getByRole('link', { name: /Traçar rota/ }).getAttribute('href')).toContain(encodeURIComponent('Empresa X, ' + base.address));
  });

  it('com coordenadas (digitadas no prontuário 360): o ponto exato marca o mapa e a rota', () => {
    render(<BusinessLocationCard location={{ ...base, latitude: -12.2664, longitude: -38.9663 }} businessName="Empresa X" />);
    const iframe = screen.getByTitle(/Mapa de localização/) as HTMLIFrameElement;
    expect(decodeURIComponent(iframe.src)).toContain('q=-12.2664,-38.9663');
    expect(iframe.src).toContain('z=17');
    expect(decodeURIComponent(screen.getByRole('link', { name: /Traçar rota/ }).getAttribute('href')!)).toContain('query=-12.2664,-38.9663');
  });

  it('sem endereço: o cartão não aparece', () => {
    const { container } = render(<BusinessLocationCard location={null} businessName="Empresa X" />);
    expect(container.innerHTML).toBe('');
  });
});

function presentationWith(locations: unknown[]) {
  return toPublicBusinessPresentation({
    business_id: 'b1', business_slug: 'empresa-x', business_name: 'Empresa X', effective_plan_code: 'ouro',
    locations,
  } as any);
}

describe('endereço montado a partir do cadastro', () => {
  it('rua estruturada + cidade + UF (como o prontuário 360 grava)', () => {
    const p = presentationWith([{ street: 'Rua das Flores, 100', number: null, city: 'Feira de Santana', state: 'BA', is_headquarters: true, latitude: -12.2, longitude: -38.9 }]);
    expect(p.location).toMatchObject({ address: 'Rua das Flores, 100, Feira de Santana, BA', latitude: -12.2, longitude: -38.9 });
  });

  it('endereço antigo em texto livre (coluna address, sem rua): continua aparecendo', () => {
    const p = presentationWith([{ address: 'Av. Getúlio Vargas, 500', city: 'Feira de Santana', state: 'BA' }]);
    expect(p.location?.address).toBe('Av. Getúlio Vargas, 500, Feira de Santana, BA');
  });

  it('a matriz tem prioridade quando há mais de um endereço', () => {
    const p = presentationWith([
      { street: 'Filial', city: 'Salvador', state: 'BA', is_headquarters: false },
      { street: 'Matriz', city: 'Feira de Santana', state: 'BA', is_headquarters: true },
    ]);
    expect(p.location?.address).toContain('Matriz');
  });
});
