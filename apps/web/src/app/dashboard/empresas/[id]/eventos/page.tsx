'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Badge, Input, Dialog } from '@saas/ui';
import { createBusinessEventAction, updateBusinessEventStatusAction, getBusinessEntitlementQuotaAction } from '@/app/actions/events-and-posts';

interface EventItem {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string;
  timezone: string;
  location_name?: string;
  publication_status: 'draft' | 'published' | 'canceled' | 'archived';
}

const COMMON_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Recife',
];

export default function BusinessEventsPage() {
  const params = useParams();
  const businessId = (params?.id as string) || 'demo-biz';

  const [events, setEvents] = useState<EventItem[]>([
    {
      id: 'evt-01',
      title: 'Workshop de Tecnologia & Inovação H2',
      description: 'Palestra presencial e networking entre profissionais e empresas.',
      starts_at: new Date(Date.now() + 86400000 * 5).toISOString(),
      ends_at: new Date(Date.now() + 86400000 * 5 + 14400000).toISOString(),
      timezone: 'America/Sao_Paulo',
      location_name: 'Centro de Convenções SABA',
      publication_status: 'published',
    },
  ]);

  const [maxQuota, setMaxQuota] = useState(5);

  React.useEffect(() => {
    getBusinessEntitlementQuotaAction('tenant-demo', businessId, 'events_limit').then((res) => {
      if (res.success && res.data) {
        setMaxQuota(res.data.maxLimit);
      }
    });
  }, [businessId]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeCount = events.filter((e) => e.publication_status === 'published').length;

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await createBusinessEventAction({
        tenantId: 'tenant-demo',
        businessId,
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        timezone,
        locationName: locationName || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'Falha ao criar evento.');
      }

      setEvents((prev) => [
        ...prev,
        {
          id: `evt-${Date.now()}`,
          title,
          description,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
          timezone,
          location_name: locationName,
          publication_status: 'published',
        },
      ]);

      setMessage({ type: 'success', text: 'Evento criado e publicado com sucesso!' });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao criar evento.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: 'canceled' | 'archived') => {
    setLoading(true);
    try {
      const res = await updateBusinessEventStatusAction({ eventId, status: newStatus });
      if (!res.success) throw new Error(res.error);

      setEvents((prev) =>
        prev.map((item) => (item.id === eventId ? { ...item, publication_status: newStatus } : item))
      );
      setMessage({ type: 'success', text: `Evento ${newStatus === 'canceled' ? 'cancelado' : 'arquivado'}.` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao atualizar evento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestão de Eventos da Empresa
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Publique workshops, palestras e feiras comerciais. Recurso exclusivo do <strong>Plano Ouro</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={activeCount >= maxQuota ? 'danger' : 'warning'}>
            Cota de Eventos: {activeCount} / {maxQuota} ativos
          </Badge>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            disabled={activeCount >= maxQuota}
          >
            + Novo Evento
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
        {events.map((evt) => (
          <Card key={evt.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{evt.title}</h3>
                <Badge
                  variant={
                    evt.publication_status === 'published'
                      ? 'success'
                      : evt.publication_status === 'canceled'
                      ? 'danger'
                      : 'neutral'
                  }
                >
                  {evt.publication_status}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{evt.description}</p>
              <div className="text-xs text-slate-400">
                <span>Início: {new Date(evt.starts_at).toLocaleString('pt-BR')}</span> •{' '}
                <span>Fuso IANA: {evt.timezone}</span>
              </div>
            </div>

            {evt.publication_status === 'published' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(evt.id, 'canceled')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleStatusChange(evt.id, 'archived')}
                  disabled={loading}
                >
                  Arquivar
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <Dialog isOpen={true} onClose={() => setShowCreateModal(false)} title="Novo Evento — Plano Ouro">
          <form onSubmit={handleCreateEvent} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Título do Evento:
              </label>
              <Input
                placeholder="Ex: Encontro de Negócios e Networking H2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição Completa:
              </label>
              <Input
                placeholder="Detalhes, programação e objetivo do evento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data e Horário de Início:
                </label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data e Horário de Término (Opcional):
                </label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fuso Horário IANA:
                </label>
                <select
                  className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Local / Endereço:
                </label>
                <Input
                  placeholder="Ex: Auditório Central ou Online"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Publicando...' : 'Publicar Evento'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
