// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

(globalThis as { React?: typeof React }).React = React;

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/components/public/directory/DirectoryHeader', () => ({ DirectoryHeader: () => <header data-testid="header" /> }));
vi.mock('@/components/public/directory/DirectoryFooter', () => ({ DirectoryFooter: () => <footer data-testid="footer" /> }));
vi.mock('@/components/seo/StructuredData', () => ({ StructuredData: () => null }));
vi.mock('@/lib/seo/app-url', () => ({ appUrl: (p: string) => `https://www.conexaomaconica.com.br${p}` }));

import ExcluirContaPage, { metadata } from '../src/app/(public)/excluir-conta/page';
import { buildStaticSitemapEntries } from '../src/lib/seo/sitemap-entries';

afterEach(() => cleanup());

const repo = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');

describe('página pública /excluir-conta (exigida pela Play Store)', () => {
  it('explica os três caminhos: aplicativo, site e e-mail', () => {
    render(<ExcluirContaPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/excluir sua conta/i);
    for (const title of [/Pelo aplicativo/, /Pelo site/, /Por e-mail/, /O que acontece com os seus dados/, /Quando a exclusão não pode ser feita/]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy();
    }
  });

  it('o pedido por e-mail vai ao canal do encarregado, com assunto e modelo de mensagem prontos', () => {
    render(<ExcluirContaPage />);
    const link = screen.getByRole('link', { name: /Pedir exclusão por e-mail/ }) as HTMLAnchorElement;
    const href = decodeURIComponent(link.getAttribute('href')!);
    expect(href).toMatch(/^mailto:privacidade@conexaomaconica\.com\.br\?/);
    expect(href).toContain('subject=Exclusão de conta');
    expect(href).toContain('E-mail cadastrado na conta');
  });

  it('informa o prazo, a retenção legal e o bloqueio por pendência financeira; liga à política de privacidade', () => {
    const { container } = render(<ExcluirContaPage />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/até 15 dias/);
    expect(text).toMatch(/obrigação legal/);
    expect(text).toMatch(/assinatura, pagamento ou reserva pendente/);
    expect(text).toMatch(/nunca precisa enviar sua senha/i);
    expect(container.querySelector('a[href="/privacidade"]')).toBeTruthy();
  });

  it('tem título próprio, endereço canônico e entra no mapa do site', () => {
    expect((metadata.title as { absolute: string }).absolute).toMatch(/Como excluir sua conta/);
    expect(metadata.alternates?.canonical).toBe('https://www.conexaomaconica.com.br/excluir-conta');
    const entries = buildStaticSitemapEntries({} as any);
    expect(entries.map((e) => e.url)).toContain('https://www.conexaomaconica.com.br/excluir-conta');
  });
});

describe('os textos do passo a passo existem de verdade no aplicativo e no site (a página não pode ficar desatualizada)', () => {
  const app = read('apps/mobile/src/App.tsx');
  const portal = read('apps/mobile/src/MobileMemberPortalScreen.tsx');
  const web = read('apps/web/src/app/usuario/perfil/privacy-panel.tsx');

  it('aplicativo: Mais, Minha Conta, Excluir minha conta definitivamente, Sim excluir conta, Meu perfil, Exclusão permanente', () => {
    expect(read('apps/mobile/src/navigation.ts')).toContain("mais: 'Mais'");
    expect(app).toContain('Minha Conta');
    expect(app).toContain('Excluir minha conta definitivamente');
    expect(portal).toContain('Excluir minha conta definitivamente');
    expect(portal).toContain('Sim, excluir conta');
    expect(portal).toContain('Exclusão permanente da conta');
    expect(portal).toContain("label: 'Meu perfil'");
  });

  it('site: Excluir minha conta, digitar EXCLUIR e Solicitar exclusão da conta', () => {
    expect(web).toContain('Excluir minha conta');
    expect(web).toContain("'EXCLUIR'");
    expect(web).toContain('Solicitar exclusão da conta');
    expect(fs.existsSync(path.join(repo, 'apps/web/src/app/usuario/perfil/page.tsx'))).toBe(true);
  });
});
