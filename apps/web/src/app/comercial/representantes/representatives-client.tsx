'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REPRESENTATIVE_STATUS_LABEL } from '@/lib/commercial/access-rules';
import {
  createRepresentativeAction,
  regenerateTempPasswordAction,
  setRepresentativeStatusAction,
  type RepresentativeListItem,
} from '@/lib/commercial/representatives-service';

type Message = { type: 'success' | 'error'; text: string } | null;

/** Credencial exibida UMA vez à equipe. Fica só na memória da página: nunca em banco, log ou auditoria. */
type RevealedCredential = { name: string; email: string; password: string; expiresAt: string };

function tempPasswordLabel(r: RepresentativeListItem): { text: string; tone: string } | null {
  if (r.access_mode !== 'temp_password') return null;
  if (r.password_changed_at) return { text: 'Senha definida pelo representante', tone: 'text-emerald-800' };
  if (r.temp_password_expires_at && new Date(r.temp_password_expires_at).getTime() <= Date.now()) {
    return { text: 'Senha temporária expirada', tone: 'text-rose-800' };
  }
  return {
    text: `Senha temporária pendente${r.temp_password_expires_at ? ` (expira em ${new Date(r.temp_password_expires_at).toLocaleString('pt-BR')})` : ''}`,
    tone: 'text-amber-800',
  };
}

