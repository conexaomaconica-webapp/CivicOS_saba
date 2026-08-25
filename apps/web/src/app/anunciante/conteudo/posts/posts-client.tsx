'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Eye,
  CheckCircle2,
  Loader2,
  Calendar,
  X,
} from 'lucide-react';
import {
  AdvertiserContentDTO,
  AdvertiserPostItem,
} from '@/lib/advertiser/advertiser-content-service';

export default function AdvertiserPostsClient({ data }: { data: AdvertiserContentDTO }) {
  const { business, quotas, posts: initialPosts } = data;
  const [posts, setPosts] = useState<AdvertiserPostItem[]>(initialPosts);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    setTimeout(() => {
      const newPost: AdvertiserPostItem = {
        id: `pst-${Date.now()}`,
        title,
        content,
        published_at: new Date().toLocaleDateString('pt-BR'),
        is_active: true,
        status: 'published',
        status_label: 'Publicado',
      };

      setPosts([newPost, ...posts]);
      setSaving(false);
      setFeedback({
        type: 'success',
        message: 'Publicação registrada com sucesso.',
      });
      setIsModalOpen(false);
    }, 800);
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA & BOTÃO ADICIONAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Conteúdo do Anúncio • Publicações &amp; Novidades
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Publicações da Empresa
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Publique novidades, lançamentos e comunicados da sua empresa no Guia Comercial.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 self-start sm:self-auto shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          <span>Nova Publicação</span>
        </button>
      </div>

      {/* COTA NUMÉRICA DO PLANO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C9A227]" /> Cotas do {business.plan_name}: {posts.length} de {quotas.posts_limit} publicações utilizadas
          </span>
          <span className="text-xs font-mono font-bold text-stone-600">
            {posts.length} / {quotas.posts_limit}
          </span>
        </div>

        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C9A227] rounded-full"
            style={{ width: `${(posts.length / quotas.posts_limit) * 100}%` }}
          />
        </div>
      </div>

      {/* FEEDBACK DE AÇÃO */}
      {feedback && (
        <div className="p-4 rounded-2xl border text-xs flex items-center gap-3 bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* LISTA DE POSTS */}
      <div className="space-y-4">
        {posts.map((pst) => (
          <div
            key={pst.id}
            className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 bg-stone-100 text-stone-700 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-500" /> {pst.published_at}
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {pst.status_label}
                </span>
              </div>

              <h3 className="font-serif font-bold text-base text-stone-900 leading-snug">
                {pst.title}
              </h3>

              <p className="text-xs text-stone-600 leading-relaxed">
                {pst.content}
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end text-xs">
              <Link
                href={`/guia/${business.slug}`}
                target="_blank"
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded text-[11px] font-bold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Ver no anúncio</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE POST */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Criar Nova Publicação
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
                <label className="font-bold text-stone-800">Título da Publicação</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  placeholder="Ex: Lançamento do Novo Módulo de Controle"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Conteúdo do Comunicado</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#C9A227] font-medium"
                  placeholder="Escreva a mensagem ou comunicado..."
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
                  <span>Salvar Publicação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
