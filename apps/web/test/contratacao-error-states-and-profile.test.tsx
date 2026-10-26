// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ContratacaoPublicPage from '@/app/contratacao/[token]/page';
import * as contractsService from '@/lib/contracts/admin-contracts-service';

vi.mock('@/lib/contracts/admin-contracts-service', async (importOriginal) => {
  const actual = await importOriginal<typeof contractsService>();
  return {
    ...actual,
    getPublicContractByTokenAction: vi.fn(),
  };
});

describe('P0 — Contratação: Resiliência de Erros e Isolamento de Schema de Profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza tela de instabilidade técnica temporária com botão de recarregar quando ocorre falha de banco sem vazar SQL', async () => {
    vi.mocked(contractsService.getPublicContractByTokenAction).mockResolvedValue({
      success: false,
      errorType: 'technical_error',
      error: 'Não foi possível carregar as informações do contrato no momento devido a uma instabilidade técnica. Por favor, tente novamente em instantes.',
    });

    const jsx = await ContratacaoPublicPage({ params: Promise.resolve({ token: 'test-token-12345' }) });
    const { container } = render(jsx);

    expect(screen.getByText('Instabilidade Técnica Temporária')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Tentar Novamente/i })).toBeTruthy();
    expect(container.textContent).not.toContain('column profiles.document_number does not exist');
    expect(container.textContent).not.toContain('SQL');
    expect(container.textContent).not.toContain('SELECT');
  });

  it('renderiza tela de link expirado ou revogado com lista de motivos institucionais', async () => {
    vi.mocked(contractsService.getPublicContractByTokenAction).mockResolvedValue({
      success: false,
      errorType: 'expired_or_revoked',
      error: 'Este link de contratação expirou. Solicite um novo link à administração.',
    });

    const jsx = await ContratacaoPublicPage({ params: Promise.resolve({ token: 'test-expired-token' }) });
    render(jsx);

    expect(screen.getByText('Link Expirado ou Revogado')).toBeTruthy();
    expect(screen.getByText(/ultrapassou o prazo de validade de 7 dias/i)).toBeTruthy();
    expect(screen.getByText(/solicitação de um novo link/i)).toBeTruthy();
  });

  it('renderiza tela de link indisponível quando token não existe', async () => {
    vi.mocked(contractsService.getPublicContractByTokenAction).mockResolvedValue({
      success: false,
      errorType: 'not_found',
      error: 'Link de contratação não encontrado ou inválido.',
    });

    const jsx = await ContratacaoPublicPage({ params: Promise.resolve({ token: 'unknown-token-xyz' }) });
    render(jsx);

    expect(screen.getByText('Link Indisponível')).toBeTruthy();
    expect(screen.getByText(/Link de contratação não encontrado ou inválido/i)).toBeTruthy();
  });
});
