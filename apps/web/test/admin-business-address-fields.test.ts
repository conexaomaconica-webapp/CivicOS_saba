import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Simulações: sessão de admin, banco (consulta encadeada genérica) e busca de coordenadas ----
const BIZ = '55555555-5555-4555-8555-555555555555';
const TENANT = '33333333-3333-4333-8333-333333333333';

type Op = { table: string; op: string; values?: any; filters: Record<string, unknown> };
const ops: Op[] = [];
const tables: Record<string, any> = {};
const geocode = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/seo/revalidate-public-seo', () => ({ revalidatePublicSeo: async () => undefined }));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({}) }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => null }));
vi.mock('../src/lib/admin/admin-tenant-context', () => ({ resolveCanonicalAdminTenant: async () => ({ tenantId: TENANT }) }));
vi.mock('../src/lib/geo/geocode', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/geo/geocode')>('../src/lib/geo/geocode');
  return { ...actual, geocodeBrazilianAddress: (...a: any[]) => geocode(...a) };
});

function from(table: string) {
  const state: Op = { table, op: 'select', filters: {} };
  const result = () => {
    ops.push({ ...state });
    const spec = tables[table];
    const data = typeof spec === 'function' ? spec(state) : spec;
    return { data: data ?? null, error: null, count: Array.isArray(data) ? data.length : 0 };
  };
  const api: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve(result());
      if (prop === 'update' || prop === 'insert' || prop === 'upsert') return (values: any) => { state.op = prop; state.values = values; return api; };
      if (prop === 'delete') return () => { state.op = 'delete'; return api; };
      if (prop === 'eq' || prop === 'neq' || prop === 'in') return (k: string, v: unknown) => { state.filters[`${prop}:${k}`] = v; return api; };
      if (prop === 'single' || prop === 'maybeSingle') return async () => { const r = result(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; };
      return () => api; // select, order, limit, or, ilike, throwOnError...
    },
  });
  return api;
}

vi.mock('../src/lib/admin/admin-auth-helper', () => ({
  assertPlatformAdminAccess: async () => ({ supabase: { from }, user: { id: 'admin-1' } }),
}));

import { updateAdminBusinessDetailsAction } from '../src/lib/admin/admin-businesses-service';

const existingLocation = (o: Record<string, unknown> = {}) => ({
  id: 'loc-1', is_headquarters: true, latitude: -12.2, longitude: -38.9, street: 'Rua Antiga', number: '10', complement: null,
  neighborhood: 'Centro', city: 'Feira de Santana', state: 'BA', postal_code: '44000-000', ...o,
});

const precisionWrites = () => ops.filter((o) => o.table === 'business_attributes' && o.op === 'upsert' && o.values?.attribute_key === 'location_precision').map((o) => o.values.attribute_value);
const locationWrites = () => ops.filter((o) => o.table === 'business_locations' && ['update', 'insert'].includes(o.op));

beforeEach(() => {
  ops.length = 0;
  geocode.mockReset().mockResolvedValue({ latitude: -12.25, longitude: -38.95, precision: 'address' });
  for (const k of Object.keys(tables)) delete tables[k];
  tables.businesses = { id: BIZ, tenant_id: TENANT, slug: 'empresa-x', name: 'Empresa X', address: 'antigo' };
  tables.brazilian_states = { ibge_code: 29 };
  tables.brazilian_cities = { ibge_code: 2910800, name: 'Feira de Santana' };
  tables.business_locations = [existingLocation()];
});

const base = { city: 'Feira de Santana', state: 'BA' };