export default function RepresentativesClient({
  items,
  loadError,
  canManage,
}: {
  items: RepresentativeListItem[];
  loadError: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [credential, setCredential] = useState<RevealedCredential | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ personType: 'pf' as 'pf' | 'pj', legalName: '', tradeName: '', email: '', phone: '', document: '', pixKeyType: '', pixKey: '', accessMode: 'invite' as 'invite' | 'temp_password', tempHours: '72' });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setCredential(null);
    setCopied(false);
    const res = await createRepresentativeAction({
      personType: form.personType,
      legalName: form.legalName,
      tradeName: form.tradeName,
      email: form.email,
      phone: form.phone,
      document: form.document,
      pixKeyType: form.pixKeyType as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | '',
      pixKey: form.pixKey,
      accessMode: form.accessMode,
      tempPasswordHours: Number(form.tempHours),
    });
    if (res.success && res.data?.temporaryPassword) {
      setCredential({
        name: form.legalName.trim(),
        email: form.email.trim().toLowerCase(),
        password: res.data.temporaryPassword,
        expiresAt: res.data.tempPasswordExpiresAt ?? '',
      });
      setMessage({ type: 'success', text: `Representante cadastrado (código ${res.data.referralCode}) com acesso direto. Copie a senha temporária abaixo: ela não será exibida novamente.` });
      setForm({ personType: 'pf', legalName: '', tradeName: '', email: '', phone: '', document: '', pixKeyType: '', pixKey: '', accessMode: 'temp_password', tempHours: form.tempHours });
      router.refresh();
    } else if (res.success && res.data) {
      setMessage({
        type: 'success',
        text: res.data.linkedUser
          ? `Representante cadastrado e vinculado ao usuário existente. Código de indicação: ${res.data.referralCode}.`
          : `Representante cadastrado como convidado (código ${res.data.referralCode}). Peça que ele entre ou crie conta com o e-mail ${form.email.trim().toLowerCase()}: o vínculo é feito automaticamente no primeiro acesso à Área do Representante.`,
      });
      setForm({ personType: 'pf', legalName: '', tradeName: '', email: '', phone: '', document: '', pixKeyType: '', pixKey: '', accessMode: 'invite', tempHours: form.tempHours });
      router.refresh();
    } else if (!res.success) {
      setMessage({ type: 'error', text: res.error });
    }
    setBusy(false);
  };

  const regenerate = async (item: RepresentativeListItem) => {
    if (!window.confirm('Gerar uma nova senha temporária? A anterior deixa de funcionar.')) return;
    setBusy(true);
    setMessage(null);
    setCopied(false);
    const res = await regenerateTempPasswordAction({ representativeId: item.id });
    if (res.success && res.data) {
      setCredential({ name: item.trade_name || item.legal_name, email: item.email, password: res.data.temporaryPassword, expiresAt: res.data.tempPasswordExpiresAt });
      setMessage({ type: 'success', text: 'Nova senha temporária gerada. Copie agora: ela não será exibida novamente.' });
      router.refresh();
    } else if (!res.success) {
      setMessage({ type: 'error', text: res.error });
    }
    setBusy(false);
  };

  const copyCredential = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const changeStatus = async (item: RepresentativeListItem, status: 'pending_review' | 'active' | 'suspended' | 'terminated') => {
    let reason: string | undefined;
    let contractVersion: string | undefined;
    if (status === 'suspended' || status === 'terminated') {
      reason = window.prompt(status === 'suspended' ? 'Motivo da suspensão:' : 'Motivo do desligamento (os créditos já registrados são preservados):') ?? '';
      if (!reason.trim()) return;
    }
    if (status === 'active' && !item.contract_accepted_at) {
      contractVersion = window.prompt('Versão do contrato aceito pelo representante (ex.: 2026-v1):') ?? '';
      if (!contractVersion.trim()) return;
    }
    setBusy(true);
    setMessage(null);
    const res = await setRepresentativeStatusAction({ representativeId: item.id, status, reason, contractVersion });
    setMessage(res.success ? { type: 'success', text: 'Status atualizado.' } : { type: 'error', text: res.error });
    if (res.success) router.refresh();
    setBusy(false);
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white';

  return (
    <div className="space-y-8">
      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {message.text}
        </div>
      )}

      {credential && (
        <div role="alert" className="rounded-2xl border-2 border-[#C9A227] bg-amber-50 p-5 space-y-3">
          <h2 className="text-base font-serif font-bold text-[#3B0B14]">Senha temporária de {credential.name}</h2>
          <p className="text-xs text-amber-900">Envie ao representante por um canal seguro. <strong>Esta senha não será exibida novamente</strong> e não fica registrada no sistema.</p>
          <dl className="text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><dt className="text-[11px] font-bold uppercase text-stone-500">Login (e-mail)</dt><dd className="break-all">{credential.email}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-stone-500">Senha temporária</dt><dd className="font-mono font-bold text-base select-all">{credential.password}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-stone-500">Válida até</dt><dd>{credential.expiresAt ? new Date(credential.expiresAt).toLocaleString('pt-BR') : '—'}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyCredential} className="px-4 py-2 rounded-xl bg-[#3B0B14] text-white text-xs font-bold cursor-pointer">{copied ? 'Copiada ✓' : 'Copiar senha'}</button>
            <button type="button" onClick={() => setCredential(null)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold cursor-pointer">Já copiei, ocultar</button>
          </div>
        </div>
      )}

      {canManage && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-4">
          <h2 className="text-xl font-serif font-bold text-[#3B0B14]">Novo representante</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
            <label>Tipo
              <select className={input} value={form.personType} onChange={(e) => set('personType', e.target.value)}>
                <option value="pf">Pessoa física</option>
                <option value="pj">Pessoa jurídica</option>
              </select>
            </label>
            <label>{form.personType === 'pf' ? 'CPF' : 'CNPJ'}
              <input className={input} value={form.document} onChange={(e) => set('document', e.target.value)} required />
            </label>
            <label>{form.personType === 'pf' ? 'Nome completo' : 'Razão social'}
              <input className={input} value={form.legalName} onChange={(e) => set('legalName', e.target.value)} required />
            </label>
            <label>Nome fantasia (opcional)
              <input className={input} value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} />
            </label>
            <label>E-mail (mesmo do login do representante)
              <input type="email" className={input} value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </label>
            <label>Telefone (opcional)
              <input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </label>
            <label>Tipo da chave PIX (opcional)
              <select className={input} value={form.pixKeyType} onChange={(e) => set('pixKeyType', e.target.value)}>
                <option value="">Não informar agora</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="random">Aleatória</option>
              </select>
            </label>
            <label>Chave PIX (guardada cifrada)
              <input className={input} value={form.pixKey} onChange={(e) => set('pixKey', e.target.value)} disabled={!form.pixKeyType} />
            </label>
          </div>
          <fieldset className="space-y-2 rounded-xl border border-stone-200 p-4">
            <legend className="px-1 text-xs font-bold text-stone-700">Como o representante vai acessar</legend>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="accessMode" className="mt-1" checked={form.accessMode === 'invite'} onChange={() => set('accessMode', 'invite')} />
              <span><strong>Convite</strong><span className="block text-xs text-stone-500">Ele entra ou cria conta com o e-mail acima; o vínculo é feito no primeiro acesso.</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="accessMode" className="mt-1" checked={form.accessMode === 'temp_password'} onChange={() => set('accessMode', 'temp_password')} />
              <span><strong>Acesso direto com senha temporária</strong><span className="block text-xs text-stone-500">O sistema cria o acesso e gera uma senha temporária, exibida uma única vez. Ele precisa trocá-la no primeiro login. Não vale para e-mail que já tem conta.</span></span>
            </label>
            {form.accessMode === 'temp_password' && (
              <label className="block text-xs font-bold text-stone-700">Validade da senha temporária
                <select className={input} value={form.tempHours} onChange={(e) => set('tempHours', e.target.value)}>
                  <option value="24">24 horas</option>
                  <option value="48">48 horas</option>
                  <option value="72">72 horas (padrão)</option>
                  <option value="120">5 dias</option>
                  <option value="168">7 dias</option>
                </select>
              </label>
            )}
          </fieldset>
          <button type="submit" disabled={busy} className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">
            {busy ? 'Salvando…' : 'Cadastrar representante'}
          </button>
        </form>
      )}

      <section aria-labelledby="lista-titulo" className="space-y-3">
        <h2 id="lista-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Representantes ({items.length})</h2>
        {loadError && <p className="text-sm text-rose-700">{loadError}</p>}
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Representante</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Vínculo</th>
                {canManage && <th className="px-4 py-3">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Nenhum representante cadastrado.</td></tr>
              )}
              {items.map((r) => (
                <tr key={r.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{r.trade_name || r.legal_name}</span>
                    <span className="block text-xs text-stone-500 break-all">{r.email}</span>
                    {r.document_last4 && <span className="block text-xs text-stone-400">{r.person_type === 'pf' ? 'CPF' : 'CNPJ'} final {r.document_last4}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.referral_code}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold">{REPRESENTATIVE_STATUS_LABEL[r.status]}</span>
                    {r.termination_reason && <span className="block text-xs text-stone-500">{r.termination_reason}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.user_id ? 'Usuário vinculado' : 'Aguardando primeiro acesso'}
                    {(() => {
                      const t = tempPasswordLabel(r);
                      return t ? <span className={`block font-semibold ${t.tone}`}>{t.text}</span> : null;
                    })()}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(r.status === 'invited' || r.status === 'pending_review' || r.status === 'suspended') && (
                          <button disabled={busy} onClick={() => changeStatus(r, 'active')} className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                            {r.status === 'suspended' ? 'Reativar' : 'Ativar'}
                          </button>
                        )}
                        {r.status === 'active' && (
                          <button disabled={busy} onClick={() => changeStatus(r, 'suspended')} className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 cursor-pointer disabled:opacity-50">Suspender</button>
                        )}
                        {r.access_mode === 'temp_password' && !r.password_changed_at && r.status !== 'terminated' && (
                          <button disabled={busy} onClick={() => regenerate(r)} className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-xs font-bold border border-stone-300 cursor-pointer disabled:opacity-50">Nova senha temporária</button>
                        )}
                        {r.status !== 'terminated' && (
                          <button disabled={busy} onClick={() => changeStatus(r, 'terminated')} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 cursor-pointer disabled:opacity-50">Desligar</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
