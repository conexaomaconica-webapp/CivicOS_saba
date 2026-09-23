import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relative: string) => readFileSync(path.resolve(__dirname, '../src', relative), 'utf8');

describe('public shell isolation', () => {
  it('não envolve o layout raiz no CivicOS', () => {
    expect(source('app/layout.tsx')).not.toContain('ShellWrapper');
    expect(source('app/(public)/layout.tsx')).toContain('PublicShell');
  });

  it('mantém shells administrativos nos layouts protegidos', () => {
    expect(source('app/admin/layout.tsx')).toContain('AdminShell');
    expect(source('app/dashboard/layout.tsx')).toContain('ShellWrapper');
  });

  it('bloqueia o Visual Lab por padrão em produção', () => {
    const layout = source('app/visual-lab/layout.tsx');
    const asset = source('app/visual-lab/assets/bronze-reference/route.ts');
    expect(layout).toContain("process.env.NODE_ENV !== 'production'");
    expect(layout).toContain("process.env.VISUAL_LAB_ENABLED === 'true'");
    expect(asset).toContain('status: 404');
  });
  it('mantém a identidade do menu móvel e a cidade da empresa no cabeçalho', () => {
    const header = source('components/public/directory/DirectoryHeader.tsx');
    const businessPage = source('app/(public)/guia/[slug]/page.tsx');
    expect(header).toContain('bg-[#3b0b14]/98');
    expect(header).not.toContain('md:hidden bg-amber-950/95');
    expect(businessPage).toContain("selectedCity={business.location?.city || ''}");
    expect(businessPage).toContain('availableCities={business.location?.city ? [business.location.city] : []}');
  });
});
