// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

(globalThis as { React?: typeof React }).React = React;

const updatePassword = vi.fn();
const signOut = vi.fn();
let hasSession = true;

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/lib/auth/auth-service', () => ({
  getSession: async () => ({ user: hasSession ? { id: 'u1' } : null }),
  updatePassword: (...a: any[]) => updatePassword(...a),
  signOut: (...a: any[]) => signOut(...a),
}));

import UpdatePasswordPage from '../src/app/(auth)/update-password/page';

beforeEach(() => {
  hasSession = true;
  updatePassword.mockReset().mockResolvedValue({ error: null });
  signOut.mockReset().mockResolvedValue(null);
});
afterEach(() => cleanup());

async function fill(pw: string, confirm = pw) {
  render(<UpdatePasswordPage />);
  const first = await screen.findByLabelText('Nova senha');
  fireEvent.change(first, { target: { value: pw } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirm } });
}

describe('tela de nova senha', () => {
  it('cada campo tem botão de mostrar/ocultar a senha', async () => {
    await fill('senha-segura-1');
    const input = screen.getByLabelText('Nova senha') as HTMLInputElement;
    expect(input.type).toBe('password');
    const [toggle] = screen.getAllByRole('button', { name: 'Mostrar senha' });
    fireEvent.click(toggle!);
    expect(input.type).toBe('text');
    expect(screen.getAllByRole('button', { name: 'Ocultar senha' })).toHaveLength(1);
    expect((screen.getByLabelText('Confirmar nova senha') as HTMLInputElement).type).toBe('password');
  });

  it('senha alterada: mostra a confirmação com link para o login e encerra a sessão', async () => {
    await fill('senha-segura-1');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Senha alterada com sucesso!')).toBeTruthy();
    expect(updatePassword).toHaveBeenCalledWith(expect.anything(), 'senha-segura-1');
    expect(signOut).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Ir para o login' }).getAttribute('href')).toBe('/login');
  });

  it('erro do Supabase (link vencido): NÃO mostra sucesso e orienta pedir novo link', async () => {
    updatePassword.mockResolvedValue({ error: { message: 'expired' } });
    await fill('senha-segura-1');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Senha alterada com sucesso!')).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('senhas diferentes ou curtas: valida e não envia', async () => {
    await fill('senha-segura-1', 'outra-senha-2');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(screen.getByText(/senhas/i)).toBeTruthy());
    expect(updatePassword).not.toHaveBeenCalled();
  });
});
