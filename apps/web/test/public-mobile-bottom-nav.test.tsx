// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PublicMobileBottomNav } from '@/components/public/PublicMobileBottomNav';

// Mock de navegação do Next.js
const mockPathname = vi.fn(() => '/guia');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock de Supabase Client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// Mock de GoogleAnalytics
vi.mock('@/components/analytics/GoogleAnalytics', () => ({
  openCookiePreferences: vi.fn(),
}));

describe('PublicMobileBottomNav — Barra Fixa Mobile & Overlay Anti-sobreposição', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/guia');
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Renderiza a barra de navegação com os 5 botões obrigatórios', () => {
    render(<PublicMobileBottomNav />);

    expect(screen.getByRole('link', { name: /Ir para a página inicial/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /benefícios exclusivos/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Explorar catálogo/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /lojas maçônicas/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Abrir menu/i })).toBeDefined();

    expect(screen.getByText('Início')).toBeDefined();
    expect(screen.getByText('Benefícios')).toBeDefined();
    expect(screen.getByText('Explorar')).toBeDefined();
    expect(screen.getByText('Lojas')).toBeDefined();
    expect(screen.getByText('Menu')).toBeDefined();
  });

  it('2. O botão Explorar possui rota /guia/empresas e segue o padrão uniforme dos outros botões', () => {
    render(<PublicMobileBottomNav />);

    const exploreLink = screen.getByRole('link', { name: /Explorar catálogo/i });
    expect(exploreLink.getAttribute('href')).toBe('/guia/empresas');
    expect(screen.getByText('Explorar')).toBeDefined();
  });

  it('3. Abre e fecha o Drawer de Menu com opções adicionais e link de cookies LGPD', () => {
    render(<PublicMobileBottomNav />);

    const menuButton = screen.getByRole('button', { name: /Abrir menu/i });
    fireEvent.click(menuButton);

    // O drawer abre exibindo as opções complementares
    expect(screen.getByRole('dialog', { name: /Menu principal de navegação/i })).toBeDefined();
    expect(screen.getByText('Eventos & Encontros')).toBeDefined();
    expect(screen.getByText('Anunciar Minha Empresa')).toBeDefined();
    expect(screen.getByText('Preferências de Cookies (LGPD)')).toBeDefined();
    expect(screen.getByText('Política de Privacidade')).toBeDefined();
    expect(screen.getByText('Termos de Uso')).toBeDefined();

    // Fecha o menu pelo botão X
    const closeBtn = screen.getByRole('button', { name: /Fechar painel do menu/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('4. Fecha o Drawer ao pressionar tecla Escape', () => {
    render(<PublicMobileBottomNav />);

    const menuButton = screen.getByRole('button', { name: /Abrir menu/i });
    fireEvent.click(menuButton);
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
