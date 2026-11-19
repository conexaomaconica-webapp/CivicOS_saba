// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

(globalThis as { React?: typeof React }).React = React;
vi.mock('../src/components/public/business/shared/ImageZoomModal', () => ({ ImageZoomModal: () => null }));

import { CertificationBadges, CertificationLogo, certificationScale } from '../src/components/public/business/shared/CertificationBadges';

afterEach(() => cleanup());

describe('selo de certificação: sem caixa, sem fundo branco; o zoom aumenta o tamanho', () => {
  it('fator de tamanho: 100–300% vira 1–3 (fora disso, limita; vazio = 1)', () => {
    expect(certificationScale(100)).toBe(1);
    expect(certificationScale(150)).toBe(1.5);
    expect(certificationScale(300)).toBe(3);
    expect(certificationScale(999)).toBe(3);
    expect(certificationScale(20)).toBe(1);
    expect(certificationScale(undefined)).toBe(1);
    expect(certificationScale(null)).toBe(1);
  });

  it('a logo é a própria imagem: nenhum quadro, fundo branco, borda ou corte em volta', () => {
    const { container } = render(<CertificationLogo url="https://x/iso.png" zoom={200} alt="ISO" className="h-[calc(3.5rem*var(--z))]" />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(container.children).toHaveLength(1); // sem <div> envolvendo
    expect(img.className).not.toMatch(/bg-white|overflow-hidden|border|rounded/);
    expect(img.style.getPropertyValue('--z')).toBe('2'); // o zoom vira fator de TAMANHO, não transform dentro da caixa
    expect(img.style.transform).toBe('');
    expect(img.className).toContain('h-[calc(3.5rem*var(--z))]');
  });

  it('no cabeçalho (inline): a altura-base é multiplicada pelo zoom de cada certificação', () => {
    render(<CertificationBadges variant="inline" businessName="Empresa X" certifications={[{ id: '1', url: 'https://x/a.png', zoom_percent: 100 }, { id: '2', url: 'https://x/b.png', zoom_percent: 250 }]} />);
    const imgs = screen.getAllByRole('img') as HTMLImageElement[];
    expect(imgs.map((i) => i.style.getPropertyValue('--z'))).toEqual(['1', '2.5']);
    for (const img of imgs) {
      expect(img.className).toMatch(/h-\[calc\(3\.5rem\*var\(--z\)\)\]/);
      expect(img.parentElement!.className).not.toMatch(/bg-white|overflow-hidden|border/);
    }
  });

  it('card lateral: mesma regra, altura-base maior, e o card continua bordô', () => {
    const { container } = render(<CertificationBadges variant="card" certifications={[{ id: '1', url: 'https://x/a.png', zoom_percent: 150 }]} />);
    expect(container.querySelector('section')!.className).toContain('bg-[#3B0B14]');
    expect((screen.getByRole('img') as HTMLImageElement).className).toMatch(/h-\[calc\(6rem\*var\(--z\)\)\]/);
  });

  it('sem certificações: não renderiza nada', () => {
    const { container } = render(<CertificationBadges certifications={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
