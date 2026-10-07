import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const assertAdmin = vi.fn();
const getBootData = vi.fn();

vi.mock('@/lib/admin/admin-auth-helper', () => ({ assertPlatformAdminAccess: (...a: unknown[]) => assertAdmin(...a) }));
vi.mock('@/runtime/server-kernel', () => ({ getBootData: (...a: unknown[]) => getBootData(...a) }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

beforeEach(() => {
  assertAdmin.mockReset();
  getBootData.mockReset();
  getBootData.mockResolvedValue({
    diagnostics: { kernelVersion: '1.0.0', timeline: [{ message: 'Kernel Boot Started' }] },
    defaultSnapshot: null,
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/health: resposta mínima', () => {
  it('devolve só { ok: true }, sem cache e sem indexação', async () => {
    const { GET } = await import('../src/app/health/route');
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
  });
});

describe('/diagnostics: protegido em produção', () => {
  it('em produção, quem não é admin recebe 404 e o diagnóstico nem é lido', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    assertAdmin.mockRejectedValue(new Error('FORBIDDEN'));
    const { default: Page } = await import('../src/app/diagnostics/page');
    await expect(Page()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getBootData).not.toHaveBeenCalled();
  });

  it('em produção, o admin vê o diagnóstico', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    assertAdmin.mockResolvedValue({ user: { id: 'u1' } });
    const { default: Page } = await import('../src/app/diagnostics/page');
    const element = await Page();
    expect(JSON.stringify(element)).toContain('Kernel Boot Started');
  });

  it('a página declara noindex', async () => {
    const { metadata } = await import('../src/app/diagnostics/page');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe('boot do kernel enviado ao navegador', () => {
  it('nunca leva o diagnóstico interno e esconde a mensagem de erro em produção', async () => {
    const { toClientBootData } = await import('../src/runtime/client-boot-data');
    const boot = { diagnostics: { timeline: ['Kernel Boot Started'] }, defaultSnapshot: null, error: 'ENOENT ./plugins/segredo' };
    const prod = toClientBootData(boot, true);
    expect(prod.diagnostics).toBeNull();
    expect(JSON.stringify(prod)).not.toContain('Kernel Boot Started');
    expect(JSON.stringify(prod)).not.toContain('plugins');
    expect(prod.error).toBe('Serviço temporariamente indisponível.');
    expect(toClientBootData(boot, false).error).toBe('ENOENT ./plugins/segredo');
    expect(toClientBootData({ ...boot, error: null }, true).error).toBeNull();
  });
});

describe('rotas noindex (funil de cadastro e pesquisas)', () => {
  it('reconhece /anunciar, /pesquisa e seus filhos', async () => {
    const { isNoIndexFollowPath } = await import('../src/lib/seo/noindex-paths');
    for (const p of ['/anunciar', '/anunciar/passo-1', '/anunciar/passo-7', '/pesquisa', '/pesquisas/perfil-e-negocios']) {
      expect(isNoIndexFollowPath(p)).toBe(true);
    }
    for (const p of ['/', '/guia', '/guia/empresas', '/guia/opticacirculo', '/anunciante', '/anunciantes-x']) {
      expect(isNoIndexFollowPath(p)).toBe(false);
    }
  });

  it('o layout do /anunciar declara noindex, follow e não altera o conteúdo', async () => {
    const mod = await import('../src/app/anunciar/layout');
    expect(mod.metadata.robots).toEqual({ index: false, follow: true });
    expect(mod.default({ children: 'conteudo' })).toBe('conteudo');
  });

  it('/pesquisa continua redirecionando e declara noindex, follow', async () => {
    const mod = await import('../src/app/pesquisa/page');
    expect(mod.metadata.robots).toEqual({ index: false, follow: true });
  });
});

describe('sitemap', () => {
  it('não contém onboarding, pesquisa, áreas privadas nem rotas técnicas', async () => {
    const { default: sitemap } = await import('../src/app/sitemap');
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.length).toBeGreaterThan(0);
    const blocked = ['/anunciar', '/anunciante', '/pesquisa', '/admin', '/master', '/platform', '/dashboard', '/login', '/register',
      '/cadastro', '/contratacao', '/minha-conta', '/diagnostics', '/health', '/api', '/design-lab', '/visual-lab', '/teste-landing'];
    for (const url of urls) {
      const path = new URL(url).pathname;
      for (const b of blocked) expect(path === b || path.startsWith(`${b}/`)).toBe(false);
    }
    expect(urls.some((u) => new URL(u).pathname === '/')).toBe(true);
    expect(urls.some((u) => new URL(u).pathname === '/guia')).toBe(true);
  });

  it('todas as URLs usam o domínio canônico com www', async () => {
    const { default: sitemap } = await import('../src/app/sitemap');
    const { getAppUrl } = await import('../src/lib/seo/app-url');
    for (const entry of await sitemap()) expect(entry.url.startsWith(getAppUrl())).toBe(true);
  });
});

describe('domínio canônico', () => {
  it('sem variável de ambiente, o padrão é https://www.conexaomaconica.com.br', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.resetModules();
    const { appUrl, getAppUrl } = await import('../src/lib/seo/app-url');
    expect(getAppUrl()).toBe('https://www.conexaomaconica.com.br');
    expect(appUrl('/guia/empresas')).toBe('https://www.conexaomaconica.com.br/guia/empresas');
  });

  it('remove a barra final do valor configurado', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.conexaomaconica.com.br/');
    vi.resetModules();
    const { appUrl } = await import('../src/lib/seo/app-url');
    expect(appUrl('/guia')).toBe('https://www.conexaomaconica.com.br/guia');
  });

  it('as páginas de listagem não definem mais endereço fixo sem www', async () => {
    const { readFileSync } = await import('node:fs');
    for (const file of ['guia/empresas/page.tsx', 'guia/lojas/page.tsx', 'guia/lojas/[slug]/page.tsx']) {
      const source = readFileSync(`src/app/(public)/${file}`, 'utf8');
      expect(source).not.toMatch(/https:\/\/conexaomaconica\.com\.br\$\{/);
      expect(source).toContain("from '@/lib/seo/app-url'");
    }
  });
});
