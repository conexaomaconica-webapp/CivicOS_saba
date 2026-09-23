import { describe, expect, it } from 'vitest';
import { optimizeImageForUpload } from '../src/lib/media/optimize-image';

describe('optimizeImageForUpload', () => {
  it('preserva SVG vetorial que já está dentro do limite', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'selo.svg', { type: 'image/svg+xml' });
    await expect(optimizeImageForUpload(file, { maxBytes: 1024 })).resolves.toBe(file);
  });

  it('recusa SVG acima do limite sem rasterizar silenciosamente', async () => {
    const file = new File(['x'.repeat(2048)], 'selo.svg', { type: 'image/svg+xml' });
    await expect(optimizeImageForUpload(file, { maxBytes: 1024 })).rejects.toThrow('SVG excede');
  });

  it('recusa arquivo que não é imagem', async () => {
    const file = new File(['conteudo'], 'arquivo.txt', { type: 'text/plain' });
    await expect(optimizeImageForUpload(file, { maxBytes: 1024 })).rejects.toThrow('imagem válido');
  });
});
