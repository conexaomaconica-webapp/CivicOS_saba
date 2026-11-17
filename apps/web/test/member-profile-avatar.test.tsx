// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('@/lib/member/member-profile-service', () => ({ updateMemberProfileAction: vi.fn() }));
vi.mock('@/lib/media/optimize-image', () => ({ optimizeImageForUpload: vi.fn() }));
vi.mock('@/components/admin/BrazilianLocationFields', () => ({ BrazilianLocationFields: () => <div data-testid="loc" /> }));

import MemberProfileForm from '../src/app/minha-conta/perfil/member-profile-form';

// O componente usa o runtime JSX automático do Next; o Vitest deste projeto usa o clássico.
(globalThis as { React?: typeof React }).React = React;

const profile = (avatarUrl: string | null) => ({ name: 'Maria', email: 'm@x.com', phone: '', city: '', state: '', avatarUrl });

describe('foto do perfil (URL assinada do bucket privado)', () => {
  afterEach(() => cleanup());

  it('URL assinada (/object/sign/...?token=) carrega direto, sem passar pelo otimizador do Next', () => {
    const signed = 'https://exemplo.supabase.co/storage/v1/object/sign/member-avatars/u/avatar/a.webp?token=abc';
    const { container } = render(<MemberProfileForm profile={profile(signed)} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('src')).toBe(signed);
    expect(img!.getAttribute('src')).not.toContain('/_next/image');
  });

  it('sem foto mostra o ícone padrão (nenhuma imagem)', () => {
    const { container } = render(<MemberProfileForm profile={profile(null)} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
