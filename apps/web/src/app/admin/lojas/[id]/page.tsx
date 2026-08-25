import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Globe,
  Phone,
  MessageCircle,
  Calendar,
  History,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { getAdminLodge360DetailsAction } from '@/lib/admin/admin-lodges-service';
import LodgeGovernanceControls from './lodge-governance-client';

type AdminLodge360PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: AdminLodge360PageProps) {
  const { id } = await params;
  const dto = await getAdminLodge360DetailsAction(id);

  if (!dto) return { title: 'Loja Maçônica não encontrada · Admin CM' };
  return { title: `Prontuário 360º: ${dto.lodge.name} · Admin CM` };
}

export default async function AdminLodge360Page({ params }: AdminLodge360PageProps) {
  const { id } = await params;
  const dto = await getAdminLodge360DetailsAction(id);

  if (!dto) {
    notFound();
  }

  const { lodge, completeness, meetings, possible_duplicates, audit_timeline } = dto;

  return (
    <div className="space-y-6">
      {/* NAVEGAÇÃO DE VOLTA & STATUS SUPERIOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A227]/30 pb-4">
        <div>
          <Link
            href="/admin/lojas"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#4B161B] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Diretório de Lojas</span>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-serif font-bold text-[#1f1914]">{lodge.name}</h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                lodge.is_active
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-stone-100 text-stone-600 border border-stone-300'
              }`}
            >
              {lodge.is_active ? 'Publicada no Guia' : 'Inativa'}
            </span>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40">
              {lodge.potency} • Nº {lodge.code_number || 'S/N'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1 font-mono">
            {lodge.city} - {lodge.state} • ID: {lodge.id}
          </p>
        </div>

        {/* PRÉ-VISUALIZAÇÃO DA PÁGINA PÚBLICA */}
        <Link
          href={`/guia/lojas/${lodge.slug}`}
          target="_blank"
          className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Pré-visualizar Página Pública</span>
        </Link>
      </div>

      {/* REVISÃO DE POSSÍVEIS DUPLICIDADES (SE HOUVER) */}
      {possible_duplicates.length > 0 && (
        <div className="p-4 bg-amber-950/20 border border-amber-500/50 rounded-2xl text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-serif font-bold text-sm text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Alerta de Possível Duplicidade Detectada
          </div>
          <p>
            O sistema identificou {possible_duplicates.length} outra(s) Loja(s) cadastrada(s) com a mesma Potência e Número/Oriente:
          </p>
          <div className="space-y-1 pt-1">
            {possible_duplicates.map((dup) => (
              <div key={dup.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-300">
                <span className="font-bold text-stone-900">
                  {dup.name} (Nº {dup.code_number}) — {dup.city} ({dup.potency})
                </span>
                <span className="text-[11px] text-amber-800 font-medium">{dup.reason}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-amber-800 italic">
            Não é efetuado merge automático. Faça a revisão manual se necessário.
          </p>
        </div>
      )}

      {/* SEÇÃO 1: INDICADOR DE COMPLETUDE DA BASE (%) */}
      <section className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h2 className="font-serif font-bold text-base text-[#1f1914] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4B161B]" /> Auditoria de Completude dos Dados (Qualidade da Base)
          </h2>
          <span
            className={`font-mono font-serif font-bold text-lg ${
              completeness.percent >= 80 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {completeness.percent}% Completa
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${completeness.institutional ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-300 text-stone-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Institucional
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${completeness.potency_rite ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-300 text-stone-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Potência/Rito
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${completeness.meeting ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-300 text-stone-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Reunião
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${completeness.address ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-300 text-stone-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Endereço
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${completeness.coords ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
            {completeness.coords ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />} Coordenadas
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${completeness.emblem ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-300 text-stone-400'}`}>
            {completeness.emblem ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 text-center">○</span>} Brasão
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${completeness.contact ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-300 text-stone-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Contato
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 & 3: INSTITUCIONAL & REUNIÕES / CONTATOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Institucionais */}
        <section className="bg-white border border-stone-300 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="font-serif font-bold text-base text-[#1f1914] flex items-center gap-2 border-b border-stone-200 pb-2">
            <Compass className="w-4 h-4 text-[#4B161B]" /> Dados Institucionais da Loja
          </h3>

          <div className="space-y-2.5 text-xs text-stone-700">
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Nome Oficial:</span>
              <span className="font-serif font-bold text-stone-900">{lodge.name}</span>
            </div>

            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Número da Loja:</span>
              <span className="font-mono text-stone-900">{lodge.code_number || 'S/N'}</span>
            </div>

            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Potência Maçônica:</span>
              <span className="font-bold text-[#4B161B]">{lodge.potency}</span>
            </div>

            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Rito Adotado:</span>
              <span>{lodge.rite || 'R.E.A.A.'}</span>
            </div>

            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Data de Fundação:</span>
              <span>{lodge.foundation_date || 'Não informada'}</span>
            </div>

            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Venerável Mestre:</span>
              <span className="font-semibold text-stone-900">
                {lodge.venerable_name} {lodge.is_venerable_public ? '(Público)' : '(Reservado)'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-bold text-stone-500">Origem dos Dados:</span>
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> {lodge.provenance}
              </span>
            </div>
          </div>
        </section>

        {/* Reuniões e Contatos */}
        <section className="bg-white border border-stone-300 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="font-serif font-bold text-base text-[#1f1914] flex items-center gap-2 border-b border-stone-200 pb-2">
            <Calendar className="w-4 h-4 text-[#4B161B]" /> Reuniões & Canais de Contato
          </h3>

          {/* Reuniões */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-500 uppercase block">Horários de Sessões:</span>
            {meetings.map((m) => (
              <div key={m.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-stone-900">
                    {m.day_of_week} às {m.time}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full">
                    {m.frequency}
                  </span>
                </div>
                {m.notes && <p className="text-[11px] text-stone-500">{m.notes}</p>}
              </div>
            ))}
          </div>

          {/* Contatos */}
          <div className="space-y-2 pt-2 border-t border-stone-200 text-xs">
            <span className="text-xs font-bold text-stone-500 uppercase block">Canais de Atendimento:</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                <Phone className="w-4 h-4 text-stone-600 shrink-0" />
                <span>{lodge.phone || 'Sem telefone'}</span>
              </div>

              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lodge.whatsapp || 'Sem WhatsApp'}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* SEÇÃO 4 & 5: LOCALIZAÇÃO GPS & AUDITORIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Localização GPS e Endereço */}
        <section className="bg-white border border-stone-300 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="font-serif font-bold text-base text-[#1f1914] flex items-center gap-2 border-b border-stone-200 pb-2">
            <MapPin className="w-4 h-4 text-[#4B161B]" /> Endereço & Geocodificação GPS
          </h3>

          <div className="space-y-2 text-xs text-stone-700">
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Endereço Completo:</span>
              <span className="font-semibold text-stone-900">{lodge.address || 'Não cadastrado'}</span>
            </div>

            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Oriente / UF:</span>
              <span>
                {lodge.city} - {lodge.state}
              </span>
            </div>

            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="font-bold text-stone-500">Coordenadas GPS:</span>
              <span className="font-mono text-stone-900">
                {lodge.latitude && lodge.longitude ? `${lodge.latitude}, ${lodge.longitude}` : 'Sem coordenadas'}
              </span>
            </div>

            {lodge.latitude && lodge.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lodge.latitude},${lodge.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors mt-2"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Testar "Como Chegar" no Google Maps</span>
              </a>
            )}
          </div>
        </section>

        {/* Governança & Auditoria */}
        <section className="bg-white border border-stone-300 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="font-serif font-bold text-base text-[#1f1914] flex items-center gap-2 border-b border-stone-200 pb-2">
            <History className="w-4 h-4 text-[#4B161B]" /> Governança & Timeline de Auditoria
          </h3>

          <LodgeGovernanceControls lodgeId={lodge.id} initialStatus={lodge.is_active} />

          <div className="space-y-2.5 relative pl-4 border-l-2 border-[#C9A227]/40 pt-2">
            {audit_timeline.map((item) => (
              <div key={item.id} className="space-y-0.5 relative text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4B161B] border border-[#C9A227] absolute -left-[21px] top-1" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-stone-900">{item.action}</span>
                  <span className="font-mono text-[10px] text-stone-400">
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-[#1f1914] text-[11px]">{item.description}</p>
                <p className="text-[10px] text-stone-400 italic">Por: {item.performed_by}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
