import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('catalogo global de categorias do Guia', () => {
  it('cria novas categorias administrativas sem tenant_id', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/admin/admin-businesses-service.ts'), 'utf8');
    expect(source).toContain(".insert({ tenant_id: null, name, slug, is_active: true })");
    expect(source).not.toContain(".insert({ tenant_id: tenantId, name, slug, is_active: true })");
  });
});
