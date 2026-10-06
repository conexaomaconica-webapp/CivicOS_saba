import { describe, expect, it } from 'vitest';
import { defaultFraming, framedSize, FRAMING_SPEC, MAX_ZOOM, MIN_ZOOM } from '../src/lib/media/image-framing';

const wide = { naturalWidth: 2000, naturalHeight: 1000 };

describe('enquadramento de imagens', () => {
  it('cada tipo tem o formato e o ajuste padrão certos', () => {
    expect(FRAMING_SPEC.logo).toMatchObject({ width: 1000, height: 1000, fit: 'contain' });
    expect(FRAMING_SPEC.cover).toMatchObject({ width: 1920, height: 720, fit: 'cover' });
    expect(defaultFraming('logo')).toMatchObject({ zoom: 1, offsetX: 0.5, offsetY: 0.5, fit: 'contain' });
  });

  it('preencher cobre o quadro inteiro; encaixar mostra a imagem toda', () => {
    const cover = framedSize(wide, 1000, 1000, { ...defaultFraming('gallery'), fit: 'cover', zoom: 1 });
    expect(cover.height).toBe(1000); // altura preenche; a largura passa do quadro (corte lateral)
    expect(cover.width).toBeGreaterThan(1000);

    const contain = framedSize(wide, 1000, 1000, { ...defaultFraming('gallery'), fit: 'contain', zoom: 1 });
    expect(contain.width).toBe(1000); // largura encaixa; sobra espaço em cima e embaixo
    expect(contain.height).toBeLessThan(1000);
  });

  it('o zoom é limitado entre 0,4x e 3x', () => {
    const base = framedSize(wide, 1000, 1000, { ...defaultFraming('logo'), zoom: 1 });
    expect(framedSize(wide, 1000, 1000, { ...defaultFraming('logo'), zoom: 99 }).width).toBeCloseTo(base.width * MAX_ZOOM);
    expect(framedSize(wide, 1000, 1000, { ...defaultFraming('logo'), zoom: 0 }).width).toBeCloseTo(base.width * MIN_ZOOM);
  });
});
