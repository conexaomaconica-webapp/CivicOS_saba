'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  updatePlatformEventAction,
  getPlatformEventByIdAction,
  type PlatformEvent,
} from '@/app/actions/platform-events';
import {
  X,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  Landmark,
  HeartHandshake,
  GraduationCap,
  Building2,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { EventHeaderMediaField } from './EventHeaderMediaField';
import { extractPriceInfo, classifyEventCategory } from '@/lib/events/events-service';

export type EventCategoryType = 'lodge' | 'social_action' | 'palestras' | 'business' | 'festividades' | 'platform';

const CATEGORY_DEFAULTS: Record<EventCategoryType, { label: string; badge: string; icon: React.ReactNode; desc: string }> = {
  lodge: {
    label: 'Loja Maçônica',
    badge: 'Sessão Maçônica',
    icon: <Landmark size={15} />,
    desc: 'Sessão Magna, Aniversário de Loja, Posse de Diretoria ou Banquete Ritualístico.',
  },
  social_action: {
    label: 'Ação Social & Filantropia',
    badge: 'Ação Beneficente',
    icon: <HeartHandshake size={15} />,
    desc: 'Campanhas beneficentes, Fraternidades Femininas, Ordem DeMolay ou Filhas de Jó.',
  },
  palestras: {
    label: 'Palestra / Workshop',
    badge: 'Palestra & Workshop',
    icon: <GraduationCap size={15} />,
    desc: 'Palestras, cursos, workshops, seminários e treinamentos de capacitação.',
  },
  business: {
    label: 'Empresa Parceira',
    badge: 'Empresa Parceira',
    icon: <Building2 size={15} />,
    desc: 'Encontros corporativos, rodadas de negócios B2B, networking e lançamentos de empresas.',
  },
  festividades: {
    label: 'Festividade / Show',
    badge: 'Festividade / Show',
    icon: <PartyPopper size={15} />,
    desc: 'Almoços fraternos, banquetes, festividades, shows e encontros culturais.',
  },
  platform: {
    label: 'Institucional CM',
    badge: 'Convite Oficial',
    icon: <Sparkles size={15} />,
    desc: 'Eventos institucionais e comunicados gerais da plataforma Conexão Maçônica.',
  },
};

function detectEventCategory(title?: string | null, badge?: string | null, venue?: string | null): EventCategoryType {
  const cat = classifyEventCategory(title, badge, venue);
  switch (cat.id) {
    case 'festividades':
      return 'festividades';
    case 'palestras':
      return 'palestras';
    case 'sociais':
      return 'social_action';
    case 'empresas':
      return 'business';
    case 'institucional':
      return 'platform';
    case 'lojas':
    default:
      return 'lodge';
  }
}

interface Props {
  event: PlatformEvent;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminEditEventModal({ event, onClose, onSuccess }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<EventCategoryType>(() =>
    detectEventCategory(event.title, event.badge_text, event.venue_name)
  );
  const [formData, setFormData] = useState({
    title: event.title || '',
    subtitle: event.subtitle || '',
    priceInfo: extractPriceInfo(event.badge_text, event.subtitle, event.description, null),
    description: event.description || '',
    eventDate: event.event_date || '',
    startTime: event.start_time?.slice(0, 5) || '',
    endTime: event.end_time?.slice(0, 5) || '',
    venueName: event.venue_name || '',
    venueAddress: event.venue_address || '',
    city: event.city || '',
    organizerName: (event as any).organizer_name || '',
    coverImageUrl: event.cover_image_url || '',
    headerMediaType: event.header_media_type || 'logo' as 'logo' | 'banner',
    headerMediaSize: event.header_media_size || 'medium' as 'small' | 'medium' | 'large' | 'full',
    headerMediaPosition: event.header_media_position || 'center' as 'left' | 'center' | 'right',
    badgeText: event.badge_text || 'Convite',
    footerInformation: event.footer_information || '',
    registrationEnabled: event.registration_enabled ?? true,
    capacity: event.capacity !== null && event.capacity !== undefined ? String(event.capacity) : '',
    status: (event.status as 'published' | 'draft' | 'canceled' | 'archived') || 'published',
  });

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Busca os dados completos do banco caso o evento tenha vindo da listagem sem todos os campos
  useEffect(() => {
    let isMounted = true;
    async function loadFullData() {
      if (!event.id) return;
      setLoadingData(true);
      const res = await getPlatformEventByIdAction(event.id);
      if (isMounted && res.success && res.data) {
        const full = res.data;
        setCategory(detectEventCategory(full.title, full.badge_text, full.venue_name));
        setFormData({
          title: full.title || '',
          subtitle: full.subtitle || '',
          priceInfo: extractPriceInfo(full.badge_text, full.subtitle, full.description, null),
          description: full.description || '',
          eventDate: full.event_date || '',
          startTime: full.start_time?.slice(0, 5) || '',
          endTime: full.end_time?.slice(0, 5) || '',
          venueName: full.venue_name || '',
          venueAddress: full.venue_address || '',
          city: full.city || '',
          organizerName: (full as any).organizer_name || '',
          coverImageUrl: full.cover_image_url || '',
          headerMediaType: full.header_media_type || 'logo',
          headerMediaSize: full.header_media_size || 'medium',
          headerMediaPosition: full.header_media_position || 'center',
          badgeText: full.badge_text || 'Convite',
          footerInformation: full.footer_information || '',
          registrationEnabled: full.registration_enabled ?? true,
          capacity: full.capacity !== null && full.capacity !== undefined ? String(full.capacity) : '',
          status: (full.status as any) || 'published',
        });
      }
      if (isMounted) setLoadingData(false);
    }
    loadFullData();
    return () => {
      isMounted = false;
    };
  }, [event.id]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const handleSelectCategory = (catKey: EventCategoryType) => {
    setCategory(catKey);
    const targetBadge = CATEGORY_DEFAULTS[catKey].badge;
    const previousBadge = formData.badgeText.trim();
    const isPreviousDefault =
      !previousBadge ||
      previousBadge === 'Convite' ||
      Object.values(CATEGORY_DEFAULTS).some((c) => c.badge.toLowerCase() === previousBadge.toLowerCase());

    if (isPreviousDefault) {
      handleChange('badgeText', targetBadge);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.title.trim()) {
      setErrorMessage('O título do evento é obrigatório.');
      setSaving(false);
      return;
    }

    if (!formData.eventDate) {
      setErrorMessage('A data do evento é obrigatória.');
      setSaving(false);
      return;
    }

    if (!formData.startTime) {
      setErrorMessage('O horário de início é obrigatório.');
      setSaving(false);
      return;
    }

    let finalSubtitle = formData.subtitle.trim();
    if (formData.priceInfo.trim() && !finalSubtitle.includes(formData.priceInfo.trim())) {
      finalSubtitle = finalSubtitle
        ? `${finalSubtitle} • Ingressos: ${formData.priceInfo.trim()}`
        : `Ingressos: ${formData.priceInfo.trim()}`;
    }

    let finalFooter = formData.footerInformation.trim();
    if (formData.priceInfo.trim() && !finalFooter.includes('Valor')) {
      finalFooter = finalFooter
        ? `${finalFooter}\nValor / Ingressos: ${formData.priceInfo.trim()}`
        : `Valor / Ingressos: ${formData.priceInfo.trim()}`;
    }

    const res = await updatePlatformEventAction({
      eventId: event.id,
      title: formData.title.trim(),
      subtitle: finalSubtitle || null as any,
      description: formData.description.trim() || null as any,
      eventDate: formData.eventDate,
      startTime: formData.startTime,
      endTime: formData.endTime || null as any,
      venueName: formData.venueName.trim() || null as any,
      venueAddress: formData.venueAddress.trim() || null as any,
      city: formData.city.trim() || null as any,
      organizerName: formData.organizerName.trim() || null as any,
      coverImageUrl: formData.coverImageUrl.trim() || null as any,
      headerMediaType: formData.headerMediaType,
      headerMediaSize: formData.headerMediaSize,
      headerMediaPosition: formData.headerMediaPosition,
      badgeText: formData.badgeText.trim() || CATEGORY_DEFAULTS[category].badge,
      footerInformation: finalFooter || null,
      registrationEnabled: formData.registrationEnabled,
      capacity: formData.capacity.trim() ? parseInt(formData.capacity, 10) : null,
      status: formData.status,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMessage('Informações do evento atualizadas com sucesso!');
      setTimeout(() => {
        router.refresh();
        if (onSuccess) onSuccess();
        onClose();
      }, 800);
    } else {
      setErrorMessage(res.error || 'Erro ao atualizar dados do evento.');
    }
  };

  return (
    <div className="aem-overlay" onClick={onClose} role="dialog" aria-label="Editar Informações do Evento">
      <div className="aem-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aem-header">
          <div className="aem-header-title">
            <Edit3 size={20} className="aem-icon" />
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Editar Evento e Página Pública</span>
                {loadingData && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#C9A227', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Loader2 size={13} className="aem-spin" /> Carregando...
                  </span>
                )}
              </h3>
              <p>Altere o título, horários, local e detalhes de confirmação</p>
            </div>
          </div>
          <button onClick={onClose} className="aem-close-btn" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="aem-form">
          {errorMessage && (
            <div className="aem-alert aem-alert--error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="aem-alert aem-alert--success">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="aem-grid">
            {/* Tipo / Categoria do Evento */}
            <div className="aem-field aem-field--full">
              <label>Tipo / Categoria do Evento *</label>
              <div className="aem-categories-grid">
                {(Object.keys(CATEGORY_DEFAULTS) as EventCategoryType[]).map((catKey) => {
                  const item = CATEGORY_DEFAULTS[catKey];
                  const isSelected = category === catKey;
                  return (
                    <button
                      type="button"
                      key={catKey}
                      onClick={() => handleSelectCategory(catKey)}
                      className={`aem-category-btn ${isSelected ? 'aem-category-btn--active' : ''}`}
                    >
                      <span className="aem-category-icon">{item.icon}</span>
                      <span className="aem-category-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="aem-category-desc">{CATEGORY_DEFAULTS[category].desc}</p>
            </div>

            {/* Título */}
            <div className="aem-field aem-field--full">
              <label htmlFor="aem-title">Título do Evento *</label>
              <input
                id="aem-title"
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ex.: Encontro Anual da Família Maçônica"
                required
              />
            </div>

            {/* Subtítulo */}
            <div className="aem-field aem-field--full">
              <label htmlFor="aem-subtitle">Subtítulo / Chamada Secundária</label>
              <input
                id="aem-subtitle"
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                placeholder="Ex.: Uma celebração de sabedoria, união e celebração fraterna"
              />
            </div>

            {/* Valores / Ingressos */}
            <div className="aem-field aem-field--full">
              <label htmlFor="aem-priceInfo" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={14} color="#C9A227" />
                <span>Valores &amp; Ingressos (Exibição em Destaque nos Cards e na Página)</span>
              </label>
              <input
                id="aem-priceInfo"
                type="text"
                value={formData.priceInfo}
                onChange={(e) => handleChange('priceInfo', e.target.value)}
                placeholder="Ex.: Entrada Franca / R$ 50,00 por pessoa / A partir de R$ 35,00"
              />
              <span className="aem-helper-text" style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>
                Exibido com destaque nos carrosséis da vitrine e no cabeçalho estilo Plano Esquadro.
              </span>
            </div>

            {/* Data e Horários */}
            <div className="aem-field">
              <label htmlFor="aem-date">Data do Evento *</label>
              <input
                id="aem-date"
                type="date"
                value={formData.eventDate}
                onChange={(e) => handleChange('eventDate', e.target.value)}
                required
              />
            </div>

            <div className="aem-field">
              <label htmlFor="aem-starttime">Horário de Início *</label>
              <input
                id="aem-starttime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                required
              />
            </div>

            <div className="aem-field">
              <label htmlFor="aem-endtime">Horário de Término</label>
              <input
                id="aem-endtime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
            </div>

            {/* Cidade */}
            <div className="aem-field">
              <label htmlFor="aem-city">Cidade / Município</label>
              <input
                id="aem-city"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Ex.: Feira de Santana - BA"
              />
            </div>

            {/* Local / Espaço */}
            <div className="aem-field aem-field--full">
              <label htmlFor="aem-venue">Nome do Local / Salão</label>
              <input
                id="aem-venue"
                type="text"
                value={formData.venueName}
                onChange={(e) => handleChange('venueName', e.target.value)}
                placeholder="Ex.: Salão de Eventos Grande Loja"
              />
            </div>

            {/* Realização / Loja Organizadora */}
            <div className="aem-field aem-field--full">
              <label htmlFor="aem-organizer">Realização / Loja Organizadora</label>
              <input
                id="aem-organizer"
                type="text"
                value={formData.organizerName}
                onChange={(e) => handleChange('organizerName', e.target.value)}
                placeholder="Ex.: Loja Maçônica 16 de Junho, Loja Cavaleiros de Aço..."
              />
              <span className="aem-hint" style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>
                Nome exibido no card oficial de realização do evento. Se vazio, utiliza o nome do local.
              </span>
            </div>

            {/* Endereço */}
            <div className="aem-field aem-field--full">
              <label htmlFor="aem-address">Endereço Completo</label>
              <input
                id="aem-address"
                type="text"
                value={formData.venueAddress}
                onChange={(e) => handleChange('venueAddress', e.target.value)}
                placeholder="Ex.: Av. Getúlio Vargas, 1500 - Centro"
              />
            </div>

            {/* Descrição Detalhada */}
            <div className="aem-field aem-field--full">
              <label htmlFor="aem-desc">Descrição / Programação do Evento</label>
              <textarea
                id="aem-desc"
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Descreva a programação, atrações, traje recomendado e avisos importantes..."
              />
            </div>

            <div className="aem-field aem-field--full">
              <EventHeaderMediaField
                mediaType={formData.headerMediaType}
                mediaSize={formData.headerMediaSize}
                mediaPosition={formData.headerMediaPosition}
                imageUrl={formData.coverImageUrl}
                onMediaTypeChange={(value) => handleChange('headerMediaType', value)}
                onMediaSizeChange={(value) => handleChange('headerMediaSize', value)}
                onMediaPositionChange={(value) => handleChange('headerMediaPosition', value)}
                onImageUrlChange={(value) => handleChange('coverImageUrl', value)}
              />
            </div>

            <div className="aem-field aem-field--full">
              <label htmlFor="aem-badge">Texto do badge no convite</label>
              <input id="aem-badge" type="text" maxLength={60} value={formData.badgeText} onChange={(e) => handleChange('badgeText', e.target.value)} placeholder="Ex.: Convite / Lançamento" />
            </div>

            <div className="aem-field aem-field--full">
              <label htmlFor="aem-footer-information">Informações / contato / observações no final do RSVP</label>
              <textarea id="aem-footer-information" rows={4} maxLength={1200} value={formData.footerInformation} onChange={(e) => handleChange('footerInformation', e.target.value)} placeholder={'Ex.: Dúvidas pelo WhatsApp (75) 99999-9999\nTraje: esporte fino\nEstacionamento disponível no local'} />
              <span className="text-xs text-stone-500">Campo opcional. Será exibido abaixo do formulário de confirmação.</span>
            </div>

            {/* Capacidade */}
            <div className="aem-field">
              <label htmlFor="aem-capacity">Limite de Vagas (Vazio = Ilimitado)</label>
              <input
                id="aem-capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                placeholder="Ex.: 300"
              />
            </div>

            {/* Status do Evento */}
            <div className="aem-field">
              <label htmlFor="aem-status">Status de Publicação</label>
              <select
                id="aem-status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="canceled">Cancelado</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            {/* Controle de Inscrição */}
            <div className="aem-field aem-field--full" style={{ background: '#FAF7F2', padding: '0.875rem', borderRadius: '8px', border: '1px solid #E8E2D9' }}>
              <label className="aem-checkbox-label" style={{ fontWeight: 600, color: '#3B0B14' }}>
                <input
                  type="checkbox"
                  checked={formData.registrationEnabled}
                  onChange={(e) => handleChange('registrationEnabled', e.target.checked)}
                />
                <span>Habilitar lista de presença e inscrições (RSVP)</span>
              </label>
              <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.75rem', color: '#6B7280' }}>
                {formData.registrationEnabled
                  ? 'Ativado: Maçons, cunhadas e convidados podem confirmar presença com controle de vagas.'
                  : 'Desativado: Evento em formato "Apenas Divulgação" (sem lista de presença ou formulário de check-in).'}
              </p>
            </div>
          </div>

          <div className="aem-actions">
            <button type="button" onClick={onClose} className="aem-cancel-btn" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="aem-submit-btn" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="aem-spin" />
                  <span>Salvar Alterações...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .aem-overlay {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; padding: 1rem; backdrop-filter: blur(4px);
        }
        .aem-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 720px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          border: 1px solid #E5E0D8;
        }
        .aem-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem; border-bottom: 1px solid #F0EDE6; background: #FAF8F5;
        }
        .aem-header-title { display: flex; align-items: center; gap: 0.75rem; }
        .aem-icon { color: #3B0B14; }
        .aem-header-title h3 { font-size: 1.125rem; font-weight: 800; color: #1C0D10; margin: 0; }
        .aem-header-title p { font-size: 0.8125rem; color: #777; margin: 0; }
        .aem-close-btn {
          background: none; border: none; color: #888; cursor: pointer; padding: 0.375rem;
          border-radius: 8px; transition: background 0.15s;
        }
        .aem-close-btn:hover { background: #E5E0D8; color: #1C0D10; }

        .aem-form { padding: 1.5rem; }
        .aem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .aem-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .aem-field--full { grid-column: 1 / -1; }
        .aem-field--checkbox { grid-column: 1 / -1; margin-top: 0.5rem; }
        .aem-categories-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        @media (max-width: 640px) {
          .aem-categories-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .aem-category-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.75rem;
          background: #FAF8F5;
          border: 1.5px solid #DDD7CD;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #4A4A4A;
          transition: all 0.15s ease;
          text-align: left;
        }
        .aem-category-btn:hover {
          background: #F4EFEA;
          border-color: #C9A227;
          color: #1C0D10;
        }
        .aem-category-btn--active {
          background: #3B0B14 !important;
          border-color: #3B0B14 !important;
          color: #C9A227 !important;
          box-shadow: 0 2px 6px rgba(59, 11, 20, 0.25);
        }
        .aem-category-btn--active .aem-category-icon {
          color: #C9A227;
        }
        .aem-category-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8C7355;
          flex-shrink: 0;
        }
        .aem-category-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .aem-category-desc {
          margin: 0.375rem 0 0 0;
          font-size: 0.75rem;
          color: #6B7280;
          font-style: italic;
        }
        .aem-field label { font-size: 0.8125rem; font-weight: 700; color: #333; }
        .aem-field input[type="text"],
        .aem-field input[type="date"],
        .aem-field input[type="time"],
        .aem-field input[type="number"],
        .aem-field input[type="url"],
        .aem-field textarea,
        .aem-field select {
          width: 100%; padding: 0.625rem 0.875rem; border: 1.5px solid #DDD7CD;
          border-radius: 8px; font-size: 0.875rem; color: #1C0D10; background: #FFF;
          transition: border-color 0.15s;
        }
        .aem-field select {
          cursor: pointer;
          padding-right: 2.25rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%233B0B14' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 16px 16px;
          -webkit-appearance: none;
          appearance: none;
        }
        .aem-field input:focus, .aem-field textarea:focus, .aem-field select:focus {
          outline: none; border-color: #3B0B14; box-shadow: 0 0 0 3px rgba(59,11,20,0.1);
        }
        .aem-checkbox-label {
          display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;
          color: #3B0B14; font-weight: 600; cursor: pointer;
        }

        .aem-alert {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem;
          border-radius: 8px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1.25rem;
        }
        .aem-alert--error { background: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5; }
        .aem-alert--success { background: #F0FDF4; color: #16A34A; border: 1px solid #86EFAC; }

        .aem-actions {
          display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;
          margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid #F0EDE6;
        }
        .aem-cancel-btn {
          padding: 0.625rem 1.25rem; background: #F0EDE6; color: #555; border: none;
          border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;
        }
        .aem-cancel-btn:hover { background: #E5E0D8; }
        .aem-submit-btn {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.5rem;
          background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.4);
          border-radius: 8px; font-size: 0.875rem; font-weight: 700; cursor: pointer;
          transition: opacity 0.15s;
        }
        .aem-submit-btn:hover { opacity: 0.9; }
        .aem-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
