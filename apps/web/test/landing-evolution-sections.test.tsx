// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LandingDifferentialsSection } from '../src/components/landing/LandingDifferentialsSection';
import { LandingConnectionsMuralSection } from '../src/components/landing/LandingConnectionsMuralSection';
import { LandingMetricsPreviewSection } from '../src/components/landing/LandingMetricsPreviewSection';
import { LandingHowItWorksSection } from '../src/components/landing/LandingHowItWorksSection';
import type { ConnectionFeedItem } from '../src/app/actions/connections';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('../src/components/public/business/sections/ConnectionLikeButton', () => ({
  ConnectionLikeButton: () => <button type="button">Curtir</button>,
}));

afterEach(cleanup);

describe('Landing Differentials Section', () => {
  it('renderiza os 6 pilares do ecossistema e o aviso de governança e transparência', () => {
    render(<LandingDifferentialsSection />);

    expect(screen.getByText('Como fortalecemos essas conexões')).toBeDefined();
    expect(screen.getByText('Exposição em mídia')).toBeDefined();
    expect(screen.getByText('Networking e relacionamento')).toBeDefined();
    expect(screen.getByText('Divulgação nas redes sociais')).toBeDefined();
    expect(screen.getByText('Listas de transmissão autorizadas')).toBeDefined();
    expect(screen.getByText('Encontros de negócios')).toBeDefined();
    expect(screen.getByText('Palestras e conhecimento')).toBeDefined();

    expect(screen.getByText(/Compromisso de Transparência:/i)).toBeDefined();
    expect(screen.getByText(/não representam promessa de entrega contratual individual/i)).toBeDefined();
  });
});

describe('Landing Connections Mural Section', () => {
  it('renderiza o estado vazio institucional elegante quando não há registros reais', () => {
    render(<LandingConnectionsMuralSection items={[]} confirmedTotal={0} />);

    expect(screen.getByText('Conexões que saem da tela e acontecem na vida real.')).toBeDefined();
    expect(screen.getByText(/O que acontece quando você prestigia uma empresa da Conexão/i)).toBeDefined();
    expect(screen.getByText(/1. Prestigie uma empresa/i)).toBeDefined();
    expect(screen.getByText(/2. Registre a experiência/i)).toBeDefined();
    expect(screen.getByText(/3. Confirmação mútua/i)).toBeDefined();
    expect(screen.getByText(/Acessar o Mural no Guia de Empresas/i)).toBeDefined();
  });

  it('renderiza até 6 registros reais e contagem de confirmados quando disponíveis', () => {
    const mockItems: ConnectionFeedItem[] = [
      {
        id: 'conn-1',
        business_id: 'biz-1',
        business_name: 'Ótica Visão Fraterna',
        business_slug: 'otica-visao',
        member_first_name: 'Carlos',
        connection_type: 'compra',
        item_description: 'Óculos de grau',
        message: 'Excelente atendimento!',
        photo_url: null,
        like_count: 5,
        liked_by_me: false,
        created_at: new Date().toISOString(),
      },
    ];

    render(<LandingConnectionsMuralSection items={mockItems} confirmedTotal={42} />);

    expect(screen.getByText(/42 negócios confirmados na rede/i)).toBeDefined();
    expect(screen.getByText('Carlos')).toBeDefined();
    expect(screen.getByText('Ótica Visão Fraterna')).toBeDefined();
    expect(screen.getByText(/Excelente atendimento!/i)).toBeDefined();
    expect(screen.getByText(/Confirmado pela empresa/i)).toBeDefined();
  });
});

describe('Landing Metrics Preview Section', () => {
  it('renderiza o mockup do painel de desempenho com os indicadores e a legenda obrigatória', () => {
    render(<LandingMetricsPreviewSection />);

    expect(screen.getByText('Sua empresa em evidência. Resultados que você acompanha.')).toBeDefined();
    expect(screen.getByText('1.248')).toBeDefined();
    expect(screen.getByText('86')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('65')).toBeDefined();
    expect(screen.getByText(/Evolução de visualizações por período/i)).toBeDefined();

    const disclaimer = screen.getByText(/Painel demonstrativo com dados ilustrativos/i);
    expect(disclaimer).toBeDefined();
    expect(disclaimer.textContent).toContain('não representam vendas ou faturamento garantido');
  });
});

describe('Landing How It Works Section', () => {
  it('renderiza a jornada de 3 etapas com o botão de cadastro', () => {
    render(<LandingHowItWorksSection />);

    expect(screen.getByText('Uma jornada simples para fazer parte da Conexão')).toBeDefined();
    expect(screen.getByText('Preencha o cadastro da empresa')).toBeDefined();
    expect(screen.getByText('Escolha seu plano e assine digitalmente')).toBeDefined();
    expect(screen.getByText('Perfil publicado e ativo no ecossistema')).toBeDefined();
    expect(screen.getByText('Iniciar cadastro da minha empresa')).toBeDefined();
  });
});

describe('Landing Plans Section & Lead Capture', () => {
  it('exibe primeiro Plano Acácia, depois Compasso e por último Esquadro com valores parcelados em destaque', async () => {
    const { LandingPlansSection } = await import('../src/components/landing/LandingSections');
    const { CANONICAL_PLANS } = await import('../src/lib/billing/plans-service');

    const testPlans = [
      { id: 'plan-bronze', ...CANONICAL_PLANS.bronze },
      { id: 'plan-prata', ...CANONICAL_PLANS.prata },
      { id: 'plan-ouro', ...CANONICAL_PLANS.ouro },
    ];

    const { container } = render(<LandingPlansSection plans={testPlans} />);

    // Verifica que os títulos aparecem na ordem: Acácia, Compasso, Esquadro
    const planTitles = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent?.trim());
    expect(planTitles).toEqual(['Plano Acácia', 'Plano Compasso', 'Plano Esquadro']);

    // Valores parcelados em destaque
    expect(container.textContent).toMatch(/4\s*x de\s*R\$\s*270,00/i);
    expect(container.textContent).toMatch(/3\s*x de\s*R\$\s*285,00/i);
    expect(container.textContent).toMatch(/2\s*x de\s*R\$\s*317,50/i);

    // Valores à vista embaixo menor
    expect(container.textContent).toMatch(/ou\s*R\$\s*1\.000,00\s*à vista/i);
    expect(container.textContent).toMatch(/ou\s*R\$\s*800,00\s*à vista/i);
    expect(container.textContent).toMatch(/ou\s*R\$\s*600,00\s*à vista/i);
  });

  it('no formulário de captação de leads, o Plano Acácia vem selecionado por padrão', async () => {
    const { LandingLeadCapture } = await import('../src/components/landing/LandingLeadCapture');

    const { container } = render(<LandingLeadCapture />);

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.value).toBe('ouro');
  });
});

