import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('catalogo administrativo de categorias', () => {
  it('consulta categorias globais no servidor sem filtro de status', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/app/actions/admin-guide-categories.ts'), 'utf8');
    expect(source).toContain('assertPlatformAdminAccess()');
    expect(source).toContain(".is('tenant_id', null)");
    expect(source).not.toContain(".eq('is_active', true)");
  });

  it('nao consulta diretamente categories pelo cliente da pagina', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/app/admin/guia/categorias/page.tsx'), 'utf8');
    expect(source).toContain('listAdminGuideCategoriesAction()');
    expect(source).not.toContain("supabase.from('categories')");
  });

  it('exibe o catalogo completo separadamente dos destaques do tenant', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/app/admin/guia/categorias/page.tsx'), 'utf8');
    expect(source).toContain('Catálogo completo de categorias');
    expect(source).toContain('filteredCategories.map((category)');
    expect(source).toContain('featuredCategoryIds.has(category.id)');
    expect(source).toContain("category.is_active ? 'Ativa' : 'Inativa'");
  });

  it('permite filtrar por status e destaque e ordenar pelo nome', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/app/admin/guia/categorias/page.tsx'), 'utf8');
    expect(source).toContain('setStatusFilter');
    expect(source).toContain('setFeaturedFilter');
    expect(source).toContain('setNameOrder');
    expect(source).toContain("localeCompare(right.name, 'pt-BR'");
    expect(source).toContain('Nenhuma categoria corresponde aos filtros selecionados.');
  });

  it('permite alternar status e destaque diretamente no catalogo', () => {
    const pageSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/admin/guia/categorias/page.tsx'), 'utf8');
    const actionSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/actions/admin-guide-categories.ts'), 'utf8');
    expect(pageSource).toContain('handleCategoryStatusToggle(category)');
    expect(pageSource).toContain('handleFeaturedToggle(category)');
    expect(pageSource).toContain(".from('directory_featured_categories')");
    expect(actionSource).toContain('setAdminGuideCategoryStatusAction');
    expect(actionSource).toContain('assertPlatformAdminAccess()');
    expect(actionSource).toContain(".is('tenant_id', null)");
  });

  it('edita e exclui categorias globais com protecao de vinculos', () => {
    const pageSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/admin/guia/categorias/page.tsx'), 'utf8');
    const actionSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/actions/admin-guide-categories.ts'), 'utf8');
    expect(pageSource).toContain('openCategoryEditor(category)');
    expect(pageSource).toContain('handleCategoryDelete(category)');
    expect(actionSource).toContain('updateAdminGuideCategoryAction');
    expect(actionSource).toContain('deleteAdminGuideCategoryAction');
    expect(actionSource).toContain("from('business_categories')");
    expect(actionSource).toContain('Esta categoria está vinculada a empresas.');
  });
});
