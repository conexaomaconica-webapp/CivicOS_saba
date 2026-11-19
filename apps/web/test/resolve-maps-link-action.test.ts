import { beforeEach, describe, expect, it, vi } from 'vitest';

let adminOk = true;
const fetchMock = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/seo/revalidate-public-seo', () => ({ revalidatePublicSeo: async () => undefined }));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({}) }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => null }));
vi.mock('../src/lib/admin/admin-tenant-context', () => ({ resolveCanonicalAdminTenant: async () => ({ tenantId: 't' }) }));
vi.mock('../src/lib/admin/admin-auth-helper', () => ({
  assertPlatformAdminAccess: async () => {
    if (!adminOk) throw new Error('FORBIDDEN');
    return { supabase: {}, user: { id: 'admin-1' } };
  },
}));

import { resolveMapsLinkAction } from '../src/lib/admin/admin-businesses-service';

const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

beforeEach(() => {
  adminOk = true;
  fetchMock.mockReset();
  vi.spyOn(globalThis, 'fetch').mockImplementation((...a: any[]) => fetchMock(...a));
});

describe('resolveMapsLinkAction', () => {
  it('par de coordenadas e link completo são lidos sem acessar a rede', async () => {
    expect(await resolveMapsLinkAction('-12.25, -38.95')).toEqual({ success: true, latitude: -12.25, longitude: -38.95 });
    expect(await resolveMapsLinkAction('https://www.google.com/maps/place/X/@-12.26,-38.96,17z')).toEqual({ success: true, latitude: -12.26, longitude: -38.96 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('link curto: segue o redirecionamento e lê as coordenadas do endereço final', async () => {
    fetchMock.mockResolvedValueOnce(redirect('https://www.google.com/maps/place/Empresa/@-12.2601,-38.9701,17z/data=!3m1'));
    const r = await resolveMapsLinkAction('https://maps.app.goo.gl/AbCdEf123');
    expect(r).toEqual({ success: true, latitude: -12.2601, longitude: -38.9701 });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ redirect: 'manual' });
  });

  it('redirecionamento para fora do Google é recusado (não acessa o endereço)', async () => {
    fetchMock.mockResolvedValueOnce(redirect('https://evil.example.com/steal'));
    const r = await resolveMapsLinkAction('https://maps.app.goo.gl/AbCdEf123');
    expect(r.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('endereço interno ou que não é do Google nem chega a ser consultado', async () => {
    for (const url of ['https://169.254.169.254/latest/meta-data', 'https://localhost:3000/x', 'http://maps.app.goo.gl/a']) {
      expect((await resolveMapsLinkAction(url)).success).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('laço de redirecionamentos para: no máximo 6 consultas', async () => {
    fetchMock.mockImplementation(async () => redirect('https://maps.app.goo.gl/loop'));
    const r = await resolveMapsLinkAction('https://maps.app.goo.gl/loop');
    expect(r.success).toBe(false);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('entrada vazia, texto qualquer ou quem não é admin: recusa', async () => {
    expect((await resolveMapsLinkAction('')).success).toBe(false);
    expect((await resolveMapsLinkAction('Rua das Flores')).success).toBe(false);
    adminOk = false;
    expect((await resolveMapsLinkAction('-12.25, -38.95')).success).toBe(false);
  });
});
