// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

const listAccounts = vi.fn();
const sendReset = vi.fn();
const setTemp = vi.fn();
const setBlocked = vi.fn();
const updateProfile = vi.fn();
const listMissing = vi.fn();
const createMissing = vi.fn();
const confirmMock = vi.fn();
const notifyMock = vi.fn();

vi.mock('@/lib/admin/admin-accounts-service', () => ({
  listAccountsAction: (...a: unknown[]) => listAccounts(...a),
  sendAccountPasswordResetAction: (...a: unknown[]) => sendReset(...a),
  setAccountTemporaryPasswordAction: (...a: unknown[]) => setTemp(...a),
  setAccountBlockedAction: (...a: unknown[]) => setBlocked(...a),
  updateAccountProfileAction: (...a: unknown[]) => updateProfile(...a),
  listAccountsMissingProfileAction: (...a: unknown[]) => listMissing(...a),
  createMissingProfileAction: (...a: unknown[]) => createMissing(...a),
}));
vi.mock('@/components/system/SystemFeedback', () => ({
  systemConfirm: (...a: unknown[]) => confirmMock(...a),
  systemNotify: (...a: unknown[]) => notifyMock(...a),
}));

import AccountsClient from '../src/app/admin/contas/accounts-client';

// O componente usa o runtime JSX automático do Next; o Vitest deste projeto usa o clássico.
(globalThis as { React?: typeof React }).React = React;

const item = (o: Record<string, unknown> = {}) => ({
  id: 'u1', name: 'Maria Souza', loginEmail: 'dono@optica.com.br', phone: '75999990000', role: 'member',
  createdAt: '2026-10-01T00:00:00Z', lastSignInAt: '2026-11-18T10:00:00Z', blocked: false,
  passwordChange: 'none', passwordChangeKind: null,
  businesses: [{ id: 'b1', name: 'Óptica Circulô', slug: 'optica', relation: 'dono' }, { id: 'b2', name: 'Padaria', slug: 'padaria', relation: 'equipe', teamRole: 'manager' }],
  ...o,
});
const ok = (items: unknown[]) => ({ success: true, items, total: items.length, page: 1, pageSize: 20, totalPages: 1 });

beforeEach(() => {
  listAccounts.mockReset().mockResolvedValue(ok([item()]));
  sendReset.mockReset().mockResolvedValue({ success: true, message: 'E-mail de redefinição enviado para dono@optica.com.br.' });
  setTemp.mockReset().mockResolvedValue({ success: true, temporaryPassword: 'Xk9#mQ2vLp7!aB', expiresAt: '2026-11-23T12:00:00Z', hours: 72 });
  setBlocked.mockReset().mockResolvedValue({ success: true, blocked: true });
  updateProfile.mockReset().mockResolvedValue({ success: true });
  listMissing.mockReset().mockResolvedValue({ success: true, items: [] });
  createMissing.mockReset().mockResolvedValue({ success: true, role: 'anunciante' });
  confirmMock.mockReset().mockResolvedValue(true);
  notifyMock.mockReset();
});
afterEach(() => cleanup());

