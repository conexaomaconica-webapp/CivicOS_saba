// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { toPublicBusinessPresentation } from '../src/lib/business/public-business-presentation';

const setCount = vi.fn();
vi.mock('@/lib/admin/admin-businesses-service', () => ({ setBusinessHeroImageCountAction: (...args: unknown[]) => setCount(...args) }));

import { HeroImageCountControl } from '../src/components/admin/HeroImageCountControl';

// O componente usa o runtime JSX automático do Next; o Vitest deste projeto usa o clássico.
(globalThis as { React?: typeof React }).React = React;

const baseRow = {
  tenant_slug: 'conexao-maconica',
  business_slug: 'optica',
  business_name: 'Óptica',
  description: 'x',
  company_type: 'commercial',
  logo_url: null,
  primary_category_slug: 'servicos',
  primary_category_name: 'Serviços',
  locations: [],
  contacts: [],
  business_hours: [],
  media: [],
  is_founder: false,
  is_verified: false,
  effective_plan_code: 'prata',
  responsible: null,
} as never;

describe('apresentação pública: media.heroImageCount', () => {
  const countOf = (hero_image_count: unknown) => toPublicBusinessPresentation({ ...(baseRow as object), hero_image_count } as never, []).media.heroImageCount;

  it('padrão é 1 imagem quando não há valor ou o valor é inválido', () => {
    for (const bad of [undefined, null, '', 'abc', '<script>', 'NaN']) expect(countOf(bad), String(bad)).toBe(1);
  });
  it('aceita de 1 a 4 e limita valores fora da faixa', () => {
    expect(countOf('1')).toBe(1);
    expect(countOf('2')).toBe(2);
    expect(countOf('3')).toBe(3);
    expect(countOf('4')).toBe(4);
    expect(countOf('0')).toBe(1);
    expect(countOf('-5')).toBe(1);
    expect(countOf('9')).toBe(4);
    expect(countOf('99')).toBe(4);
  });
});

describe('prontuário 360: controle da quantidade de imagens do topo', () => {
  afterEach(() => { cleanup(); setCount.mockReset(); });

  it('mostra as 4 opções com a atual marcada e salva a nova escolha', async () => {
    setCount.mockResolvedValue({ success: true, count: 3 });
    const { getAllByRole, findByText } = render(<HeroImageCountControl businessId="b1" initial={1} planCode="prata" />);
    const radios = getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', 'false']);
    fireEvent.click(radios[2]!);
    await findByText(/Salvo/);
    expect(setCount).toHaveBeenCalledWith('b1', 3);
    expect(getAllByRole('radio')[2]!.getAttribute('aria-checked')).toBe('true');
  });

  it('se o servidor recusar, volta à quantidade anterior e mostra o erro', async () => {
    setCount.mockResolvedValue({ success: false, error: 'Sem permissão.' });
    const { getAllByRole, findByText } = render(<HeroImageCountControl businessId="b1" initial={2} planCode="prata" />);
    fireEvent.click(getAllByRole('radio')[3]!);
    await findByText('Sem permissão.');
    await waitFor(() => expect(getAllByRole('radio')[1]!.getAttribute('aria-checked')).toBe('true'));
  });

  it('clicar na opção já escolhida não chama o servidor', () => {
    const { getAllByRole } = render(<HeroImageCountControl businessId="b1" initial={1} planCode="prata" />);
    fireEvent.click(getAllByRole('radio')[0]!);
    expect(setCount).not.toHaveBeenCalled();
  });

  it('valor inicial fora da faixa é ajustado; avisa quando a empresa não está no Compasso', () => {
    const { getAllByRole, container } = render(<HeroImageCountControl businessId="b1" initial={9} planCode="bronze" />);
    expect(getAllByRole('radio')[3]!.getAttribute('aria-checked')).toBe('true');
    expect(container.textContent).toContain('não está no Compasso');
    cleanup();
    expect(render(<HeroImageCountControl businessId="b1" initial={1} planCode="prata" />).container.textContent).not.toContain('não está no Compasso');
  });
});
