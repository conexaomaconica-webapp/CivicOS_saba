'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Plus,
  Edit,
  Eye,
  Loader2,
  Gift,
  ShieldCheck,
  Tag,
  Calendar,
  X,
} from 'lucide-react';
import {
  AdvertiserContentDTO,
  AdvertiserBenefitItem,
  saveAdvertiserBenefitAction,
} from '@/lib/advertiser/advertiser-content-service';

export default function AdvertiserBenefitsClient({ data }: { data: AdvertiserContentDTO }) {
  const { business, quotas, benefits: initialBenefits } = data;
  const [benefits, setBenefits] = useState<AdvertiserBenefitItem[]>(initialBenefits);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Partial<AdvertiserBenefitItem>>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountCondition, setDiscountCondition] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [expirationDate, setExpirationDate] = useState('31/12/2026');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const isQuotaFull = benefits.length >= quotas.benefits_limit;

  const handleOpenCreateModal = () => {
    setEditingBenefit({});
    setTitle('');
    setDescription('');
    setDiscountCondition('15% de Desconto Fraterno');
    setPromoCode('FRATERNO15');
    setExpirationDate('31/12/2026');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ben: AdvertiserBenefitItem) => {
    setEditingBenefit(ben);
    setTitle(ben.title);
    setDescription(ben.description);
    setDiscountCondition(ben.discount_condition || '');
    setPromoCode(ben.promo_code || '');
    setExpirationDate(ben.expiration_date || '31/12/2026');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const res = await saveAdvertiserBenefitAction({
      id: editingBenefit.id,
      business_id: business.id,
      title,
      description,
      discount_condition: discountCondition,
      promo_code: promoCode,
      expiration_date: expirationDate,
    });

    setSaving(false);

    if (res.success) {
      if (editingBenefit.id) {
        setBenefits(
          benefits.map((b) =>
            b.id === editingBenefit.id
              ? {
                  ...b,
                  title,
                  description,
                  discount_condition: discountCondition,
                  promo_code: promoCode,
                  status: 'published',
                  status_label: 'Publicado',
                }
              : b
          )
        );
      } else {
        const newBen: AdvertiserBenefitItem = {
          id: `ben-${Date.now()}`,
          title,
          description,
          discount_condition: discountCondition,
          promo_code: promoCode,
          expiration_date: expirationDate,
          is_active: true,
          status: 'published',
          status_label: 'Publicado',
        };
        setBenefits([newBen, ...benefits]);
      }

      setFeedback({ type: 'success', message: res.message });
      setIsModalOpen(false);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA & BOTÃO ADICIONAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Conteúdo do Anúncio • Benefícios &amp; Ofertas Fraternas
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Benefícios e Descontos Fraternos
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Cadastre ofertas e condições fraternas exclusivas para membros da rede Conexão Maçônica.
          </p>
        </div>

        {!isQuotaFull ? (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 self-start sm:self-auto shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>Criar Novo Benefício</span>
          </button>
        ) : (
          <Link
            href="/anunciante/plano"
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-2xl flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <Award className="w-4 h-4 text-amber-700" />
            <span>Limite Atingido ({quotas.benefits_limit}/{quotas.benefits_limit})</span>
          </Link>
        )}
      </div>

      {/* COTA NUMÉRICA DO PLANO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-600" /> Cotas do {business.plan_name}: {benefits.length} de {quotas.benefits_limit} benefícios utilizados
          </span>
          <span className="text-xs font-mono font-bold text-stone-600">
            {benefits.length} / {quotas.benefits_limit}
          </span>
        </div>

        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full"
            style={{ width: `${(benefits.length / quotas.benefits_limit) * 100}%` }}
          />
        </div>
      </div>

      {/* FEEDBACK DE AÇÃO */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* LISTA DE BENEFÍCIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benefits.map((ben) => (
          <div
            key={ben.id}
            className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-600" /> {ben.discount_condition}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    ben.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {ben.status_label}
                </span>
              </div>

              <h3 className="font-serif font-bold text-base text-stone-900 leading-snug">
                {ben.title}
              </h3>

              <p className="text-xs text-stone-600 leading-relaxed">
                {ben.description}
              </p>

              {ben.promo_code && (
                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono flex items-center justify-between">
                  <span className="text-stone-500">Cupom de Desconto:</span>
                  <strong className="text-[#3B0B14] font-bold">{ben.promo_code}</strong>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span className="text-[11px] font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" /> Validade: {ben.expiration_date}
              </span>

              <div className="flex items-center gap-2">
                <Link
                  href={`/guia/${business.slug}`}
                  target="_blank"
                  className="p-1.5 text-stone-500 hover:text-stone-900 rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Ver no anúncio</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(ben)}
                  className="p-1.5 text-[#3B0B14] hover:bg-stone-100 rounded font-bold text-xs flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE BENEFÍCIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingBenefit.id ? 'Editar Benefício' : 'Criar Novo Benefício Fraterno'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-800">Título da Oferta</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  placeholder="Ex: 15% de Desconto em Projetos de Segurança"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800">Condição / Desconto</label>
                  <input
                    type="text"
                    value={discountCondition}
                    onChange={(e) => setDiscountCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                    placeholder="Ex: 15% OFF ou 1ª Mensalidade Grátis"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-800">Código Promocional</label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium uppercase font-mono"
                    placeholder="FRATERNO15"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Descrição &amp; Regras da Oferta</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  placeholder="Descreva a oferta e quem tem direito a utilizá-la..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#3B0B14] text-[#C9A227] font-bold rounded-xl border border-[#C9A227]/40 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />}
                  <span>Salvar Oferta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