describe('prontuário 360: endereço em campos (rua, número, complemento, bairro, CEP)', () => {
  it('grava cada campo em business_locations e procura as coordenadas com os valores NOVOS', async () => {
    const res = await updateAdminBusinessDetailsAction(BIZ, {
      ...base, address: 'Avenida Getúlio Vargas, 500, Sala 2, Centro', street: 'Avenida Getúlio Vargas', number: '500', complement: 'Sala 2',
      neighborhood: 'Centro', postal_code: '44001-000',
    });
    expect(res.success).toBe(true);
    const write = locationWrites()[0]!;
    expect(write.op).toBe('update');
    expect(write.values).toMatchObject({
      street: 'Avenida Getúlio Vargas', number: '500', complement: 'Sala 2', neighborhood: 'Centro', postal_code: '44001-000',
      city: 'Feira de Santana', state: 'BA', latitude: -12.25, longitude: -38.95,
    });
    expect(geocode).toHaveBeenCalledWith(expect.objectContaining({
      street: 'Avenida Getúlio Vargas', number: '500', neighborhood: 'Centro', postalCode: '44001-000', city: 'Feira de Santana', state: 'BA',
    }));
    expect(res.data).toMatchObject({ latitude: -12.25, longitude: -38.95, geocode_precision: 'address', coordinates_cleared: false });
  });

  it('CEP sem 8 dígitos é recusado antes de gravar qualquer coisa', async () => {
    const res = await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua X', postal_code: '4400' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/CEP/);
    expect(locationWrites()).toHaveLength(0);
    expect(geocode).not.toHaveBeenCalled();
  });

  it('CEP aceita com ou sem hífen e fica gravado como 00000-000', async () => {
    await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Nova', number: '1', postal_code: '44001000' });
    expect(locationWrites()[0]!.values.postal_code).toBe('44001-000');
  });

  it('número ou bairro diferentes contam como endereço novo (procura de novo as coordenadas)', async () => {
    await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Antiga', number: '999', neighborhood: 'Centro', postal_code: '44000-000' });
    expect(geocode).toHaveBeenCalledTimes(1);
  });

  it('endereço idêntico ao gravado e com coordenadas: não procura de novo nem mexe no ponto', async () => {
    const res = await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Antiga', number: '10', neighborhood: 'Centro', postal_code: '44000-000' });
    expect(res.success).toBe(true);
    expect(geocode).not.toHaveBeenCalled();
    const values = locationWrites()[0]!.values;
    expect(values).not.toHaveProperty('latitude');
    expect(res.data).toMatchObject({ latitude: -12.2, longitude: -38.9, coordinates_cleared: false });
  });

  it('endereço novo que não é encontrado: as coordenadas antigas são limpas e o aviso vem na resposta', async () => {
    geocode.mockResolvedValue(null);
    const res = await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Que Não Existe', number: '1', postal_code: '44001-000' });
    expect(res.success).toBe(true);
    expect(locationWrites()[0]!.values).toMatchObject({ latitude: null, longitude: null });
    expect(res.data).toMatchObject({ coordinates_cleared: true, latitude: null, longitude: null });
  });

  it('coordenadas digitadas à mão prevalecem sobre a busca automática', async () => {
    const res = await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Nova', number: '1', postal_code: '44001-000', latitude: -12.3, longitude: -38.8 });
    expect(geocode).not.toHaveBeenCalled();
    expect(locationWrites()[0]!.values).toMatchObject({ latitude: -12.3, longitude: -38.8 });
    expect(res.data.geocode_precision).toBe('manual');
  });

  it('empresa sem endereço gravado: cria o registro com todos os campos', async () => {
    tables.business_locations = [];
    await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Nova', number: '7', complement: 'Loja 1', neighborhood: 'Centro', postal_code: '44001-000' });
    const write = locationWrites()[0]!;
    expect(write.op).toBe('insert');
    expect(write.values).toMatchObject({ street: 'Rua Nova', number: '7', complement: 'Loja 1', neighborhood: 'Centro', postal_code: '44001-000', is_headquarters: true });
  });

  it('modo antigo (só o texto único, sem street) continua funcionando', async () => {
    const res = await updateAdminBusinessDetailsAction(BIZ, { ...base, address: 'Av. Brasil, 200 - Centro' });
    expect(res.success).toBe(true);
    expect(locationWrites()[0]!.values).toMatchObject({ street: 'Av. Brasil, 200 - Centro', number: null });
  });
});

describe('precisão do ponto gravada para o mapa da página', () => {
  it('coordenadas digitadas/coladas: "manual" (é o que a página usa no mapa)', async () => {
    await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Nova', number: '1', postal_code: '44001-000', latitude: -12.3, longitude: -38.8 });
    expect(precisionWrites()).toEqual(['manual']);
  });

  it('achado pela busca automática: a precisão da busca (a página NÃO usa o ponto no mapa)', async () => {
    await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Nova', number: '1', postal_code: '44001-000' });
    expect(precisionWrites()).toEqual(['address']);
  });

  it('endereço novo não encontrado: "none" (as coordenadas antigas foram limpas)', async () => {
    geocode.mockResolvedValue(null);
    await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Que Não Existe', number: '1', postal_code: '44001-000' });
    expect(precisionWrites()).toEqual(['none']);
  });

  it('nada mudou nas coordenadas: não mexe na marca existente', async () => {
    await updateAdminBusinessDetailsAction(BIZ, { ...base, street: 'Rua Antiga', number: '10', neighborhood: 'Centro', postal_code: '44000-000' });
    expect(precisionWrites()).toEqual([]);
  });
});
