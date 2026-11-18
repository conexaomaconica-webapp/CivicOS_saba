// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

(globalThis as { React?: typeof React }).React = React;

const report = vi.fn();
vi.mock('@/app/actions/connections', () => ({ reportConnectionAction: (...a: any[]) => report(...a) }));

import { ReportConnectionButton } from '../src/components/public/business/sections/ReportConnectionButton';

beforeEach(() => report.mockReset().mockResolvedValue({ success: true }));
afterEach(() => cleanup());

function mountInClippedCard(onCardClick = vi.fn()) {
  render(
    <div data-testid="card" style={{ overflow: 'hidden', height: 20 }} onClick={onCardClick}>
      <ReportConnectionButton connectionId="c1" loginRedirect="/conexoes/c1" />
    </div>,
  );
  return onCardClick;
}

describe('denunciar conexão', () => {
  it('a janela abre FORA do card (no body), com os 4 motivos e a caixa de justificativa', async () => {
    mountInClippedCard();
    fireEvent.click(screen.getByRole('button', { name: /Denunciar/ }));
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByTestId('card').contains(dialog)).toBe(false); // não é cortada pelo overflow do card
    expect(document.body.contains(dialog)).toBe(true);
    for (const label of ['Foto inadequada', 'Informação falsa', 'Conteúdo ofensivo', 'Outro motivo']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByLabelText(/Justificativa/)).toBeTruthy();
  });

  it('clicar no botão ou na janela NÃO aciona o clique do card (não navega)', async () => {
    const cardClick = mountInClippedCard();
    fireEvent.click(screen.getByRole('button', { name: /Denunciar/ }));
    fireEvent.click(await screen.findByText('Denunciar esta conexão'));
    fireEvent.click(screen.getByRole('radio', { name: /Informação falsa/ }));
    expect(cardClick).not.toHaveBeenCalled();
  });

  it('envia o motivo escolhido e a justificativa', async () => {
    mountInClippedCard();
    fireEvent.click(screen.getByRole('button', { name: /Denunciar/ }));
    fireEvent.click(await screen.findByRole('radio', { name: /Informação falsa/ }));
    fireEvent.change(screen.getByLabelText(/Justificativa/), { target: { value: '  Esta compra não aconteceu  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    await waitFor(() => expect(report).toHaveBeenCalledWith('c1', 'informacao_falsa', 'Esta compra não aconteceu'));
    expect(await screen.findByText(/Denúncia enviada/)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('justificativa é opcional, exceto em "Outro motivo"', async () => {
    mountInClippedCard();
    fireEvent.click(screen.getByRole('button', { name: /Denunciar/ }));
    fireEvent.click(await screen.findByRole('radio', { name: /Outro motivo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Outro motivo/);
    expect(report).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: /Foto inadequada/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    await waitFor(() => expect(report).toHaveBeenCalledWith('c1', 'foto_inadequada', undefined));
  });

  it('limita a justificativa a 300 caracteres e fecha com Esc e Cancelar', async () => {
    mountInClippedCard();
    fireEvent.click(screen.getByRole('button', { name: /Denunciar/ }));
    const box = (await screen.findByLabelText(/Justificativa/)) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'x'.repeat(500) } });
    expect(box.value).toHaveLength(300);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Denunciar/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('visitante sem login é levado ao login e volta para a conexão', async () => {
    report.mockResolvedValue({ success: false, unauthorized: true });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { set href(v: string) { assign(v); } }, configurable: true });
    mountInClippedCard();
    fireEvent.click(screen.getByRole('button', { name: /Denunciar/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar denúncia' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login?redirect=%2Fconexoes%2Fc1'));
  });
});
