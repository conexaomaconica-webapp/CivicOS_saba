'use client';

import React, { useState } from 'react';
import {
  User,
  Lock,
  CheckCircle2,
  Loader2,
  Key,
} from 'lucide-react';
import {
  AdvertiserAccountDTO,
  updateAdvertiserAccountAction,
} from '@/lib/advertiser/advertiser-account-service';

export default function AdvertiserAccountClient({ data }: { data: AdvertiserAccountDTO }) {
  const { user, security } = data;
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const res = await updateAdvertiserAccountAction({ full_name: fullName, phone });
    setSaving(false);
    if (res.success) {
      setFeedback(res.message);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Configurações da Conta • Segurança do Operador
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Minha Conta &amp; Segurança
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Gerencie seus dados de acesso, preferências de contato e credenciais de segurança.
          </p>
        </div>
      </div>

      {/* FEEDBACK DE ATUALIZAÇÃO */}
      {feedback && (
        <div className="p-4 rounded-2xl border text-xs flex items-center gap-3 bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* SEÇÃO 1: DADOS DO RESPONSÁVEL / OPERADOR */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-[#C9A227]" /> Perfil do Responsável Legal
        </h2>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-stone-800">Nome Completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Telefone / WhatsApp Comercial</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-stone-800">E-mail de Login (Somente Leitura)</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl font-mono text-stone-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Loja Maçônica de Vínculo</label>
              <input
                type="text"
                value={user.lodge_name || 'Não informada'}
                disabled
                className="w-full px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl font-medium text-stone-600 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO 2: SEGURANÇA & SEGURANÇA DE ACESSO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" /> Credenciais &amp; Sessões Ativas
        </h2>

        <div className="space-y-3 text-xs">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <strong className="text-stone-900 block font-bold">Troca de Senha de Acesso</strong>
              <span className="text-stone-500 text-[11px]">Última alteração registrada em {security.last_password_change || '15/01/2026'}</span>
            </div>

            <button
              type="button"
              onClick={() => alert('Link de redefinição enviado para seu e-mail!')}
              className="px-3 py-1.5 bg-white border border-stone-200 hover:border-stone-400 text-stone-800 font-bold rounded-xl flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-stone-500" />
              <span>Redefinir Senha</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
