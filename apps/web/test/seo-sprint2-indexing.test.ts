import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import robots from '../src/app/robots';
import { buildSitemapEventEntries, buildStaticSitemapEntries, latestDate } from '../src/lib/seo/sitemap-entries';
import { getAppUrl } from '../src/lib/seo/app-url';

const read = (path: string) => readFileSync(path, 'utf8');

describe('robots.txt', () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

  it('bloqueia as áreas privadas e de token para todos os rastreadores, inclusive os de IA', () => {
    const agents = rules.map((rule) => rule.userAgent);
    for (const agent of ['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot']) expect(agents).toContain(agent);
    for (const rule of rules) {
      for (const path of ['/admin/', '/api/', '/diagnostics/', '/anunciante/', '/minha-conta/', '/usuario/', '/master/', '/platform/', '/auth/', '/c/', '/cadastro/', '/contratacao/', '/adesao/']) {
        expect(rule.disallow).toContain(path);
      }
      expect(rule.allow).toBe('/');
    }
  });

  it('não bloqueia o funil, a pesquisa nem o conteúdo público (o noindex precisa ser lido pelo Google)', () => {
    for (const rule of rules) {
      const blocked = ([] as string[]).concat(rule.disallow ?? []);
      for (const path of ['/anunciar', '/anunciar/', '/pesquisa', '/pesquisas/', '/guia', '/guia/', '/eventos/', '/login']) {
        expect(blocked).not.toContain(path);
      }
    }
  });

  it('aponta para o sitemap no domínio canônico', () => {
    expect(result.sitemap).toBe(`${getAppUrl()}/sitemap.xml`);
    expect(String(result.sitemap)).toContain('https://www.');
  });
});

describe('sitemap: lastmod real', () => {
  it('latestDate escolhe a data mais recente válida e ignora lixo', () => {
    expect(latestDate(['2026-01-01T00:00:00Z', 'invalida', null, '2026-03-01T00:00:00Z'])).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(latestDate([null, undefined, 'x'])).toBeNull();
  });

  it('sem dados reais, nenhuma página fixa carrega lastModified (nada de "agora" artificial)', () => {
    const entries = buildStaticSitemapEntries(null, null);
    for (const entry of entries) expect(entry.lastModified).toBeUndefined();
  });

  it('/guia e /guia/empresas usam a última edição de empresa; /guia/eventos usa a do evento', () => {
    const business = new Date('2026-10-01T10:00:00Z');
    const event = new Date('2026-10-05T10:00:00Z');
    const byPath = new Map(buildStaticSitemapEntries(business, event).map((e) => [new URL(e.url).pathname, e]));
    expect(byPath.get('/guia')?.lastModified).toEqual(business);
    expect(byPath.get('/guia/empresas')?.lastModified).toEqual(business);
    expect(byPath.get('/guia/eventos')?.lastModified).toEqual(event);
    expect(byPath.get('/')?.lastModified).toBeUndefined();
    expect(byPath.get('/termos')?.lastModified).toBeUndefined();
  });

  it('inclui /guia/eventos e /guia/beneficios e continua sem rotas privadas', () => {
    const paths = buildStaticSitemapEntries(null, null).map((e) => new URL(e.url).pathname);
    expect(paths).toEqual(expect.arrayContaining(['/', '/guia', '/guia/empresas', '/guia/lojas', '/guia/eventos', '/guia/beneficios', '/termos', '/privacidade']));
    for (const path of paths) expect(path).not.toMatch(/anunciar|pesquisa|admin|login|diagnostics|health/);
  });

  it('eventos publicados: slug válido, sem duplicata, com a data real', () => {
    const entries = buildSitemapEventEntries([
      { slug: 'conexao-empresarial-2026', updated_at: '2026-10-02T09:00:00Z' },
      { slug: 'Conexao-Empresarial-2026' },
      { slug: '../admin' },
      { slug: '' },
      { slug: null },
      { slug: 'sem-data' },
    ]);
    expect(entries.map((e) => new URL(e.url).pathname)).toEqual(['/eventos/conexao-empresarial-2026', '/eventos/sem-data']);
    expect(entries[0]?.lastModified).toEqual(new Date('2026-10-02T09:00:00Z'));
    expect(entries[1]?.lastModified).toBeUndefined();
  });
});

