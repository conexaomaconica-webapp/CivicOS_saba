'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Badge, Input, Dialog } from '@saas/ui';
import { createBusinessPostAction, updateBusinessPostStatusAction, getBusinessEntitlementQuotaAction } from '@/app/actions/events-and-posts';

interface PostItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  published_at: string;
  publication_status: 'draft' | 'scheduled' | 'published' | 'archived';
}

export default function BusinessPostsPage() {
  const params = useParams();
  const businessId = (params?.id as string) || 'demo-biz';

  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: 'post-01',
      title: 'Lançamento da Nova Linha de Produtos H2',
      summary: 'Confira nossas novidades e condições especiais exclusivas.',
      content: 'Estamos orgulhosos em apresentar a nova linha de serviços com suporte completo e condições especiais.',
      published_at: new Date().toISOString(),
      publication_status: 'published',
    },
  ]);

  const [maxQuota, setMaxQuota] = useState(10);

  React.useEffect(() => {
    getBusinessEntitlementQuotaAction('tenant-demo', businessId, 'posts_limit').then((res) => {
      if (res.success && res.data) {
        setMaxQuota(res.data.maxLimit);
      }
    });
  }, [businessId]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeCount = posts.filter((p) => p.publication_status === 'published').length;

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await createBusinessPostAction({
        tenantId: 'tenant-demo',
        businessId,
        title,
        summary,
        content,
      });

      if (!res.success) {
        throw new Error(res.error || 'Falha ao publicar novidade.');
      }

      setPosts((prev) => [
        ...prev,
        {
          id: `post-${Date.now()}`,
          title,
          summary,
          content,
          published_at: new Date().toISOString(),
          publication_status: 'published',
        },
      ]);

      setMessage({ type: 'success', text: 'Publicação criada e veiculada com sucesso!' });
      setShowCreateModal(false);
      setTitle('');
      setSummary('');
      setContent('');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao criar publicação.' });
    } finally {
      setLoading(false);
    }
  };

  const handleArchivePost = async (postId: string) => {
    setLoading(true);
    try {
      const res = await updateBusinessPostStatusAction({ postId, status: 'archived' });
      if (!res.success) throw new Error(res.error);

      setPosts((prev) =>
        prev.map((item) => (item.id === postId ? { ...item, publication_status: 'archived' } : item))
      );
      setMessage({ type: 'success', text: 'Publicação arquivada.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao arquivar publicação.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestão de Novidades & Posts
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Publique novidades, artigos e boletins informativos. Recurso exclusivo do <strong>Plano Ouro</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={activeCount >= maxQuota ? 'danger' : 'warning'}>
            Cota de Posts: {activeCount} / {maxQuota} publicados
          </Badge>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            disabled={activeCount >= maxQuota}
          >
            + Nova Publicação
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{post.title}</h3>
                <Badge variant={post.publication_status === 'published' ? 'success' : 'neutral'}>
                  {post.publication_status}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{post.summary}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
              <div className="text-xs text-slate-400">
                Publicado em: {new Date(post.published_at).toLocaleString('pt-BR')}
              </div>
            </div>

            {post.publication_status === 'published' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleArchivePost(post.id)}
                disabled={loading}
              >
                Arquivar Post
              </Button>
            )}
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <Dialog isOpen={true} onClose={() => setShowCreateModal(false)} title="Nova Publicação — Plano Ouro">
          <form onSubmit={handleCreatePost} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Título do Post:
              </label>
              <Input
                placeholder="Ex: Nova parceria estratégica e expansão de serviços"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Resumo Curto:
              </label>
              <Input
                placeholder="Uma frase curta que resume a publicação..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Conteúdo Completo:
              </label>
              <Input
                placeholder="Escreva o conteúdo detalhado do seu post..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Publicando...' : 'Publicar Agora'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
