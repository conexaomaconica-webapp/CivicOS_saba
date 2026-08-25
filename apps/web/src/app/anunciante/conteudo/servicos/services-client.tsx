'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Edit,
  Eye,
  CheckCircle2,
  Loader2,
  Award,
  ToggleLeft,
  ToggleRight,
  Clock,
  X,
} from 'lucide-react';
import {
  AdvertiserContentDTO,
  AdvertiserServiceItem,
  saveAdvertiserServiceAction,
  toggleServiceActiveAction,
} from '@/lib/advertiser/advertiser-content-service';

export default function AdvertiserServicesClient({ data }: { data: AdvertiserContentDTO }) {
  const { business, quotas, services: initialServices } = data;
  const [services, setServices] = useState<AdvertiserServiceItem[]>(initialServices);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<AdvertiserServiceItem> | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Segurança');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const isQuotaFull = services.length >= quotas.services_limit;

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setTitle('');
    setDescription('');
    setCategory('Segurança');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (srv: AdvertiserServiceItem) => {
    setEditingService(srv);
    setTitle(srv.title);
    setDescription(srv.description);
    setCategory(srv.category || 'Segurança');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const res = await saveAdvertiserServiceAction({
      id: editingService?.id,
      business_id: business.id,
      title,
      description,
      category,
    });

    setSaving(false);

    if (res.success) {
      if (editingService?.id) {
        setServices(
          services.map((s) =>
            s.id === editingService.id
              ? {
                  ...s,
                  title,
                  description,
                  category,
                  status: 'under_review',
                  status_label: 'Aguardando análise',
                  current_public_version: s.current_public_version || { title: s.title, description: s.description },
                }
              : s
          )
        );
      } else {
        const newSrv: AdvertiserServiceItem = {
          id: `srv-${Date.now()}`,
          title,
          description,
          category,
          is_active: true,
          status: 'under_review',
          status_label: 'Aguardando análise',
          views_count: 0,
        };
        setServices([newSrv, ...services]);
      }

      setFeedback({
        type: res.isUnderReview ? 'info' : 'success',
        message: res.message,
      });
      setIsModalOpen(false);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleToggleActive = async (srv: AdvertiserServiceItem) => {
    const updatedStatus = !srv.is_active;
    setServices(
      services.map((s) =>
        s.id === srv.id
          ? {
              ...s,
              is_active: updatedStatus,
              status: updatedStatus ? 'published' : 'inactive',
              status_label: updatedStatus ? 'Publicado' : 'Inativo',
            }
          : s
      )
    );

    const res = await toggleServiceActiveAction(srv.id, updatedStatus);
    setFeedback({ type: 'success', message: res.message });
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA & BOTÃO ADICIONAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Conteúdo do Anúncio • Catálogo Comercial
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Serviços da Empresa
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Cadastre os serviços oferecidos pela sua empresa. Alterações de conteúdo mantêm a versão atual pública enquanto a proposta é analisada.
          </p>
        </div>

        {!isQuotaFull ? (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 self-start sm:self-auto shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>Cadastrar Novo Serviço</span>
          </button>
        ) : (
          <Link
            href="/anunciante/plano"
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-2xl flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <Award className="w-4 h-4 text-amber-700" />
            <span>Limite Atingido • Ver Planos</span>
          </Link>
        )}
      </div>

      {/* COTA NUMÉRICA & ATENÇÃO DE PLANO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-600" /> Cotas do {business.plan_name}: {services.length} de {quotas.services_limit} serviços utilizados
          </span>
          <span className="text-xs font-mono font-bold text-stone-600">
            {services.length} / {quotas.services_limit}
          </span>
        </div>

        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C9A227] rounded-full"
            style={{ width: `${(services.length / quotas.services_limit) * 100}%` }}
          />
        </div>
      </div>

      {/* FEEDBACK DE AÇÃO */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'info'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* ESTADO VAZIO */}
      {services.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-stone-900">
            Você ainda não cadastrou nenhum serviço.
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Cadastre os serviços oferecidos para atrair mais clientes no Guia Comercial Conexão Maçônica.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#3B0B14] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar primeiro serviço</span>
          </button>
        </div>
      ) : (
        /* LISTA DE SERVIÇOS EM CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((srv) => (
            <div
              key={srv.id}
              className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-3 relative flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 bg-stone-100 text-stone-700 rounded-lg text-[10px] font-mono font-bold uppercase">
                    {srv.category}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      srv.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : srv.status === 'under_review'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {srv.status_label}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-base text-stone-900 leading-snug">
                  {srv.title}
                </h3>

                <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                  {srv.description}
                </p>

                {/* ALERTA DE VERSÃO ANTERIOR PÚBLICA */}
                {srv.current_public_version && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-0.5">
                    <span className="font-bold block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700" /> Versão atual em exibição pública no Guia:
                    </span>
                    <p className="font-medium text-amber-800">&quot;{srv.current_public_version.title}&quot;</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(srv)}
                    className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium"
                    title={srv.is_active ? 'Inativar serviço' : 'Reativar serviço'}
                  >
                    {srv.is_active ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-stone-400" />
                    )}
                    <span>{srv.is_active ? 'Ativo' : 'Inativo'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/guia/${business.slug}`}
                    target="_blank"
                    className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors text-[11px] font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>Ver no meu anúncio</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(srv)}
                    className="p-2 text-[#3B0B14] hover:bg-stone-100 rounded-lg font-bold text-xs flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE SERVIÇO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingService ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
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
                <label className="font-bold text-stone-800">Título do Serviço</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium text-xs"
                  placeholder="Ex: Terceirização de Portaria Virtual 24h"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Categoria</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium text-xs"
                  placeholder="Ex: Segurança, Terceirização, TI"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Descrição Detalhada</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium text-xs"
                  placeholder="Descreva o serviço, diferenciais e público-alvo..."
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" /> Política de Transparência &amp; Moderação:
                </span>
                <p>
                  A versão aprovada atual continuará pública no Guia Comercial enquanto a nova proposta é analisada pelo Admin.
                </p>
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
                  <span>Salvar Serviço</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
