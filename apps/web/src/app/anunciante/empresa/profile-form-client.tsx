'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrazilianLocationFields } from '@/components/admin/BrazilianLocationFields';
import Link from 'next/link';
import {
  Building2,
  Phone,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  Eye,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  AdvertiserProfileDTO,
  type AdvertiserHourRow,
  updateAdvertiserProfileFieldsAction,
} from '@/lib/advertiser/advertiser-profile-service';
import type { ChangeRequestItem } from '@/lib/advertiser/change-requests-service';
import { PendingChangesNotice } from '@/components/advertiser/PendingChangesNotice';

const WEEK_DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
// Segunda a domingo (a semana comercial começa na segunda).
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const NEW_CATEGORY = '__new__';

/** Aviso nos campos que passam por validação da plataforma antes de publicar. */
function ReviewTag() {
  return <span className="font-mono text-[10px] font-bold text-amber-800">Passa por validação</span>;
}

export default function AdvertiserProfileFormClient({
  data,
  requests,
  categories = [],
}: {
  data: AdvertiserProfileDTO;
  requests: { pending: ChangeRequestItem[]; recent: ChangeRequestItem[] };
  categories?: string[];
}) {
  const { business } = data;
  const router = useRouter();
  const [hours, setHours] = useState<AdvertiserHourRow[]>(business.hours);
  const setHour = (day: number, patch: Partial<AdvertiserHourRow>) =>
    setHours((current) => current.map((row) => (row.day_of_week === day ? { ...row, ...patch } : row)));

  // Categoria atual que ainda não está no catálogo aparece na lista para não ser perdida ao abrir o formulário.
  const currentCategory = (business.category || '').trim();
  const categoryOptions = currentCategory && !categories.some((c) => c.toLowerCase() === currentCategory.toLowerCase())
    ? [currentCategory, ...categories]
    : categories;
  const [categoryIsCustom, setCategoryIsCustom] = useState(false);

  const [formData, setFormData] = useState({
    name: business.name || '',
    legal_name: business.legal_name || '',
    document_number: business.document_number || '',
    category: business.category || '',
    description: business.description || '',
    phone: business.phone || '',
    whatsapp: business.whatsapp || '',
    public_email: business.public_email || '',
    website: business.website || '',
    street: business.street || '',
    number: business.number || '',
    neighborhood: business.neighborhood || '',
    city: business.city || '',
    state: business.state || '',
    zip_code: business.zip_code || '',
    instagram: business.instagram || '',
    facebook: business.facebook || '',
    linkedin: business.linkedin || '',
    youtube: business.youtube || '',
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const res = await updateAdvertiserProfileFieldsAction({
      business_id: business.id,
      ...formData,
      hours,
    });

    setSaving(false);
    setFeedback({ type: !res.success ? 'error' : res.requiresReview ? 'info' : 'success', message: res.message });
    if (res.success) router.refresh();
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA & BOTÃO PERMANENTE DE PRÉ-VISUALIZAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Minha Empresa • Apresentação Comercial
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Perfil da Empresa
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Mantenha os dados comerciais atualizados. Alterações simples entram no ar imediatamente.
          </p>
        </div>

        <Link
          href={`/guia/${business.slug}`}
          target="_blank"
          className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <Eye className="w-4 h-4 text-[#C9A227]" />
          <span>Ver como minha empresa aparece no Guia</span>
        </Link>
      </div>

      {/* FEEDBACK DE COMPLETUDE & LINKS DE PENDÊNCIAS */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-stone-900">
            Seu Perfil está {business.completeness_percent}% Completo
          </span>
          <span className="text-xs font-mono font-bold text-amber-800">
            {business.completeness_percent}%
          </span>
        </div>

        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-emerald-600 rounded-full"
            style={{ width: `${business.completeness_percent}%` }}
          />
        </div>

        {business.missing_fields.length > 0 && (
          <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 space-y-1">
            <span className="font-bold text-stone-800">Falta para 100%:</span>
            <div className="flex flex-wrap gap-2 pt-1">
              {business.missing_fields.map((mf, idx) => (
                <Link
                  key={idx}
                  href={mf.action_url}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>{mf.label}</span>
                  <ArrowRight className="w-3 h-3 text-amber-600" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <PendingChangesNotice pending={requests.pending.filter((r) => r.entityType === 'profile')} recent={requests.recent.filter((r) => r.entityType === 'profile')} />

      {/* FEEDBACK DE SALVAMENTO */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* FORMULÁRIO DIVIDIDO NOS 4 BLOCOS */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BLOCO 1: IDENTIDADE */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C9A227]" /> 1. Identidade Comercial
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-800 flex items-center justify-between">
                <span>Nome Fantasia (Público)</span>
                <ReviewTag />
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800 flex items-center justify-between">
                <span>Razão Social</span>
                <ReviewTag />
              </label>
              <input
                type="text"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800 flex items-center justify-between">
                <span>CNPJ / CPF</span>
                <ReviewTag />
              </label>
              <input
                type="text"
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800 flex items-center justify-between">
                <span>Categoria Principal</span>
                <ReviewTag />
              </label>
              <select
                value={categoryIsCustom ? NEW_CATEGORY : formData.category}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) {
                    setCategoryIsCustom(true);
                    setFormData({ ...formData, category: '' });
                  } else {
                    setCategoryIsCustom(false);
                    setFormData({ ...formData, category: e.target.value });
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              >
                <option value="">Selecione uma categoria</option>
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value={NEW_CATEGORY}>Não encontrei minha categoria…</option>
              </select>
              {categoryIsCustom && (
                <div className="space-y-1 pt-1">
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Nome da nova categoria"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  />
                  <p className="text-[11px] text-stone-500">Confira a lista antes: a nova categoria só é criada se ainda não existir e depois da aprovação da equipe.</p>
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-800 flex items-center justify-between">
                <span>Descrição Comercial (Sobre a Empresa)</span>
                <ReviewTag />
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="Descreva a empresa, diferenciais e serviços oferecidos..."
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: CONTATO */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" /> 2. Informações de Contato
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-800">WhatsApp (Direct Chat)</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="(11) 98765-4321"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Telefone Fixo / Comercial</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="(11) 3456-7890"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">E-mail Público</label>
              <input
                type="email"
                value={formData.public_email}
                onChange={(e) => setFormData({ ...formData, public_email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Website Oficial</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="suaempresa.com.br ou https://suaempresa.com.br"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="@suaempresa"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Facebook</label>
              <input
                type="text"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="facebook.com/suaempresa"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">LinkedIn</label>
              <input
                type="text"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="linkedin.com/company/suaempresa"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">YouTube</label>
              <input
                type="text"
                value={formData.youtube}
                onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                placeholder="youtube.com/@suaempresa"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 3: LOCALIZAÇÃO */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" /> 3. Localização &amp; Endereço
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-800">CEP</label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-stone-800">Logradouro / Endereço</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Número</label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Bairro</label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <BrazilianLocationFields
                variant="member"
                state={formData.state}
                city={formData.city}
                onStateChange={(value) => setFormData((current) => ({ ...current, state: value }))}
                onCityChange={(value) => setFormData((current) => ({ ...current, city: value }))}
              />
            </div>
          </div>
        </div>

        {/* BLOCO 4: FUNCIONAMENTO */}
        <div id="funcionamento" className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-700" /> 4. Horário de Funcionamento
          </h2>

          <p className="text-xs text-stone-500">Dia sem horário preenchido e não marcado como fechado fica sem informação no Guia.</p>
          <div className="space-y-2 text-xs">
            {WEEK_ORDER.map((day) => {
              const row = hours.find((h) => h.day_of_week === day)!;
              return (
                <div key={day} className="grid grid-cols-1 items-center gap-2 rounded-xl border border-stone-100 bg-stone-50/60 p-2.5 sm:grid-cols-[9rem_auto_1fr]">
                  <span className="font-bold text-stone-800">{WEEK_DAYS[day]}</span>
                  <label className="flex min-h-9 items-center gap-2 font-medium text-stone-700">
                    <input type="checkbox" checked={row.is_closed} onChange={(e) => setHour(day, { is_closed: e.target.checked })} className="h-4 w-4" />
                    Fechado
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`Abertura de ${WEEK_DAYS[day]}`}
                      value={row.open_time}
                      disabled={row.is_closed}
                      onChange={(e) => setHour(day, { open_time: e.target.value })}
                      className="min-h-9 rounded-lg border border-stone-200 bg-white px-2 disabled:opacity-40"
                    />
                    <span className="text-stone-500">às</span>
                    <input
                      type="time"
                      aria-label={`Fechamento de ${WEEK_DAYS[day]}`}
                      value={row.close_time}
                      disabled={row.is_closed}
                      onChange={(e) => setHour(day, { close_time: e.target.value })}
                      className="min-h-9 rounded-lg border border-stone-200 bg-white px-2 disabled:opacity-40"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTÃO SALVAR SALTO */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
            ) : (
              <Save className="w-4 h-4 text-[#C9A227]" />
            )}
            <span>Salvar Alterações do Perfil</span>
          </button>
        </div>
      </form>
    </div>
  );
}
