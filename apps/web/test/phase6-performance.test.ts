import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SPRINT 6 — Testes de Performance & Core Web Vitals', () => {
  const rootLayoutPath = path.resolve(__dirname, '../src/app/layout.tsx');
  const carouselPath = path.resolve(__dirname, '../src/components/public/directory/DirectoryCarousel.tsx');
  const lodgeCardPath = path.resolve(__dirname, '../src/components/public/directory/LodgeCard.tsx');
  const businessCardPath = path.resolve(__dirname, '../src/components/public/directory/BusinessCard.tsx');

  it('1. RootLayout possui preconnect e dns-prefetch para o Supabase Storage', () => {
    const content = fs.readFileSync(rootLayoutPath, 'utf-8');
    expect(content).toContain('preconnect');
    expect(content).toContain('dns-prefetch');
    expect(content).toContain('supabaseOrigin');
  });

  it('2. DirectoryCarousel utiliza estratégia eager para a imagem LCP do banner primário', () => {
    const content = fs.readFileSync(carouselPath, 'utf-8');
    expect(content).toContain('activeIndex === 0 ? \'eager\' : \'lazy\'');
    expect(content).toContain('decoding="async"');
  });

  it('3. LodgeCard e BusinessCard usam carregamento assíncrono (decoding="async" e loading="lazy")', () => {
    const lodgeContent = fs.readFileSync(lodgeCardPath, 'utf-8');
    expect(lodgeContent).toContain('loading="lazy"');
    expect(lodgeContent).toContain('decoding="async"');

    const businessContent = fs.readFileSync(businessCardPath, 'utf-8');
    expect(businessContent).toContain('loading="lazy"');
    expect(businessContent).toContain('decoding="async"');
  });
});
