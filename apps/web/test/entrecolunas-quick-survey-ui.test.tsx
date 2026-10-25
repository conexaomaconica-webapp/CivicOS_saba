/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QuickSurveySection } from '@/components/entrecolunas/QuickSurveySection';
import * as surveyActionModule from '@/app/actions/entrecolunas-survey';

vi.mock('@/app/actions/entrecolunas-survey', () => ({
  submitEntreColunasSurveyAction: vi.fn(),
}));

describe('ETAPA 1G-C — QuickSurveySection (UI, Acessibilidade e Tratamento de Erros)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('deve renderizar a estrutura inicial com atributos semânticos acessíveis', () => {
    render(<QuickSurveySection />);

    // Barra de progresso
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeDefined();
    expect(progressbar.getAttribute('aria-valuenow')).toBe('1');
    expect(progressbar.getAttribute('aria-valuemin')).toBe('1');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('3');

    // Radiogroup da Pergunta 1
    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup).toBeDefined();

    // Opções de rádio
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(3);
    expect(radios[0]?.getAttribute('aria-checked')).toBe('false');
  });

  it('deve atualizar aria-checked ao selecionar uma opção no Passo 1', () => {
    render(<QuickSurveySection />);

    const irmaoOption = screen.getByRole('radio', { name: /irmão/i });
    fireEvent.click(irmaoOption);

    expect(irmaoOption.getAttribute('aria-checked')).toBe('true');
  });

  it('deve navegar pelos 3 passos garantindo acessibilidade em cada um', () => {
    render(<QuickSurveySection />);

    // Passo 1 -> Seleciona e Avança
    fireEvent.click(screen.getByRole('radio', { name: /irmão/i }));
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Passo 2
    expect(screen.getByText(/Pergunta 2 — Como você pretende utilizar/i)).toBeDefined();
    const intencaoRadio = screen.getByRole('radio', { name: /para encontrar produtos e serviços/i });
    fireEvent.click(intencaoRadio);
    expect(intencaoRadio.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Passo 3
    expect(screen.getByText(/Pergunta 3 — Quais produtos ou serviços/i)).toBeDefined();
    const checkboxGroup = screen.getByRole('group');
    expect(checkboxGroup).toBeDefined();

    const saudeCheckbox = screen.getByRole('checkbox', { name: /saúde e bem-estar/i });
    expect(saudeCheckbox.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(saudeCheckbox);
    expect(saudeCheckbox.getAttribute('aria-checked')).toBe('true');
  });

  it('NÃO deve exibir tela de sucesso se a Server Action retornar erro (Correção do Falso Sucesso)', async () => {
    vi.mocked(surveyActionModule.submitEntreColunasSurveyAction).mockResolvedValueOnce({
      success: false,
      error: 'Erro simulado no banco de dados.',
    });

    render(<QuickSurveySection />);

    // Preenche Passo 1
    fireEvent.click(screen.getByRole('radio', { name: /irmão/i }));
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Preenche Passo 2
    fireEvent.click(screen.getByRole('radio', { name: /para encontrar produtos e serviços/i }));
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Passo 3: Finaliza
    fireEvent.click(screen.getByRole('button', { name: /finalizar respostas/i }));

    // Deve exibir alerta de erro e NÃO exibir tela de agradecimento
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      expect(screen.getByText(/Erro simulado no banco de dados/i)).toBeDefined();
    });

    expect(screen.queryByText(/Obrigado por fazer parte desse início!/i)).toBeNull();

    // Botão muda para tentar novamente e respostas continuam preservadas
    const retryBtn = screen.getByRole('button', { name: /tentar novamente/i });
    expect(retryBtn).toBeDefined();
  });

  it('NÃO deve exibir tela de sucesso se ocorrer exceção de rede/servidor', async () => {
    vi.mocked(surveyActionModule.submitEntreColunasSurveyAction).mockRejectedValueOnce(
      new Error('Network failure')
    );

    render(<QuickSurveySection />);

    // Passo 1
    fireEvent.click(screen.getByRole('radio', { name: /cunhada/i }));
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Passo 2
    fireEvent.click(screen.getByRole('radio', { name: /para as duas possibilidades/i }));
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Passo 3
    fireEvent.click(screen.getByRole('button', { name: /finalizar respostas/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/instabilidade na conexão/i)).toBeDefined();
    });

    expect(screen.queryByText(/Obrigado por fazer parte desse início!/i)).toBeNull();
  });

  it('deve exibir sucesso exclusivamente quando a Server Action retornar success: true', async () => {
    vi.mocked(surveyActionModule.submitEntreColunasSurveyAction).mockResolvedValueOnce({
      success: true,
    });

    render(<QuickSurveySection />);

    // Passo 1
    fireEvent.click(screen.getByRole('radio', { name: /familiar/i }));
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Passo 2
    fireEvent.click(screen.getByRole('radio', { name: /para divulgar minha empresa/i }));
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

    // Passo 3
    fireEvent.click(screen.getByRole('button', { name: /finalizar respostas/i }));

    await waitFor(() => {
      expect(screen.getByText(/Obrigado por fazer parte desse início!/i)).toBeDefined();
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
