'use client';

import { systemConfirm } from '@/components/system/SystemFeedback';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateBR } from '@/lib/format/datetime-br';
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  Search,
  Calendar,
  ArrowUpDown,
  X,
  Building2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  createSignupInviteAction,
  getSignupInviteLinkAction,
  regenerateSignupInviteLinkAction,
  deleteSignupInviteAction,
  type InviteListItem,
} from '@/lib/onboarding/signup-invite-service';
import { buildInviteShareMessage } from '@/lib/onboarding/signup-invite-shared';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  sent: { text: 'Aguardando o cliente', cls: 'bg-amber-100 text-amber-900 border border-amber-300' },
  submitted: { text: 'Preenchido — conferir', cls: 'bg-blue-100 text-blue-900 border border-blue-300 font-bold' },
  converted: { text: 'Cadastro criado', cls: 'bg-emerald-100 text-emerald-900 border border-emerald-300' },
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

  // Estados para busca, filtros e ordenação
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'sent' | 'converted' | 'expired' | 'revoked'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '15d' | '30d' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'submitted_desc' | 'name_asc' | 'name_desc'>('created_desc');

  const isFiltered = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'all' ||
    dateFilter !== 'all' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('created_desc');
  };

  const statusCounts = useMemo(() => {
    const counts = {
      all: initialItems.length,
      submitted: 0,
      sent: 0,
      converted: 0,
      expired: 0,
      revoked: 0,
    };
    for (const item of initialItems) {
      if (item.status === 'submitted') counts.submitted++;
      else if (item.status === 'converted') counts.converted++;
      else if (item.status === 'revoked') counts.revoked++;
      else if (item.expired) counts.expired++;
      else if (item.status === 'sent') counts.sent++;
    }
    return counts;
  }, [initialItems]);

  const filteredItems = useMemo(() => {
    let result = [...initialItems];

    // 1. Filtro por status
    if (statusFilter !== 'all') {
      if (statusFilter === 'submitted') {
        result = result.filter((i) => i.status === 'submitted');
      } else if (statusFilter === 'sent') {
        result = result.filter((i) => i.status === 'sent' && !i.expired);
      } else if (statusFilter === 'converted') {
        result = result.filter((i) => i.status === 'converted');
      } else if (statusFilter === 'expired') {
        result = result.filter((i) => i.expired || (i.status === 'sent' && new Date(i.expires_at).getTime() <= Date.now()));
      } else if (statusFilter === 'revoked') {
        result = result.filter((i) => i.status === 'revoked');
      }
    }

    // 2. Filtro por busca textual (empresa, convidado, e-mail, observação)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((i) => {
        const company = (i.company_name || '').toLowerCase();
        const invitedName = (i.invited_name || '').toLowerCase();
        const responsible = (i.responsible_name || '').toLowerCase();
        const email = (i.invited_email || '').toLowerCase();
        const note = (i.note || '').toLowerCase();
        return (
          company.includes(q) ||
          invitedName.includes(q) ||
          responsible.includes(q) ||
          email.includes(q) ||
          note.includes(q)
        );
      });
    }

    // 3. Filtro por data
    if (dateFilter !== 'all') {
      const now = Date.now();
      result = result.filter((i) => {
        const itemDate = new Date(i.created_at).getTime();
        if (dateFilter === '7d') return itemDate >= now - 7 * 86_400_000;
        if (dateFilter === '15d') return itemDate >= now - 15 * 86_400_000;
        if (dateFilter === '30d') return itemDate >= now - 30 * 86_400_000;
        if (dateFilter === 'this_month') {
          const d = new Date(i.created_at);
          const n = new Date();
          return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
        }
        if (dateFilter === 'custom') {
          if (customStartDate) {
            const startMs = new Date(`${customStartDate}T00:00:00`).getTime();
            if (itemDate < startMs) return false;
          }
          if (customEndDate) {
            const endMs = new Date(`${customEndDate}T23:59:59`).getTime();
            if (itemDate > endMs) return false;
          }
          return true;
        }
        return true;
      });
    }

    // 4. Ordenação
    result.sort((a, b) => {
      if (sortBy === 'created_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'created_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'submitted_desc') {
        const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'name_asc') {
        const nameA = (a.company_name || a.invited_name || a.invited_email || '').toLowerCase();
        const nameB = (b.company_name || b.invited_name || b.invited_email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name_desc') {
        const nameA = (a.company_name || a.invited_name || a.invited_email || '').toLowerCase();
        const nameB = (b.company_name || b.invited_name || b.invited_email || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return result;
  }, [initialItems, statusFilter, searchQuery, dateFilter, customStartDate, customEndDate, sortBy]);

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

      {/* Barra de Filtros, Busca e Ordenação */}
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        {/* Linha 1: Campo de Busca & Contador */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por empresa, convidado, e-mail ou observação..."
              className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-9 py-2 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-[#3B0B14] focus:ring-2 focus:ring-[#3B0B14]/10 outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 shrink-0 font-medium self-end sm:self-center">
            <span>Exibindo <strong>{filteredItems.length}</strong> de {initialItems.length} convites</span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Linha 2: Tabs de Filtro por Situação */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todos
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
              {statusCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('submitted')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'submitted'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
            Preenchidos — Conferir
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'submitted' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-900'}`}>
              {statusCounts.submitted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('sent')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'sent'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            Aguardando cliente
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'sent' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>
              {statusCounts.sent}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('converted')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'converted'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
            Cadastro criado
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'converted' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
              {statusCounts.converted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('expired')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'expired'
                ? 'bg-stone-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Expirados
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'expired' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
              {statusCounts.expired}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('revoked')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'revoked'
                ? 'bg-stone-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Cancelados
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'revoked' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
              {statusCounts.revoked}
            </span>
          </button>
        </div>

        {/* Linha 3: Filtro por Data e Ordenação */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-xs">
          {/* Dropdown de Data */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-stone-500" />
            <span className="font-semibold text-stone-600">Data:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 outline-none focus:border-[#3B0B14]"
            >
              <option value="all">Qualquer período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="15d">Últimos 15 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="this_month">Este mês</option>
              <option value="custom">Período personalizado...</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800"
              />
              <span className="text-stone-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800"
              />
            </div>
          )}

          {/* Dropdown de Ordenação */}
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <ArrowUpDown className="h-3.5 w-3.5 text-stone-500" />
            <span className="font-semibold text-stone-600">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 outline-none focus:border-[#3B0B14]"
            >
              <option value="created_desc">Data (Mais recentes)</option>
              <option value="created_asc">Data (Mais antigos)</option>
              <option value="submitted_desc">Preenchimento mais recente</option>
              <option value="name_asc">Nome / Empresa (A → Z)</option>
              <option value="name_desc">Nome / Empresa (Z → A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Convites */}
      <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-3">Empresa / Convidado</th>
              <th className="px-4 py-3">Situação</th>
              <th className="hidden px-4 py-3 sm:table-cell">Criado em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500 space-y-2">
                  <p className="font-medium text-stone-600">
                    {initialItems.length === 0
                      ? 'Nenhum convite criado ainda.'
                      : 'Nenhum convite encontrado com os filtros selecionados.'}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#3B0B14] hover:underline cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" /> Limpar filtros e exibir todos
                    </button>
                  )}
                </td>
              </tr>
            )}
            {filteredItems.map((item) => {
              const status = item.expired ? { text: 'Expirado', cls: 'bg-stone-200 text-stone-700' } : STATUS_LABEL[item.status];
              return (
                <tr key={item.id} className="hover:bg-stone-50/70 transition">
                  <td className="px-4 py-3">
                    {item.company_name ? (
                      <div>
                        <span className="inline-flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                          <Building2 className="h-4 w-4 text-[#3B0B14] shrink-0" />
                          {item.company_name}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                          <span>{item.invited_name || item.responsible_name || 'Convidado'}</span>
                          {item.invited_email && <span>· {item.invited_email}</span>}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="block font-semibold text-stone-900">{item.invited_name || 'Sem nome'}</span>
                        <span className="block text-xs text-stone-500">{item.invited_email || '—'}</span>
                      </div>
                    )}
                    {item.note && <span className="block text-xs italic text-stone-500 mt-0.5">Obs: {item.note}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${status?.cls}`}>
                        {item.status === 'submitted' && <CheckCircle2 className="h-3 w-3 text-blue-600" />}
                        {status?.text}
                      </span>
                      {item.submitted_at && item.status === 'submitted' && (
                        <span className="block text-[11px] font-semibold text-blue-800">
                          Preenchido em {formatDateBR(item.submitted_at)}
                        </span>
                      )}
                      {item.email_sent_at && (
                        <span className="block text-[11px] text-stone-500">
                          E-mail enviado em {formatDateBR(item.email_sent_at)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-stone-600 sm:table-cell">
                    <span className="font-medium text-stone-800">{formatDateBR(item.created_at)}</span>
                    <span className="block text-[11px] text-stone-400">
                      {item.expired ? 'Expirou em ' : 'Expira em '}
                      {formatDateBR(item.expires_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-2">
                      {item.status === 'submitted' && (
                        <Link
                          href={`/admin/empresas/convites/${item.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#3B0B14] hover:bg-[#2b080f] px-3.5 py-1.5 text-xs font-bold text-[#C9A227] shadow-2xs transition"
                        >
                          Conferir dados →
                        </Link>
                      )}
                      {item.status === 'converted' && item.business_id && (
                        <Link
                          href={`/admin/empresas/${item.business_id}`}
                          className="rounded-xl border border-stone-300 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 shadow-2xs transition"
                        >
                          Abrir empresa
                        </Link>
                      )}
                      {item.status === 'sent' && !item.expired && (
                        <>
                          <button
                            type="button"
                            onClick={() => rowCopy(item)}
                            disabled={busyId === item.id}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer ${
                              rowFeedback?.id === item.id
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {rowFeedback?.id === item.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                                <span>Copiado ✓</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-stone-500" />
                                <span>Copiar link</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => rowWhatsapp(item)}
                            disabled={busyId === item.id}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </button>
                        </>
                      )}
                      {item.status === 'sent' && item.expired && (
                        <button
                          type="button"
                          onClick={() => rowRenew(item.id)}
                          disabled={busyId === item.id}
                          className="rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs transition cursor-pointer"
                        >
                          {busyId === item.id ? 'Gerando…' : 'Gerar novo link'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={busyId === item.id}
                        title="Excluir convite"
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 shadow-2xs transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {busyId === item.id ? '…' : 'Excluir'}
                      </button>
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
