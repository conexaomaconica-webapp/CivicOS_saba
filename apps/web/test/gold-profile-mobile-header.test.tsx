// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

(globalThis as { React?: typeof React }).React = React;

// O que interessa é a ESTRUTURA do cabeçalho: os blocos pesados viram marcadores.
vi.mock('@/lib/directory/favorites-context', () => ({ useFavorites: () => ({ isFavorite: () => false, toggleFavorite: () => undefined }) }));
vi.mock('../src/components/public/business/sections/ReferBusinessModal', () => ({ ReferBusinessModal: () => null }));
vi.mock('../src/components/public/business/sections/BusinessAdModal', () => ({ BusinessAdModal: () => null }));
vi.mock('../src/components/public/business/shared/InstitutionalBadges', () => ({ InstitutionalBadges: () => <div data-testid="badges" /> }));
vi.mock('../src/components/public/business/shared/BusinessActionButtons', () => ({ QuickActionBar: () => <div data-testid="quick-actions" /> }));
vi.mock('../src/components/public/business/sections/ProfileContentGrid', () => ({ ProfileContentGrid: () => <div data-testid="content-grid" /> }));
vi.mock('../src/components/public/business/shared/CompanyLogoWithZoom', () => ({
  CompanyLogoWithZoom: ({ className }: { className?: string }) => <div data-testid="logo" className={className} />,
}));

import { GoldBusinessProfile } from '../src/components/public/business/layouts/GoldBusinessProfile';

const COVER = { url: 'https://cdn.exemplo.com/capa.jpg', alt: 'Capa', backgroundColor: null, fitMode: 'cover' };

function profile(withCover: boolean) {
  return {
    plan: { commercialPlan: 'ouro', template: 'ouro' },
    recognition: { verified: true, founder: false, pedraFundamental: true, colunaDeHonra: false, catalog: [] },
    identity: { id: 'b1', slug: 'aretuza-prado', name: 'Aretuza Prado Consultoria e Gestão de Pessoas Ltda', shortDescription: 'Pessoas em primeiro lugar', category: 'Gestão de Pessoas', description: null, logo: null, logoBgColor: null },
    location: { city: 'Feira de Santana', state: 'BA' },
    contacts: {},
    owner: { name: 'Aretuza Prado', communityLabel: 'Ir.', organization: 'Loja Exemplo' },
    media: { cover: withCover ? COVER : null, gallery: [], video: null, heroImageCount: 1 },
    metrics: { views: 1234 },
    certifications: [],
  } as any;
}

afterEach(() => cleanup());

const coverBox = (container: HTMLElement) => container.querySelector('img')!.parentElement as HTMLElement;
const has = (el: Element, ...classes: string[]) => classes.every((c) => el.classList.contains(c));

describe('cabeçalho do plano Acácia: celular com faixa de capa independente', () => {
  it('COM capa: a capa é uma faixa em fluxo normal (proporção 2:1) e só vira fundo absoluto a partir de md', () => {
    const { container } = render(<GoldBusinessProfile profile={profile(true)} />);
    const box = coverBox(container);
    expect(has(box, 'relative', 'w-full', 'aspect-[2/1]', 'md:absolute', 'md:inset-0', 'md:aspect-auto')).toBe(true);
    expect(box.classList.contains('absolute')).toBe(false); // sem posição absoluta no celular
  });

  it('nenhum texto (nome, categoria, responsável) fica DENTRO da faixa da capa', () => {
    const { container } = render(<GoldBusinessProfile profile={profile(true)} />);
    const box = coverBox(container);
    expect(box.contains(screen.getByRole('heading', { level: 1 }))).toBe(false);
    expect(box.textContent).toBe('');
  });

  it('o painel de dados vem depois da capa, sobe sobre ela com cantos arredondados e é transparente em md+', () => {
    const { container } = render(<GoldBusinessProfile profile={profile(true)} />);
    const box = coverBox(container);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(box.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const panel = h1.closest('div.rounded-t-\\[26px\\]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(has(panel, '-mt-6', 'bg-[#4B161B]', 'md:mt-0', 'md:rounded-none', 'md:bg-transparent')).toBe(true);
  });

  it('celular: os botões NÃO ficam sobre a foto (a pessoa da capa não é coberta); só aparecem flutuantes a partir de md', () => {
    const { container } = render(<GoldBusinessProfile profile={profile(true)} />);
    const box = coverBox(container);
    expect(box.querySelector('button')).toBeNull(); // nenhum botão dentro da faixa da capa
    const floating = container.querySelector('div.absolute.top-4') as HTMLElement;
    expect(has(floating, 'hidden', 'md:flex')).toBe(true); // escondidos no celular
    expect(floating.querySelectorAll('button')).toHaveLength(3);
    const inline = Array.from(container.querySelectorAll('div')).find((d) => d.classList.contains('md:hidden') && d.querySelector('button')) as HTMLElement;
    expect(inline).toBeTruthy(); // linha do painel: só no celular
    expect(inline.querySelectorAll('button')).toHaveLength(3);
  });

  it('SEM capa: faixa baixa em bordô (h-24), sem a proporção 2:1', () => {
    const { container } = render(<GoldBusinessProfile profile={profile(false)} />);
    const box = coverBox(container);
    expect(has(box, 'h-24')).toBe(true);
    expect(box.classList.contains('aspect-[2/1]')).toBe(false);
  });

  it('desktop preservado: altura mínima da seção a partir de md e logo grande em md/lg', () => {
    const { container } = render(<GoldBusinessProfile profile={profile(true)} />);
    const section = container.querySelector('section')!;
    expect(has(section, 'md:min-h-[420px]', 'lg:min-h-[440px]')).toBe(true);
    expect(section.className).not.toMatch(/(^|\s)min-h-\[380px\]/);
    const logo = screen.getByTestId('logo');
    expect(has(logo, 'w-24', 'md:w-36', 'lg:w-40')).toBe(true);
  });

  it('mantém título completo, categoria, selos, local, visualizações, responsável, loja e os 3 botões', () => {
    render(<GoldBusinessProfile profile={profile(true)} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Aretuza Prado Consultoria');
    expect(screen.getByText('Gestão de Pessoas')).toBeTruthy();
    expect(screen.getByTestId('badges')).toBeTruthy();
    expect(screen.getByText(/Feira de Santana/)).toBeTruthy();
    expect(screen.getByText(/1\.234 visualizações/)).toBeTruthy();
    expect(screen.getByText(/Ir\. Aretuza Prado/)).toBeTruthy();
    expect(screen.getByText('Loja:')).toBeTruthy();
    // Os 3 botões existem em dois lugares: flutuantes (md+) e em linha no painel (celular).
    for (const label of ['Indicar', 'Favoritar', 'Ver Anúncio']) expect(screen.getAllByText(label)).toHaveLength(2);
    expect(screen.getByTestId('quick-actions')).toBeTruthy();
    expect(screen.getByTestId('content-grid')).toBeTruthy();
  });
});
