'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Gift, Heart, Home, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/minha-conta', label: 'Visão geral', icon: Home },
  { href: '/minha-conta/perfil', label: 'Meu perfil', icon: UserRound },
  { href: '/minha-conta/beneficios', label: 'Meus benefícios', icon: Gift },
  { href: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart, disabled: true },
];

export default function MemberShell({ children, member }: { children: React.ReactNode; member: { name: string; avatarUrl: string | null; hasBusiness: boolean } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logout = async () => { await createClient().auth.signOut(); router.replace('/'); router.refresh(); };
  const nav = <><div className="border-b border-stone-200 p-5"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#4B161B] text-white">{member.avatarUrl ? <img src={member.avatarUrl} alt="Foto do membro" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</span><div className="min-w-0"><p className="truncate font-serif font-bold text-[#4B161B]">{member.name}</p><p className="text-xs text-stone-500">Área do Membro</p></div></div></div><nav className="space-y-1 p-3">{links.map(({ href, label, icon: Icon, disabled }) => disabled ? <span key={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400"><Icon className="h-4 w-4" />{label}<small className="ml-auto">Em breve</small></span> : <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${pathname === href ? 'bg-[#4B161B] text-white' : 'text-stone-700 hover:bg-stone-100'}`}><Icon className="h-4 w-4" />{label}</Link>)}{member.hasBusiness && <Link href="/anunciante" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-100">Portal do Anunciante</Link>}</nav><div className="mt-auto border-t border-stone-200 p-3"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><LogOut className="h-4 w-4" />Sair</button></div></>;
  return <div className="min-h-screen bg-stone-50"><aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-stone-200 bg-white lg:flex">{nav}</aside><header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden"><strong className="font-serif text-[#4B161B]">Minha Conta</strong><button onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button></header>{open && <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-72 flex-col bg-white" onClick={(event) => event.stopPropagation()}><button onClick={() => setOpen(false)} className="absolute left-72 top-2 rounded-full bg-white p-2" aria-label="Fechar"><X /></button>{nav}</aside></div>}<main className="mx-auto max-w-6xl p-4 sm:p-8 lg:ml-72">{children}</main></div>;
}