describe('tela Contas de anunciantes e membros', () => {
  it('lista nome, e-mail de login, empresas (dono e equipe) e situação', async () => {
    const { findByText, getByText } = render(<AccountsClient />);
    await findByText('Maria Souza');
    expect(getByText('dono@optica.com.br')).toBeTruthy();
    expect(getByText('Óptica Circulô')).toBeTruthy();
    expect(getByText('Padaria')).toBeTruthy();
    expect(getByText('Dono')).toBeTruthy();
    expect(getByText('Ativa')).toBeTruthy();
  });

  it('mostra troca de senha pendente, expirada e bloqueio', async () => {
    listAccounts.mockResolvedValue(ok([
      item({ id: 'a', name: 'Pendente', passwordChange: 'pending', passwordChangeKind: 'conta' }),
      item({ id: 'b', name: 'Vencida', passwordChange: 'expired', passwordChangeKind: 'conta' }),
      item({ id: 'c', name: 'Bloqueada', blocked: true }),
    ]));
    const { findByText, getByText } = render(<AccountsClient />);
    await findByText('Pendente');
    expect(getByText('Troca pendente')).toBeTruthy();
    expect(getByText('Senha temporária expirada')).toBeTruthy();
    expect(getByText('Bloqueada', { selector: 'span' })).toBeTruthy();
  });

  it('a busca chama a listagem com o termo digitado (com atraso curto) e volta à página 1', async () => {
    const { findByText, getByLabelText } = render(<AccountsClient />);
    await findByText('Maria Souza');
    fireEvent.change(getByLabelText('Buscar por e-mail, nome ou empresa'), { target: { value: 'circulô' } });
    await waitFor(() => expect(listAccounts).toHaveBeenLastCalledWith({ query: 'circulô', page: 1 }));
  });

  it('estado vazio e erro de carregamento', async () => {
    listAccounts.mockResolvedValue(ok([]));
    const empty = render(<AccountsClient />);
    await empty.findByText('Nenhuma conta encontrada.');
    cleanup();
    listAccounts.mockResolvedValue({ success: false, error: 'FORBIDDEN: Esta área é restrita a master e admin.' });
    const err = render(<AccountsClient />);
    await err.findByRole('alert');
  });

  it('enviar redefinição pede confirmação e só chama o servidor se confirmada', async () => {
    const { findByText, getByText } = render(<AccountsClient />);
    await findByText('Maria Souza');
    confirmMock.mockResolvedValueOnce(false);
    fireEvent.click(getByText('Enviar redefinição'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(sendReset).not.toHaveBeenCalled();
    fireEvent.click(getByText('Enviar redefinição'));
    await waitFor(() => expect(sendReset).toHaveBeenCalledWith('u1'));
    await waitFor(() => expect(notifyMock).toHaveBeenCalledWith({ type: 'success', message: expect.stringContaining('dono@optica.com.br') }));
  });

  it('senha temporária: confirma, mostra a senha UMA vez com o aviso e a descarta ao fechar', async () => {
    const { findByText, getByText, queryByText, getByRole } = render(<AccountsClient />);
    await findByText('Maria Souza');
    fireEvent.click(getByText('Senha temporária'));
    await findByText('Xk9#mQ2vLp7!aB');
    expect(setTemp).toHaveBeenCalledWith('u1');
    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(getByRole('note').textContent).toMatch(/somente agora/);
    expect(getByRole('note').textContent).toMatch(/72 horas/);
    fireEvent.click(getByText('Fechar'));
    expect(queryByText('Xk9#mQ2vLp7!aB')).toBeNull();
  });

  it('erro ao definir senha temporária não mostra senha nenhuma', async () => {
    setTemp.mockResolvedValue({ success: false, error: 'Conta de representante comercial.' });
    const { findByText, getByText, queryByRole } = render(<AccountsClient />);
    await findByText('Maria Souza');
    fireEvent.click(getByText('Senha temporária'));
    await waitFor(() => expect(notifyMock).toHaveBeenCalledWith({ type: 'danger', message: 'Conta de representante comercial.' }));
    expect(queryByRole('note')).toBeNull();
  });

  it('bloquear pede o motivo; reativar pede confirmação', async () => {
    const { findByText, getByText, getByLabelText } = render(<AccountsClient />);
    await findByText('Maria Souza');
    fireEvent.click(getByText('Bloquear'));
    await findByText('Bloquear acesso', { selector: 'h2' });
    fireEvent.change(getByLabelText(/Motivo/), { target: { value: 'Uso indevido' } });
    fireEvent.click(getByText('Bloquear acesso', { selector: 'button' }));
    await waitFor(() => expect(setBlocked).toHaveBeenCalledWith('u1', true, 'Uso indevido'));

    cleanup();
    listAccounts.mockResolvedValue(ok([item({ blocked: true })]));
    const again = render(<AccountsClient />);
    await again.findByText('Maria Souza');
    fireEvent.click(again.getByText('Reativar'));
    await waitFor(() => expect(setBlocked).toHaveBeenLastCalledWith('u1', false));
  });

  it('editar: abre com os dados atuais, mostra o erro de validação e salva', async () => {
    const { findByText, getByText, getByLabelText, findByRole } = render(<AccountsClient />);
    await findByText('Maria Souza');
    fireEvent.click(getByText('Editar'));
    const name = getByLabelText(/Nome completo/) as HTMLInputElement;
    expect(name.value).toBe('Maria Souza');
    updateProfile.mockResolvedValueOnce({ success: false, error: 'O nome deve ter pelo menos 3 caracteres.' });
    fireEvent.change(name, { target: { value: 'Ma' } });
    fireEvent.click(getByText('Salvar'));
    expect((await findByRole('alert')).textContent).toContain('pelo menos 3');
    fireEvent.change(name, { target: { value: 'Maria S. Souza' } });
    fireEvent.click(getByText('Salvar'));
    await waitFor(() => expect(updateProfile).toHaveBeenLastCalledWith('u1', { name: 'Maria S. Souza', phone: '75999990000' }));
  });

  it('contas sem perfil: só verifica quando o admin pede, lista dono/equipe e cria o perfil conta a conta com confirmação', async () => {
    listMissing.mockResolvedValue({
      success: true,
      items: [{ userId: 'x1', loginEmail: 'antigo@x.com', name: 'Dono Antigo', relation: 'dono', businesses: [{ id: 'b1', name: 'Óptica Antiga' }] }],
    });
    const { findByText, getByText, queryByText } = render(<AccountsClient />);
    await findByText('Maria Souza');
    expect(listMissing).not.toHaveBeenCalled(); // não pesa a cada carregamento
    expect(queryByText('Dono Antigo')).toBeNull();

    fireEvent.click(getByText('Verificar contas sem perfil'));
    await findByText('Dono Antigo');
    expect(getByText(/Dono de: Óptica Antiga/)).toBeTruthy();

    confirmMock.mockResolvedValueOnce(false);
    fireEvent.click(getByText('Criar perfil'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(createMissing).not.toHaveBeenCalled();

    fireEvent.click(getByText('Criar perfil'));
    await waitFor(() => expect(createMissing).toHaveBeenCalledWith('x1'));
    await waitFor(() => expect(queryByText('Dono Antigo')).toBeNull());
  });

  it('contas sem perfil: nenhuma encontrada e erro de verificação', async () => {
    const first = render(<AccountsClient />);
    await first.findByText('Maria Souza');
    fireEvent.click(first.getByText('Verificar contas sem perfil'));
    await first.findByText('Nenhuma conta sem perfil encontrada.');
    cleanup();
    listMissing.mockResolvedValue({ success: false, error: 'FORBIDDEN: Esta área é restrita a master e admin.' });
    const second = render(<AccountsClient />);
    await second.findByText('Maria Souza');
    fireEvent.click(second.getByText('Verificar contas sem perfil'));
    await waitFor(() => expect(second.getAllByRole('alert').length).toBeGreaterThan(0));
  });
});
