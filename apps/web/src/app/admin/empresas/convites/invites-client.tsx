'use client';

import { systemConfirm } from '@/components/system/SystemFeedback';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateBR } from '@/lib/format/datetime-br';
import { Check, Copy, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import {
  createSignupInviteAction,
  getSignupInviteLinkAction,
  regenerateSignupInviteLinkAction,
  deleteSignupInviteAction,
  type InviteListItem,
} from '@/lib/onboarding/signup-invite-service';
import { buildInviteShareMessage } from '@/lib/onboarding/signup-invite-shared';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  sent: { text: 'Aguardando o cliente', cls: 'bg-amber-100 text-amber-900' },
  submitted: { text: 'Enviado — conferir', cls: 'bg-sky-100 text-sky-900' },
  converted: { text: 'Cadastro criado', cls: 'bg-emerald-100 text-emerald-900' },
  revoked: { text: 'Cancelado', cls: 'bg-stone-200 text-stone-700' },
};

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3B0B14] focus:ring-2 focus:ring-[#3B0B14]/10';

export default function InvitesClient({ initialItems, emailConfigured }: { initialItems: InviteListItem[]; emailConfigured: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ invitedName: '', invitedEmail: '', note: '', expiresInDays: 15 });
  const [sendByEmail, setSendByEmail] = useState(true);
  const [emailNote, setEmailNote] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [sentTo, setSentTo] = useState<{ name: string; days: number }>({ name: '', days: 15 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowFeedback, setRowFeedback] = useState<{ id: string; text: string } | null>(null);
  const [shareOverride, setShareOverride] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    setEmailNote(null);
    setLink(null);
    setShareOverride(null);
    const result = await createSignupInviteAction({ ...form, sendEmail: sendByEmail && Boolean(form.invitedEmail.trim()) });
    setCreating(false);
    if (!result.success || !result.url) {
      setMessage({ type: 'error', text: result.error || 'Não foi possível criar o convite.' });
      return;
    }
    setLink(result.url);
    setSentTo({ name: form.invitedName.trim(), days: form.expiresInDays });
    if (result.emailStatus === 'sent') setEmailNote({ type: 'success', text: `E-mail enviado para ${form.invitedEmail.trim()}.` });
    else if (result.emailStatus === 'not_configured') setEmailNote({ type: 'error', text: 'O envio de e-mail não está configurado no servidor (RESEND_API_KEY e MAIL_FROM). Copie o link e envie manualmente.' });
    else if (result.emailStatus === 'failed') setEmailNote({ type: 'error', text: 'Não foi possível enviar o e-mail agora. Copie o link e envie manualmente.' });
    setForm({ invitedName: '', invitedEmail: '', note: '', expiresInDays: form.expiresInDays });
    router.refresh();
  }

  // Mensagem pronta para WhatsApp (ou qualquer conversa): saudação, o que é, o link e o aviso de conferência.
  const shareText = link
    ? shareOverride ?? buildInviteShareMessage({ name: sentTo.name, link, daysLeft: sentTo.days })
    : '';

  async function copy(kind: 'link' | 'message') {
    const text = kind === 'link' ? link : shareText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // sem permissão de área de transferência: o link continua visível para copiar à mão
    }
  }

  // Número do WhatsApp (opcional): só dígitos, com 55 na frente quando vier sem o código do país.
  function whatsappUrl(): string {
    const digits = whatsapp.replace(/\D/g, '');
    const phone = digits.length >= 10 ? (digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`) : '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(shareText)}`;
  }

  // Link de um convite ativo. Convites criados antes do recurso de reabrir não têm o código guardado: nesses, é preciso
  // trocar o link (o anterior deixa de valer), então a equipe confirma antes.
  async function resolveLink(item: InviteListItem): Promise<{ url: string; message: string } | null> {
    if (item.has_link) {
      const result = await getSignupInviteLinkAction(item.id);
      if (!result.success || !result.url) {
        setMessage({ type: 'error', text: result.error || 'Não foi possível abrir o link.' });
        return null;
      }
      return { url: result.url, message: result.message ?? '' };
    }
    if (!(await systemConfirm({ message: 'O link deste convite foi gerado antes do recurso de copiar e não pôde ser guardado. Vamos criar um novo link para ele: o enviado antes deixará de funcionar. Continuar?', danger: false }))) return null;
    const result = await regenerateSignupInviteLinkAction(item.id);
    if (!result.success || !result.url) {
      setMessage({ type: 'error', text: result.error || 'Não foi possível gerar o link.' });
      return null;
    }
    router.refresh();
    return { url: result.url, message: result.message ?? '' };
  }

  async function rowCopy(item: InviteListItem) {
    setBusyId(item.id);
    setRowFeedback(null);
    const resolved = await resolveLink(item);
    setBusyId(null);
    if (!resolved) return;
    try {
      await navigator.clipboard.writeText(resolved.url);
      setRowFeedback({ id: item.id, text: 'Link copiado' });
    } catch {
      // sem permissão de área de transferência: mostra o link no quadro verde para copiar à mão
      setLink(resolved.url);
      setShareOverride(resolved.message || null);
      setRowFeedback({ id: item.id, text: 'Copie o link no quadro verde acima' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => setRowFeedback(null), 2500);
  }

  async function rowWhatsapp(item: InviteListItem) {
    // A janela é aberta no clique (antes da consulta) para o navegador não bloqueá-la como pop-up.
    const popup = window.open('', '_blank');
    setBusyId(item.id);
    const resolved = await resolveLink(item);
    setBusyId(null);
    if (!resolved) {
      popup?.close();
      return;
    }
    const target = `https://wa.me/?text=${encodeURIComponent(resolved.message || resolved.url)}`;
    if (popup) popup.location.href = target;
    else window.open(target, '_blank');
  }

  // Convite expirado: gera um link novo e renova o prazo; o link vencido deixa de valer.
  async function rowRenew(id: string) {
    setBusyId(id);
    const result = await regenerateSignupInviteLinkAction(id);
    setBusyId(null);
    if (!result.success || !result.url) {
      setMessage({ type: 'error', text: result.error || 'Não foi possível gerar o novo link.' });
      return;
    }
    setSentTo({ name: '', days: 15 });
    setLink(result.url);
    setShareOverride(result.message ?? null);
    setEmailNote(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.refresh();
  }

  async function remove(item: InviteListItem) {
    const who = item.invited_name || item.invited_email || 'este convite';
    const warning =
      item.status === 'submitted'
        ? `O cliente já enviou os dados em "${who}" e o cadastro ainda não foi criado. Excluir apaga também esses dados. Excluir mesmo assim?`
        : item.status === 'converted'
          ? `Excluir o registro do convite "${who}"? A empresa já criada continua cadastrada; só o convite some da lista.`
          : `Excluir o convite "${who}"? O link deixará de funcionar e o convite sairá da lista.`;
    if (!(await systemConfirm({ message: warning, danger: false }))) return;
    setBusyId(item.id);
    const result = await deleteSignupInviteAction(item.id);
    setBusyId(null);
    if (!result.success) setMessage({ type: 'error', text: result.error || 'Não foi possível excluir.' });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 shadow-xs">
        <h2 className="font-serif text-lg font-bold text-stone-900">Gerar novo convite</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-bold text-stone-700">Nome do convidado (opcional)
            <input className={inputClass} value={form.invitedName} onChange={(e) => setForm({ ...form, invitedName: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs font-bold text-stone-700">E-mail do convidado (opcional)
            <input type="email" className={inputClass} value={form.invitedEmail} onChange={(e) => setForm({ ...form, invitedEmail: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs font-bold text-stone-700">Validade (dias)
            <input type="number" min={1} max={60} className={inputClass} value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) || 15 })} />
          </label>
          <label className="space-y-1 text-xs font-bold text-stone-700 sm:col-span-3">Observação interna (opcional)
            <input className={inputClass} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs text-stone-700">
          <input
            type="checkbox"
            checked={sendByEmail}
            onChange={(e) => setSendByEmail(e.target.checked)}
            disabled={!form.invitedEmail.trim()}
            className="mt-0.5 h-4 w-4 rounded border-stone-300"
          />
          <span>
            Enviar o link por e-mail ao convidado (informe o e-mail acima).
            {!emailConfigured && <span className="block font-semibold text-amber-800">Envio de e-mail ainda não configurado no servidor: o link será só exibido para você copiar.</span>}
          </span>
        </label>
        <button type="submit" disabled={creating} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#3B0B14] px-4 text-sm font-bold text-[#C9A227] disabled:opacity-60">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gerar link
        </button>
        {message && <p role="alert" className={`text-sm font-semibold ${message.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{message.text}</p>}

        {emailNote && <p role="status" className={`text-sm font-semibold ${emailNote.type === 'error' ? 'text-amber-800' : 'text-emerald-700'}`}>{emailNote.text}</p>}

        {link && (
          <div className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-900">Link gerado. Copie e envie ao cliente agora: por segurança ele não fica salvo e não poderá ser exibido de novo.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={`${inputClass} font-mono text-xs`} />
              <button type="button" onClick={() => copy('link')} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-700 bg-white px-4 text-sm font-bold text-emerald-800">
                {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === 'link' ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
            <div className="space-y-2 border-t border-emerald-200 pt-3">
              <p className="text-xs font-bold text-emerald-900">Enviar pelo WhatsApp</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  inputMode="tel"
                  placeholder="WhatsApp do cliente com DDD (opcional)"
                  className={inputClass}
                />
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white"
                >
                  <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
                </a>
                <button type="button" onClick={() => copy('message')} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-700 bg-white px-4 text-sm font-bold text-emerald-800">
                  {copied === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === 'message' ? 'Copiada' : 'Copiar mensagem'}
                </button>
              </div>
              <p className="text-[11px] text-emerald-900">Sem número, o WhatsApp abre para você escolher o contato. O número digitado aqui não é salvo.</p>
            </div>
          </div>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-3">Convidado</th>
              <th className="px-4 py-3">Situação</th>
              <th className="hidden px-4 py-3 sm:table-cell">Criado em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {initialItems.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-stone-500">Nenhum convite ainda.</td></tr>
            )}
            {initialItems.map((item) => {
              const status = item.expired ? { text: 'Expirado', cls: 'bg-stone-200 text-stone-700' } : STATUS_LABEL[item.status];
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-stone-900">{item.invited_name || 'Sem nome'}</span>
                    <span className="block text-xs text-stone-500">{item.invited_email || '—'}</span>
                    {item.note && <span className="block text-xs italic text-stone-500">{item.note}</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status?.cls}`}>{status?.text}</span>{item.email_sent_at && <span className="mt-1 block text-[11px] text-stone-500">E-mail enviado em {formatDateBR(item.email_sent_at)}</span>}</td>
                  <td className="hidden px-4 py-3 text-xs text-stone-600 sm:table-cell">{formatDateBR(item.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {item.status === 'submitted' && (
                        <Link href={`/admin/empresas/convites/${item.id}`} className="rounded-lg bg-[#3B0B14] px-3 py-1.5 text-xs font-bold text-[#C9A227]">Conferir</Link>
                      )}
                      {item.status === 'converted' && item.business_id && (
                        <Link href={`/admin/empresas/${item.business_id}`} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700">Abrir empresa</Link>
                      )}
                      {item.status === 'sent' && !item.expired && (
                        <>
                          <button type="button" onClick={() => rowCopy(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 disabled:opacity-60">
                            <Copy className="h-3.5 w-3.5" aria-hidden /> Copiar link
                          </button>
                          <button type="button" onClick={() => rowWhatsapp(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
                          </button>
                        </>
                      )}
                      {item.status === 'sent' && item.expired && (
                        <button type="button" onClick={() => rowRenew(item.id)} disabled={busyId === item.id} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 disabled:opacity-60">
                          {busyId === item.id ? '…' : 'Gerar novo link'}
                        </button>
                      )}
                      <button type="button" onClick={() => remove(item)} disabled={busyId === item.id} title="Excluir convite" className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-60">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> {busyId === item.id ? '…' : 'Excluir'}
                      </button>
                      {rowFeedback?.id === item.id && <span className="self-center text-[11px] font-semibold text-emerald-700">{rowFeedback.text}</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