describe('canonical e títulos nas páginas públicas', () => {
  const withCanonical = [
    'src/app/(public)/guia/beneficios/page.tsx',
    'src/app/(public)/guia/eventos/page.tsx',
    'src/app/(public)/termos/page.tsx',
    'src/app/(public)/privacidade/page.tsx',
    'src/app/(public)/guia/lojas/[slug]/page.tsx',
  ];

  it.each(withCanonical)('%s define canonical pelo appUrl()', (file) => {
    const source = read(file);
    expect(source).toMatch(/alternates:\s*\{\s*canonical:\s*appUrl\(/);
    expect(source).toContain("from '@/lib/seo/app-url'");
  });

  const noBrandInString = [
    ...withCanonical,
    'src/app/(public)/guia/[slug]/qr/page.tsx',
    'src/app/(public)/adesao/[token]/page.tsx',
    'src/app/eventos/[slug]/page.tsx',
    'src/app/pesquisas/[slug]/page.tsx',
    'src/app/cadastro/[token]/page.tsx',
    'src/app/c/[code]/page.tsx',
    'src/app/contratacao/[token]/page.tsx',
    'src/app/not-found.tsx',
    'src/app/(auth)/layout.tsx',
    'src/app/minha-conta/page.tsx',
    'src/app/minha-conta/perfil/page.tsx',
    'src/app/minha-conta/beneficios/page.tsx',
    'src/app/minha-conta/conexoes/page.tsx',
    'src/app/minha-conta/favoritos/page.tsx',
    'src/app/minha-conta/indicacoes/page.tsx',
  ];

  it.each(noBrandInString)('%s não repete a marca no título (usa title.absolute)', (file) => {
    const source = read(file);
    // O PRIMEIRO `title:` do arquivo é o da página; escrito como texto simples ele soma o sufixo do layout raiz
    // ("| Conexão Maçônica" duas vezes). O title do Open Graph, que vem depois, pode ter a marca.
    const first = /\btitle:\s*(\{\s*absolute|[`'])/.exec(source);
    expect(first).not.toBeNull();
    expect(first![1]).toContain('absolute');
  });

  it('lojas: noindex enquanto o conteúdo é fino, sem remover o follow', () => {
    const source = read('src/app/(public)/guia/lojas/[slug]/page.tsx');
    expect(source).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*true\s*\}/);
  });

  it('/guia/eventos com filtros fica noindex e com canonical da lista limpa', () => {
    const source = read('src/app/(public)/guia/eventos/page.tsx');
    expect(source).toContain('hasFilters');
    expect(source).toMatch(/hasFilters\s*\?\s*\{\s*index:\s*false,\s*follow:\s*true\s*\}/);
  });
});

describe('telas de autenticação', () => {
  it('cada tela tem o próprio título, e /register deixa de se chamar "Entrar"', async () => {
    const register = await import('../src/app/(auth)/register/layout');
    const forgot = await import('../src/app/(auth)/forgot-password/layout');
    const update = await import('../src/app/(auth)/update-password/layout');
    expect(register.metadata.title).toEqual({ absolute: 'Criar conta | Conexão Maçônica' });
    expect(forgot.metadata.title).toEqual({ absolute: 'Recuperar senha | Conexão Maçônica' });
    expect(update.metadata.title).toEqual({ absolute: 'Redefinir senha | Conexão Maçônica' });
    expect(register.default({ children: 'x' })).toBe('x');
  });
});

describe('slug com maiúsculas', () => {
  it('redireciona de forma permanente para minúsculas, depois do redirect de UUID e antes da busca', () => {
    const source = read('src/app/(public)/guia/[slug]/page.tsx');
    const uuid = source.indexOf('if (UUID_REGEX.test(slug))');
    const lower = source.indexOf('buildLowercaseSlugRedirect(slug');
    const lookup = source.indexOf('resolveRenamedBusinessSlug(slug)', lower);
    expect(uuid).toBeGreaterThan(-1);
    expect(lower).toBeGreaterThan(uuid);
    expect(lookup).toBeGreaterThan(lower);
    expect(source).toMatch(/if \(lowercaseTarget\) permanentRedirect\(lowercaseTarget\)/);
  });

  it('não redireciona quando o slug já está em minúsculas', async () => {
    const { buildLowercaseSlugRedirect } = await import('../src/lib/seo/slug-redirect');
    expect(buildLowercaseSlugRedirect('opticacirculo')).toBeNull();
    expect(buildLowercaseSlugRedirect('opticacirculo', { utm_source: 'x' })).toBeNull();
  });

  it('/guia/OpticaCirculo vai para /guia/opticacirculo', async () => {
    const { buildLowercaseSlugRedirect } = await import('../src/lib/seo/slug-redirect');
    expect(buildLowercaseSlugRedirect('OpticaCirculo')).toBe('/guia/opticacirculo');
    expect(buildLowercaseSlugRedirect('OpticaCirculo', {})).toBe('/guia/opticacirculo');
  });

  it('preserva a query string (UTM) no redirect, inclusive parâmetros repetidos e caracteres especiais', async () => {
    const { buildLowercaseSlugRedirect } = await import('../src/lib/seo/slug-redirect');
    expect(buildLowercaseSlugRedirect('OpticaCirculo', { utm_source: 'teste' })).toBe('/guia/opticacirculo?utm_source=teste');
    expect(
      buildLowercaseSlugRedirect('OpticaCirculo', { utm_source: 'google', utm_medium: 'organic', tag: ['a', 'b'], vazio: undefined })
    ).toBe('/guia/opticacirculo?utm_source=google&utm_medium=organic&tag=a&tag=b');
    expect(buildLowercaseSlugRedirect('OpticaCirculo', { q: 'ótica & cia' })).toBe('/guia/opticacirculo?q=%C3%B3tica+%26+cia');
  });
});

describe('llms.txt e migration de eventos', () => {
  it('llms.txt usa só o domínio canônico com www', () => {
    const text = read('public/llms.txt');
    const urls = text.match(/https?:\/\/[^\s)]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls) expect(url.startsWith('https://www.conexaomaconica.com.br')).toBe(true);
  });

  it('a função pública de eventos publicados existe e só libera EXECUTE a leitura pública', () => {
    const path = '../../supabase/migrations/201_public_seo_events.sql';
    expect(existsSync(path)).toBe(true);
    const sql = read(path);
    expect(sql).toContain("e.status = 'published'");
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.public_seo_events(text) FROM PUBLIC');
  });
});

describe('migration 202: evento de lançamento no tenant da Conexão', () => {
  const sql = () => read('../../supabase/migrations/202_move_launch_event_to_conexao_tenant.sql');

  it('só altera tenant_id do evento e das inscrições, para o tenant da Conexão', () => {
    const text = sql();
    expect(text).toContain("'00000000-0000-0000-0000-000000000000'");
    expect(text).toContain("slug = 'conexao-maconica'");
    expect(text).toContain('UPDATE public.event_registrations SET tenant_id = v_target WHERE event_id = v_event_id');
    expect(text).toContain('UPDATE public.platform_events SET tenant_id = v_target WHERE id = v_event_id');
    // nada de DELETE, DROP ou TRUNCATE
    expect(text.replace(/--.*$/gm, '')).not.toMatch(/\b(DELETE|DROP|TRUNCATE|ALTER)\b/i);
  });

  it('é idempotente e aborta sem alterar quando o destino já tem o evento ou o tenant não existe', () => {
    const text = sql();
    expect(text).toContain('e.tenant_id <> v_target');
    expect(text).toContain('RAISE EXCEPTION');
    expect(text).toMatch(/nada a fazer/);
  });
});
