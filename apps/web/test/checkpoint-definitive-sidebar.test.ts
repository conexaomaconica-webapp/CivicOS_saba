import { describe, it, expect, vi } from 'vitest';
import { adminNavSections } from '../src/components/admin/AdminSidebar';
import fs from 'fs';
import path from 'path';

describe('Admin Definitive Sidebar & Architecture Checklist', () => {
  it('1. Zero Broken Links — Todas as rotas do menu de navegacao existem fisicamente no disco', () => {
    const webAppRoot = path.join(__dirname, '../src/app');

    const checkRouteExists = (routePath: string) => {
      // Remove query string e barra inicial
      const cleanPath = routePath.split('?')[0].replace(/^\//, '');
      const possiblePageTsx = path.join(webAppRoot, cleanPath, 'page.tsx');
      const possiblePageJsx = path.join(webAppRoot, cleanPath, 'page.jsx');

      // Verifica no caminho direto ou no grupo (public)
      const possiblePublicTsx = path.join(webAppRoot, '(public)', cleanPath, 'page.tsx');

      const exists =
        fs.existsSync(possiblePageTsx) ||
        fs.existsSync(possiblePageJsx) ||
        fs.existsSync(possiblePublicTsx);

      return exists;
    };

    adminNavSections.forEach((section) => {
      section.items.forEach((item) => {
        const routeExists = checkRouteExists(item.path);
        expect(routeExists, `Rota ${item.path} do item "${item.label}" deve existir no disco`).toBe(true);

        if (item.subItems) {
          item.subItems.forEach((sub) => {
            const subExists = checkRouteExists(sub.path);
            expect(subExists, `Sub-rota ${sub.path} do sub-item "${sub.label}" deve existir no disco`).toBe(true);
          });
        }
      });
    });
  });

  it('2. Orphan Routes Recovered — As rotas orfas reais foram integradas no menu oficial', () => {
    const allPaths = adminNavSections.flatMap((sec) =>
      sec.items.flatMap((item) => [item.path, ...(item.subItems?.map((s) => s.path) || [])])
    );

    expect(allPaths).toContain('/admin/notificacoes');
    expect(allPaths).toContain('/admin/marca');
    expect(allPaths).toContain('/admin/guia/destaques');
  });

  it('3. Guide Subroutes Correct — Banners e Empresas em Destaque mantidos separados', () => {
    const guiaSection = adminNavSections.find((s) => s.sectionTitle.includes('GUIA MAÇÔNICO'));
    expect(guiaSection).toBeDefined();

    const bannersItem = guiaSection?.items.find((i) => i.id === 'banners');
    const destaquesItem = guiaSection?.items.find((i) => i.id === 'destaques');

    expect(bannersItem?.path).toBe('/admin/guia/banners');
    expect(destaquesItem?.path).toBe('/admin/guia/destaques');
  });

  it('4. Elimination of Broken Phantom Links — Eliminados os links que retornavam 404', () => {
    const allPaths = adminNavSections.flatMap((sec) => sec.items.map((i) => i.path));

    expect(allPaths).not.toContain('/admin/usuarios');
    expect(allPaths).not.toContain('/admin/assinaturas');
    expect(allPaths).not.toContain('/admin/conteudo');
    expect(allPaths).not.toContain('/admin/selos');
    expect(allPaths).not.toContain('/admin/campanhas');
    expect(allPaths).not.toContain('/admin/administradores');
  });

  it('5. 6 Domain Structure — Verificacao dos 6 dominios aprovados', () => {
    expect(adminNavSections.length).toBe(6);
    expect(adminNavSections[0]?.sectionTitle).toContain('1. VISÃO GERAL');
    expect(adminNavSections[1]?.sectionTitle).toContain('2. OPERAÇÃO COMERCIAL');
    expect(adminNavSections[2]?.sectionTitle).toContain('3. GUIA MAÇÔNICO');
    expect(adminNavSections[3]?.sectionTitle).toContain('4. COMUNICAÇÃO');
    expect(adminNavSections[4]?.sectionTitle).toContain('5. GOVERNANÇA');
    expect(adminNavSections[5]?.sectionTitle).toContain('6. CONFIGURAÇÕES');
  });
});
