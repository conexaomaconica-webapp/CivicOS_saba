import { describe, it, expect, vi } from 'vitest';
import manifest from '../src/app/manifest';
import { generateRootMetadata } from '../src/lib/seo/root-metadata';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'localhost:3000' }),
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
  }),
}));

describe('FASE MOBILE 1 — Fundação PWA (Conexão Maçônica)', () => {
  it('1. Manifesto Web possui o nome, cores e URLs oficiais', () => {
    const manifestObj = manifest();

    expect(manifestObj.name).toBe('Conexão Maçônica');
    expect(manifestObj.short_name).toBe('Conexão');
    expect(manifestObj.start_url).toBe('/guia');
    expect(manifestObj.display).toBe('standalone');

    // Cores Oficiais da Conexão Maçônica
    expect(manifestObj.background_color).toBe('#F3EEDD');
    expect(manifestObj.theme_color).toBe('#4B161B');

    // Ícones declarados
    expect(manifestObj.icons).toBeDefined();
    expect(manifestObj.icons?.length).toBeGreaterThanOrEqual(3);

    const sizes = manifestObj.icons?.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(sizes).toContain('180x180');
  });

  it('2. Metadados do Next.js incluem o manifesto, theme-color e suporte a iOS', async () => {
    const metadata = await generateRootMetadata();

    expect(metadata.manifest).toBe('/manifest.webmanifest');
    expect(metadata.applicationName).toBeDefined();
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Conexão',
    });
  });

  it('3. Service Worker leve existe e bloqueia cache de rotas privadas/sensíveis', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');

    // Validações de Segurança & LGPD
    expect(swContent).toContain('/admin/');
    expect(swContent).toContain('/master/');
    expect(swContent).toContain('/minha-conta/');
    expect(swContent).toContain('/anunciante/');
    expect(swContent).toContain('/cadastro/');
    expect(swContent).toContain('/api/');
    expect(swContent).toContain('pagamentos');
    expect(swContent).toContain('contratos');

    // Estratégia de Navegação Segura
    expect(swContent).toContain("request.mode === 'navigate'");
    expect(swContent).toContain('conexao-pwa-v1');
  });
});
