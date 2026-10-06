'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, Gift, Handshake, Heart, Home, LogOut, Menu, Store, UserRound, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/minha-conta', label: 'Visão geral', icon: Home },
  { href: '/minha-conta/perfil', label: 'Meu perfil', icon: UserRound },
  { href: '/minha-conta/beneficios', label: 'Meus benefícios', icon: Gift },
  { href: '/minha-conta/conexoes', label: 'Minhas conexões', icon: Handshake },
  { href: '/minha-conta/indicacoes', label: 'Minhas indicações', icon: Users },
  { href: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart },
];

// Cor padrão da Conexão Maçônica; o tenant pode sobrescrever com a cor primária da sua identidade.
// O token global --color-primary tem um azul padrão do design system, por isso a área do membro usa variáveis próprias.
const DEFAULT_PRIMARY = '#5d1523';
const DEFAULT_ACCENT = '#C9A227';
const HEX = /^#[0-9a-f]{6}$/i;

/** Texto claro ou escuro sobre a cor primária, pelo contraste (luminância relativa). */
function readableForeground(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? '#1c1917' : '#ffffff';
}

const PRIMARY = 'var(--member-primary)';
const PRIMARY_FG = 'var(--member-primary-fg)';

type ShellProps = {
  children: React.ReactNode;
  member: { name: string; avatarUrl: string | null; hasBusiness: boolean };
  brand: { name: string; logoUrl: string | null; primaryColor: string | null };
};

// Logomarca oficial da Conexão Maçônica (texto "Conexão" em branco): só legível sobre a cor primária.
const DEFAULT_LOGO = '/logoconexao_red_vert.png';

function BrandMark({ brand, onDark, compact = false }: { brand: ShellProps['brand']; onDark: boolean; compact?: boolean }) {
  const logo = brand.logoUrl || (onDark ? DEFAULT_LOGO : null);
  return (
    <Link href="/guia" className="flex min-w-0 items-center gap-2.5" aria-label={`${brand.name} — ir para o Guia`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={`Logomarca ${brand.name}`} className={`${compact ? 'h-9' : 'h-14'} w-auto max-w-full object-contain object-left`} />
      ) : (
        <>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black" style={{ background: PRIMARY, color: PRIMARY_FG }}>
            {brand.name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate font-serif text-sm font-bold" style={{ color: PRIMARY }}>{brand.name}</span>
        </>
      )}
    </Link>
  );
}

export default function MemberShell({ children, member, brand }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const primary = brand.primaryColor && HEX.test(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY;
  // Sem logo própria do tenant e com a cor da Conexão (ou nenhuma cor configurada): logomarca oficial sobre a cor primária.
  const isConexaoDefault = !brand.primaryColor || brand.primaryColor.toLowerCase() === DEFAULT_PRIMARY;
  const onDark = !brand.logoUrl && isConexaoDefault;
  const themeVars = {
    '--member-primary': primary,
    '--member-primary-fg': readableForeground(primary),
    '--member-accent': DEFAULT_ACCENT,
  } as React.CSSProperties;

  // Fecha a gaveta ao navegar, trava a rolagem do fundo e aceita ESC.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const logout = async () => {
    await createClient().auth.signOut();
    try {
      // Aparelho compartilhado: não deixa os favoritos deste membro para o próximo visitante.
      localStorage.removeItem('cm_directory_favorites');
    } catch {
      // ignore
    }
    router.replace('/');
    router.refresh();
  };

  const isActive = (href: string) => (href === '/minha-conta' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const itemBase = 'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold';

  const nav = (
    <div className="flex min-h-full flex-col">
      <div
        className={`hidden border-b px-5 py-4 lg:block ${onDark ? 'border-transparent' : 'border-stone-200'}`}
        style={onDark ? { background: PRIMARY } : undefined}
      >
        <BrandMark brand={brand} onDark={onDark} />
      </div>

      <div className="border-b border-stone-200 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-white" style={{ background: PRIMARY }}>
            {member.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatarUrl} alt="Foto do membro" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif font-bold" style={{ color: PRIMARY }}>{member.name}</p>
            <p className="text-xs text-stone-500">Área do Membro</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1 p-3" aria-label="Menu da conta">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`${itemBase} ${active ? '' : 'text-stone-700 hover:bg-stone-100'}`}
              style={active ? { background: PRIMARY, color: PRIMARY_FG } : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
        {member.hasBusiness && (
          <Link href="/anunciante" className={`${itemBase} text-stone-700 hover:bg-stone-100`}>
            <Store className="h-4 w-4 shrink-0" />
            Portal do Anunciante
          </Link>
        )}
      </nav>

      <div className="mt-auto space-y-1 border-t border-stone-200 p-3">
        <Link href="/guia" className={`${itemBase} text-stone-700 hover:bg-stone-100`}>
          <Compass className="h-4 w-4 shrink-0" />
          Voltar ao Guia
        </Link>
        <button type="button" onClick={logout} className={`${itemBase} w-full text-rose-700 hover:bg-rose-50`}>
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50" style={themeVars}>
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-stone-200 bg-white lg:block">{nav}</aside>

      <header
        className={`sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-2.5 lg:hidden ${onDark ? 'border-transparent' : 'border-stone-200 bg-white'}`}
        style={onDark ? { background: PRIMARY, color: PRIMARY_FG } : undefined}
      >
        <BrandMark brand={brand} onDark={onDark} compact />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${onDark ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}
        >
          <Menu />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu da conta"
            className="relative h-full w-80 max-w-[85vw] overflow-y-auto bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full hover:bg-stone-100"
              aria-label="Fechar menu"
            >
              <X />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:ml-72 lg:p-8">{children}</main>
    </div>
  );
}
