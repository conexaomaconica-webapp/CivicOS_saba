// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('@/lib/directory/favorites-context', () => ({ useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }) }));
vi.mock('../src/components/public/business/sections/ReferBusinessModal', () => ({ ReferBusinessModal: () => null }));
vi.mock('../src/components/public/business/sections/BusinessAdModal', () => ({ BusinessAdModal: () => null }));
vi.mock('../src/components/public/business/shared/InstitutionalBadges', () => ({ InstitutionalBadges: () => null }));
vi.mock('../src/components/public/business/shared/BusinessActionButtons', () => ({ QuickActionBar: () => null }));
vi.mock('../src/components/public/business/shared/CompanyLogoWithZoom', () => ({ CompanyLogoWithZoom: () => null }));
vi.mock('../src/components/public/business/sections/ProfileContentGrid', () => ({ ProfileContentGrid: () => null }));

import { SilverBusinessProfile } from '../src/components/public/business/layouts/SilverBusinessProfile';

// O componente usa o runtime JSX automático do Next; o Vitest deste projeto usa o clássico.
(globalThis as { React?: typeof React }).React = React;

const asset = (n: number) => ({ id: `m${n}`, type: 'image', url: `https://cdn.x/${n}.webp`, alt: `Foto ${n}` });

const profile = (media: Record<string, unknown>) =>
  ({
    identity: { id: 'b1', slug: 'optica', name: 'Óptica Circulô', category: 'Óptica', description: '', logo: null },
    recognition: {},
    location: { city: 'Feira de Santana', state: 'BA' },
    contacts: {},
    owner: null,
    media,
    plan: { template: 'prata', commercialPlan: 'compasso' },
  }) as never;

const heroImgs = (container: HTMLElement) => Array.from(container.querySelectorAll('img')).map((i) => i.getAttribute('src'));

describe('layout Prata: topo do perfil', () => {
  afterEach(() => cleanup());

  it('padrão: só a capa, mesmo com fotos na galeria (enviar foto não monta mosaico)', () => {
    const { container } = render(
      <SilverBusinessProfile profile={profile({ cover: asset(0), gallery: [asset(1), asset(2), asset(3)], video: null })} />,
    );
    expect(heroImgs(container)).toEqual(['https://cdn.x/0.webp']);
  });

  it('heroImageCount 1 explícito também mostra só a capa', () => {
    const { container } = render(
      <SilverBusinessProfile profile={profile({ cover: asset(0), gallery: [asset(1)], video: null, heroImageCount: 1 })} />,
    );
    expect(heroImgs(container)).toEqual(['https://cdn.x/0.webp']);
  });

  it('sem capa: usa a primeira foto da galeria (uma só)', () => {
    const { container } = render(
      <SilverBusinessProfile profile={profile({ cover: null, gallery: [asset(1), asset(2)], video: null })} />,
    );
    expect(heroImgs(container)).toEqual(['https://cdn.x/1.webp']);
  });

  it('quantidade escolhida na empresa: 2, 3 e 4 imagens = capa + as primeiras fotos da galeria, na ordem', () => {
    const gallery = [asset(1), asset(2), asset(3), asset(4), asset(5)];
    for (const count of [2, 3, 4]) {
      const { container, unmount } = render(<SilverBusinessProfile profile={profile({ cover: asset(0), gallery, video: null, heroImageCount: count })} />);
      expect(heroImgs(container), 'quantidade ' + count).toEqual(['https://cdn.x/0.webp', 'https://cdn.x/1.webp', 'https://cdn.x/2.webp', 'https://cdn.x/3.webp'].slice(0, count));
      unmount();
    }
  });

  it('quantidade maior que as imagens disponíveis: mostra só as que existem', () => {
    const { container } = render(<SilverBusinessProfile profile={profile({ cover: asset(0), gallery: [asset(1)], video: null, heroImageCount: 4 })} />);
    expect(heroImgs(container)).toEqual(['https://cdn.x/0.webp', 'https://cdn.x/1.webp']);
  });

  it('valor inválido ou acima de 4 não quebra: limita entre 1 e 4', () => {
    const many = [asset(1), asset(2), asset(3), asset(4), asset(5)];
    const high = render(<SilverBusinessProfile profile={profile({ cover: asset(0), gallery: many, video: null, heroImageCount: 99 })} />);
    expect(heroImgs(high.container)).toHaveLength(4);
    high.unmount();
    const low = render(<SilverBusinessProfile profile={profile({ cover: asset(0), gallery: many, video: null, heroImageCount: -3 })} />);
    expect(heroImgs(low.container)).toEqual(['https://cdn.x/0.webp']);
  });

  it('sem nenhuma imagem: nenhuma imagem no topo (sem erro)', () => {
    const { container } = render(<SilverBusinessProfile profile={profile({ cover: null, gallery: [], video: null })} />);
    expect(heroImgs(container)).toEqual([]);
  });
});
