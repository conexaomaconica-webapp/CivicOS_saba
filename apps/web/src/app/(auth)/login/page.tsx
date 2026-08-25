'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Building2, LayoutDashboard, Crown, LogOut, ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Session State
  const [activeUser, setActiveUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasBusinesses, setHasBusinesses] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const checkUserPermissions = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const role = profile?.role || 'anunciante';
      setUserRole(role);

      // 2. Fetch Businesses owned by this user
      const { data: biz } = await (supabase as any)
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);

      const isOwner = Boolean(biz && biz.length > 0);
      setHasBusinesses(isOwner);

      return { role, isOwner };
    } catch (_err) {
      setUserRole('anunciante');
      return { role: 'anunciante', isOwner: false };
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setActiveUser(user);
        await checkUserPermissions(user.id);
      }
      setCheckingSession(false);
    };
    void checkSession();
  }, [supabase]);

  const handleLogout = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await supabase.auth.signOut();
      setActiveUser(null);
      setUserRole(null);
      setHasBusinesses(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao deslogar da conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg('E-mail ou senha incorretos.');
      } else if (data.user) {
        setActiveUser(data.user);
        const { role, isOwner } = await checkUserPermissions(data.user.id);

        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');

        if (redirectParam) {
          router.push(redirectParam);
          return;
        }

        // Redirecionamento Automático Inteligente quando não houver duplicidade de perfis
        if (role === 'master') {
          // Permanece na tela para exibir o Portal Switcher completo para o Master
        } else if (role === 'socio_admin' || role === 'master') {
          if (!isOwner) {
            router.push('/admin');
          }
        } else {
          router.push('/anunciante');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
        <p className="text-xs text-amber-200/80">Verificando sessão ativa...</p>
      </div>
    );
  }

  // SESSÃO ATIVA - SELETOR INTELIGENTE DE PORTAIS (CENTRAL DE ACESSOS)
  if (activeUser) {
    const isMaster = userRole === 'master';
    const isAdmin = userRole === 'master' || userRole === 'socio_admin' || userRole === 'platform_admin';
    const isAdvertiserOnly = !isAdmin;

    return (
      <div className="space-y-5 w-full text-left">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C9A227]" /> Central de Acessos
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase">
              {isMaster ? 'Superadmin Master' : isAdmin ? 'Administrador' : 'Anunciante'}
            </span>
          </div>
          <p className="text-xs text-stone-300">
            Conectado como <strong className="text-white">{activeUser.email}</strong>. Escolha o ambiente que deseja acessar:
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2.5">
          {/* OPÇÃO MASTER 1: TORRE DE CONTROLE MASTER */}
          {isMaster && (
            <Link
              href="/admin/platform"
              className="p-3.5 bg-gradient-to-r from-purple-950/80 to-[#3B0B14] hover:from-purple-900 border border-purple-500/40 rounded-2xl transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-900/60 rounded-xl text-purple-300">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-amber-200 transition-colors">
                    Torre de Controle Master
                  </h3>
                  <p className="text-[11px] text-purple-200/70">Gestão global de tenants e infraestrutura</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#C9A227] group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* OPÇÃO 2: ADMIN CONEXÃO MAÇÔNICA */}
          {isAdmin && (
            <Link
              href="/admin"
              className="p-3.5 bg-[#3B0B14] hover:bg-[#4B161B] border border-[#C9A227]/50 rounded-2xl transition-all flex items-center justify-between group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#C9A227]/20 rounded-xl text-[#C9A227]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-[#C9A227] transition-colors">
                    Admin Conexão Maçônica
                  </h3>
                  <p className="text-[11px] text-amber-200/80">Aprovações, empresas, contratos e finanças</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#C9A227] group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* OPÇÃO 3: PAINEL DO ANUNCIANTE */}
          {(isAdvertiserOnly || hasBusinesses || isMaster) && (
            <Link
              href="/anunciante"
              className="p-3.5 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-2xl transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-900/50 rounded-xl text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Perfil / Painel do Anunciante
                  </h3>
                  <p className="text-[11px] text-stone-400">Gerenciar empresas, contratos e analytics</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* OPÇÃO MASTER 4: SISTEMA WHITELABEL CIVICOS */}
          {isMaster && (
            <Link
              href="/dashboard"
              className="p-3.5 bg-stone-950/70 hover:bg-stone-900 border border-stone-800 rounded-2xl transition-all flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-950 rounded-xl text-sky-400">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-300 group-hover:text-white transition-colors">
                    Sistema Whitelabel CivicOS
                  </h3>
                  <p className="text-[11px] text-stone-500">Dashboard de produto da plataforma mãe</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loading}
          className="w-full py-2.5 bg-stone-900/60 hover:bg-stone-800 border border-stone-700 rounded-xl text-xs font-bold text-stone-400 hover:text-red-400 transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{loading ? 'Saindo...' : 'Sair desta Conta'}</span>
        </button>
      </div>
    );
  }

  // FORMULÁRIO DE LOGIN COM DESIGN PREMIUM DA CONEXÃO MAÇÔNICA
  return (
    <form onSubmit={(e) => void handleLogin(e)} className="space-y-4 w-full text-left">
      <div className="space-y-1">
        <h2 className="text-lg font-serif font-bold text-white">Bem-vindo de volta</h2>
        <p className="text-xs text-stone-300">Entre com seu e-mail e senha para acessar seu painel.</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Input E-mail */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs font-bold text-stone-300">
          Endereço de E-mail
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@conexaomaconica.com.br"
            className="w-full pl-9 pr-3 py-2.5 bg-[#1f0509]/80 border border-[#C9A227]/40 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
          />
        </div>
      </div>

      {/* Input Senha */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-xs font-bold text-stone-300">
            Senha de Acesso
          </label>
          <Link href="/forgot-password" className="text-[11px] text-[#C9A227] hover:underline font-semibold">
            Esqueceu a senha?
          </Link>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha secreta"
            className="w-full pl-9 pr-3 py-2.5 bg-[#1f0509]/80 border border-[#C9A227]/40 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
          />
        </div>
      </div>

      {/* Botão Entrar */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-[#3B0B14] to-[#4B161B] hover:from-[#4B161B] hover:to-[#5c1b22] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/60 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
            <span>Autenticando...</span>
          </>
        ) : (
          <span>Entrar no Painel</span>
        )}
      </button>

      {/* Link de Cadastro */}
      <div className="text-center text-xs text-stone-400 pt-2 border-t border-[#C9A227]/20 flex items-center justify-center gap-1">
        <span>Ainda não possui uma conta?</span>
        <Link href="/anunciar/passo-1" className="text-[#C9A227] font-bold hover:underline">
          Anunciar Empresa
        </Link>
      </div>
    </form>
  );
}
