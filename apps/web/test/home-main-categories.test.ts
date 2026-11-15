import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fetchMainHomeCategories } from '../src/lib/directory/home-main-categories';

/** Cliente falso: toda consulta é encadeável e resolve para as linhas da tabela pedida. */
function fakeDb(tables: Record<string, unknown[]>, calls: Array<{ table: string; filters: Array<[string, unknown]> }> = []) {
  return {
    from(table: string) {
      const call = { table, filters: [] as Array<[string, unknown]> };
      calls.push(call);
      const chain: any = {
        select: () => chain,
        order: () => chain,
        eq: (col: string, value: unknown) => { call.filters.push([col, value]); return chain; },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [] }).then(resolve, reject),
      };
      return chain;
    },
  };
}

const available = Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, slug: `s${i}`, name: `Cat ${i}`, icon_name: null, business_count: i + 1 }));
const primaryRow = (ids: string[]) => ({ business_categories: ids.map((id) => ({ is_primary: true, categories: { id, slug: `s${id.slice(1)}`, name: `Cat ${id.slice(1)}`, icon: null } })) });

describe('fetchMainHomeCategories (home do app)', () => {
  it('com destaques no painel, devolve somente eles', async () => {
    const db = fakeDb({
      directory_featured_categories: [{ category_id: 'c7', display_order: 1 }, { category_id: 'c2', display_order: 2 }],
      businesses: [primaryRow(['c1', 'c3'])],
    });
    const result = await fetchMainHomeCategories(db, 'tenant-1', available);
    expect(result.map((c) => c.id).sort()).toEqual(['c2', 'c7']);
  });

  it('sem destaque, usa as principais do prontuário 360, no máximo 10', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => primaryRow([`c${i}`]));
    const db = fakeDb({ directory_featured_categories: [], businesses: rows });
    const result = await fetchMainHomeCategories(db, 'tenant-1', available);
    expect(result).toHaveLength(10);
    expect(result.every((c) => typeof c.business_count === 'number')).toBe(true);
  });

  it('sem destaque nem principais, limita a 10 (nunca todas)', async () => {
    const db = fakeDb({ directory_featured_categories: [], businesses: [] });
    expect(await fetchMainHomeCategories(db, 'tenant-1', available)).toHaveLength(10);
  });

  it('todas as consultas são filtradas pelo tenant (cliente de serviço ignora RLS)', async () => {
    const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
    await fetchMainHomeCategories(fakeDb({}, calls), 'tenant-xyz', available);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) expect(c.filters).toContainEqual(['tenant_id', 'tenant-xyz']);
  });

  it('nunca lança: falha vira lista vazia', async () => {
    const broken = { from: () => { throw new Error('falha'); } };
    expect(await fetchMainHomeCategories(broken, 'tenant-1', available)).toEqual([]);
    expect(await fetchMainHomeCategories(fakeDb({}), '', available)).toEqual([]);
    expect(await fetchMainHomeCategories(fakeDb({}), 'tenant-1', [])).toEqual([]);
  });
});

describe('BFF do app (estático)', () => {
  const route = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/api/mobile/guide/route.ts'), 'utf8');
  it('entrega home_categories calculado no servidor e sem derrubar a resposta em caso de falha', () => {
    expect(route).toMatch(/home_categories: homeCategories/);
    expect(route).toMatch(/fetchMainHomeCategories\(adminDb, tenantIdForHome, activeCatsArray\)/);
    expect(route).toMatch(/homeCategories = \[\]/);
  });
});
