'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlatformEventAction } from '@/app/actions/platform-events';
import {
  X,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Megaphone,
  Users,
  Landmark,
  HeartHandshake,
  Building2,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { EventHeaderMediaField } from './EventHeaderMediaField';

export type EventCategoryType = 'lodge' | 'social_action' | 'business' | 'platform';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
  prefillCategory?: EventCategoryType;
  prefillLodgeName?: string;
  prefillCity?: string;
  prefillAddress?: string;
}

const CATEGORY_DEFAULTS: Record<EventCategoryType, { label: string; badge: string; icon: React.ReactNode; desc: string }> = {
  lodge: {
    label: 'Loja Maçônica',
    badge: 'Loja Maçônica',
    icon: <Landmark size={15} />,
    desc: 'Sessão Magna, Aniversário de Loja, Posse de Diretoria ou Banquete Ritualístico.',
  },
  social_action: {
    label: 'Ação Social & Filantropia',
    badge: 'Ação Social & Filantropia',
    icon: <HeartHandshake size={15} />,
    desc: 'Campanhas beneficentes, Fraternidades Femininas, Ordem DeMolay ou Filhas de Jó.',
  },
  business: {
    label: 'Empresa Parceira',
    badge: 'Empresa Parceira',
    icon: <Building2 size={15} />,
    desc: 'Palestras, encontros corporativos, workshops e lançamentos de empresas da rede.',
  },
  platform: {
    label: 'Institucional CM',
    badge: 'Convite Oficial',
    icon: <Sparkles size={15} />,
    desc: 'Eventos institucionais e comunicados gerais da plataforma Conexão Maçônica.',
  },
};

export function AdminCreateEventModal({
  onClose,
  onSuccess,
  prefillCategory = 'lodge',
  prefillLodgeName = '',
  prefillCity = '',
  prefillAddress = '',
}: Props) {
  const router = useRouter();

  const [category, setCategory] = useState<EventCategoryType>(prefillCategory);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    eventDate: '',
    startTime: '19:30',
    endTime: '22:00',
    venueName: prefillLodgeName || '',
    venueAddress: prefillAddress || '',
    city: prefillCity || '',
    coverImageUrl: '',
    headerMediaType: 'logo' as 'logo' | 'banner',
    headerMediaSize: 'medium' as 'small' | 'medium' | 'large' | 'full',
    headerMediaPosition: 'center' as 'left' | 'center' | 'right',
    badgeText: CATEGORY_DEFAULTS[prefillCategory].badge,
    footerInformation: '',
    registrationEnabled: false, // PADRÃO: Apenas divulgação (sem exigir lista de presença)
    capacity: '',
    status: 'published' as const,
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleCategorySelect = (cat: EventCategoryType) => {
    setCategory(cat);
    // Se o badge estiver com o padrão antigo, atualiza para o novo padrão da categoria
    setFormData((prev) => ({
      ...prev,
      badgeText: CATEGORY_DEFAULTS[cat].badge,
    }));
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMessage('');
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

    const res = await createPlatformEventAction({
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim() || undefined,
      description: formData.description.trim() || undefined,
      eventDate: formData.eventDate,
      startTime: formData.startTime,
      endTime: formData.endTime || undefined,
      venueName: formData.venueName.trim() || undefined,
      venueAddress: formData.venueAddress.trim() || undefined,
      city: formData.city.trim() || undefined,
      coverImageUrl: formData.coverImageUrl.trim() || undefined,
      headerMediaType: formData.headerMediaType,
      headerMediaSize: formData.headerMediaSize,
      headerMediaPosition: formData.headerMediaPosition,
      badgeText: formData.badgeText,
      footerInformation: formData.footerInformation.trim() || undefined,
      registrationEnabled: formData.registrationEnabled,
      capacity:
        formData.registrationEnabled && formData.capacity.trim()
          ? parseInt(formData.capacity, 10)
          : null,
      status: formData.status,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMessage('Evento cadastrado e publicado com sucesso!');
      setTimeout(() => {
        router.refresh();
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } else {
      setErrorMessage(res.error || 'Erro ao criar evento.');
    }
  };

  return (
    <div className="acm-overlay" onClick={onClose} role="dialog" aria-label="Criar Novo Evento">
      <div className="acm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acm-header">
          <div className="acm-header-title">
            <CalendarPlus size={22} className="acm-icon" />
            <div>
              <h3>Cadastrar Novo Evento ou Divulgação</h3>
              <p>Divulgue encontros, sessões maçônicas, ações sociais e eventos de parceiros</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="acm-close-btn" aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="acm-form">
          {errorMessage && (
            <div className="acm-alert acm-alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="acm-alert acm-alert-success" role="status">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. SELETOR DE MODALIDADE DO EVENTO (DIVULGAÇÃO vs RSVP) */}
          <div className="acm-modality-box">
            <div className="acm-modality-header">
              <span className="acm-modality-title">Modalidade do Evento:</span>
              <span className="acm-modality-sub">Escolha se precisa de lista de presença ou apenas divulgação</span>
            </div>

            <div className="acm-modality-grid">
              <button
                type="button"
                className={`acm-modality-card ${!formData.registrationEnabled ? 'acm-modality-card--active' : ''}`}
                onClick={() => handleChange('registrationEnabled', false)}
              >
                <div className="acm-modality-radio">
                  {!formData.registrationEnabled && <div className="acm-modality-radio-dot" />}
                </div>
                <div className="acm-modality-content">
                  <div className="acm-modality-label">
                    <Megaphone size={15} className="text-[#C9A227]" />
                    <strong>Apenas Divulgação (Sem lista de presença)</strong>
                    <span className="acm-tag-recommended">Padrão</span>
                  </div>
                  <p>
                    Apenas informar data, local, horário e orientações. Não exige check-in nem lista de inscritos.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className={`acm-modality-card ${formData.registrationEnabled ? 'acm-modality-card--active' : ''}`}
                onClick={() => handleChange('registrationEnabled', true)}
              >
                <div className="acm-modality-radio">
                  {formData.registrationEnabled && <div className="acm-modality-radio-dot" />}
                </div>
                <div className="acm-modality-content">
                  <div className="acm-modality-label">
                    <Users size={15} className="text-[#3B0B14]" />
                    <strong>Com Confirmação de Presença (RSVP)</strong>
                  </div>
                  <p>
                    Abre formulário para que maçons, cunhadas e convidados confirmem presença com controle de vagas.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. CATEGORIA / ORGANIZADOR DO EVENTO */}
          <div className="acm-field">
            <label className="acm-label">Tipo / Organizador do Evento *</label>
            <div className="acm-categories-grid">
              {(Object.keys(CATEGORY_DEFAULTS) as EventCategoryType[]).map((catKey) => {
                const item = CATEGORY_DEFAULTS[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => handleCategorySelect(catKey)}
                    className={`acm-category-btn ${isSelected ? 'acm-category-btn--active' : ''}`}
                  >
                    <span className="acm-cat-icon">{item.icon}</span>
                    <span className="acm-cat-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="acm-helper-text">{CATEGORY_DEFAULTS[category].desc}</p>
          </div>

          {/* TÍTULO E SUBTÍTULO */}
          <div className="acm-field">
            <label className="acm-label" htmlFor="create-title">Título do Evento *</label>
            <input
              id="create-title"
              type="text"
              className="acm-input"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={
                category === 'lodge'
                  ? 'Ex: Sessão Magna Branca de Aniversário de 50 Anos'
                  : category === 'social_action'
                  ? 'Ex: Campanha do Agasalho Fraterno 2026'
                  : category === 'business'
                  ? 'Ex: Palestra sobre Planejamento Financeiro e Sucessão'
                  : 'Ex: Encontro Geral de Integração da Rede Fraterna'
              }
              required
            />
          </div>

          <div className="acm-field">
            <label className="acm-label" htmlFor="create-subtitle">Subtítulo / Tema / Resumo Curto</label>
            <input
              id="create-subtitle"
              type="text"
              className="acm-input"
              value={formData.subtitle}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              placeholder="Ex: Homenagem aos Fundadores e Confraternização com a Comunidade"
            />
          </div>

          {/* DATA E HORÁRIOS */}
          <div className="acm-grid">
            <div className="acm-field">
              <label className="acm-label" htmlFor="create-eventDate">Data do Evento *</label>
              <input
                id="create-eventDate"
                type="date"
                className="acm-input"
                value={formData.eventDate}
                onChange={(e) => handleChange('eventDate', e.target.value)}
                required
              />
            </div>

            <div className="acm-field">
              <label className="acm-label" htmlFor="create-startTime">Horário Início *</label>
              <input
                id="create-startTime"
                type="time"
                className="acm-input"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                required
              />
            </div>

            <div className="acm-field">
              <label className="acm-label" htmlFor="create-endTime">Horário Término</label>
              <input
                id="create-endTime"
                type="time"
                className="acm-input"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
            </div>
          </div>

          {/* LOCAL E CIDADE */}
          <div className="acm-grid">
            <div className="acm-field">
              <label className="acm-label" htmlFor="create-venueName">
                {category === 'lodge' ? 'Loja Organizadora / Nome do Templo' : 'Local / Empresa Organizadora'}
              </label>
              <input
                id="create-venueName"
                type="text"
                className="acm-input"
                value={formData.venueName}
                onChange={(e) => handleChange('venueName', e.target.value)}
                placeholder="Ex: A.R.L.S. Luz e Fraternidade nº 42"
              />
            </div>

            <div className="acm-field">
              <label className="acm-label" htmlFor="create-city">Cidade / UF</label>
              <input
                id="create-city"
                type="text"
                className="acm-input"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Ex: Feira de Santana - BA"
              />
            </div>
          </div>

          <div className="acm-field">
            <label className="acm-label" htmlFor="create-venueAddress">Endereço Completo</label>
            <input
              id="create-venueAddress"
              type="text"
              className="acm-input"
              value={formData.venueAddress}
              onChange={(e) => handleChange('venueAddress', e.target.value)}
              placeholder="Ex: Rua Barão de Cotegipe, 120 - Centro"
            />
          </div>

          {/* DESCRIÇÃO */}
          <div className="acm-field">
            <label className="acm-label" htmlFor="create-description">Descrição Completa e Programação</label>
            <textarea
              id="create-description"
              className="acm-textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Explique os objetivos do evento, programação das palestras, traje exigido (se houver), estacionamento e como participar..."
            />
          </div>

          {/* MÍDIA / BANNER */}
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

          <div className="acm-field">
            <label className="acm-label" htmlFor="create-badge">Texto do Selo / Badge no Convite</label>
            <input
              id="create-badge"
              type="text"
              maxLength={60}
              className="acm-input"
              value={formData.badgeText}
              onChange={(e) => handleChange('badgeText', e.target.value)}
              placeholder="Ex.: Loja Maçônica / Sessão Magna / Ação Social"
            />
          </div>

          {/* CONTATO / WHATSAPP / INFORMAÇÕES EXTRAS */}
          <div className="acm-field">
            <label className="acm-label" htmlFor="create-footer-information">
              <span className="flex items-center gap-1.5">
                <PhoneCall size={14} className="text-emerald-600" />
                Informações para Contato / WhatsApp / Orientações Gerais
              </span>
            </label>
            <textarea
              id="create-footer-information"
              rows={3}
              maxLength={1200}
              className="acm-textarea"
              value={formData.footerInformation}
              onChange={(e) => handleChange('footerInformation', e.target.value)}
              placeholder={'Ex.: Dúvidas pelo WhatsApp (75) 99999-9999 com Ir. Silva\nTraje: Passeio Completo ou Paramento\nEstacionamento gratuito no local.'}
            />
          </div>

          {/* CAMPOS ESPECÍFICOS QUANDO RSVP ESTÁ ATIVADO */}
          {formData.registrationEnabled && (
            <div className="acm-grid">
              <div className="acm-field">
                <label className="acm-label" htmlFor="create-capacity">Capacidade Máxima (Vagas de RSVP)</label>
                <input
                  id="create-capacity"
                  type="number"
                  min="1"
                  className="acm-input"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  placeholder="Deixe em branco para ilimitado"
                />
              </div>

              <div className="acm-field">
                <label className="acm-label" htmlFor="create-status">Status de Publicação</label>
                <select
                  id="create-status"
                  className="acm-select"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="published">Publicado no Guia</option>
                  <option value="draft">Rascunho</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>
          )}

          <div className="acm-actions">
            <button type="button" onClick={onClose} className="acm-btn-cancel" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="acm-btn-save" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="acm-spin" />
                  Salvando...
                </>
              ) : formData.registrationEnabled ? (
                'Criar Evento com RSVP'
              ) : (
                'Publicar Divulgação'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .acm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .acm-modal {
          background: #FFFFFF; width: 100%; max-width: 680px;
          border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
          overflow: hidden; display: flex; flex-direction: column; max-height: 90vh;
        }
        .acm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem; background: #3B0B14; color: #FFFFFF;
        }
        .acm-header-title { display: flex; align-items: center; gap: 0.75rem; }
        .acm-icon { color: #C9A227; }
        .acm-header-title h3 { margin: 0; font-size: 1.125rem; font-weight: 700; color: #FFFFFF; }
        .acm-header-title p { margin: 0; font-size: 0.8125rem; color: #D1D5DB; }
        .acm-close-btn { background: transparent; border: none; color: #D1D5DB; cursor: pointer; padding: 0.25rem; border-radius: 6px; }
        .acm-close-btn:hover { color: #FFFFFF; background: rgba(255,255,255,0.1); }
        .acm-form { padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.125rem; }

        /* Box de Modalidade */
        .acm-modality-box {
          background: #faf7f2; border: 1px solid #e8e2d9; border-radius: 12px; padding: 1rem;
        }
        .acm-modality-header { margin-bottom: 0.75rem; }
        .acm-modality-title { display: block; font-size: 0.8125rem; font-weight: 700; color: #3b0b14; }
        .acm-modality-sub { font-size: 0.75rem; color: #78716c; }
        .acm-modality-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        @media (max-width: 600px) {
          .acm-modality-grid { grid-template-columns: 1fr; }
        }
        .acm-modality-card {
          display: flex; align-items: flex-start; gap: 0.625rem; text-align: left;
          background: #FFFFFF; border: 2px solid #e2e8f0; border-radius: 10px; padding: 0.75rem;
          cursor: pointer; transition: all 0.15s ease;
        }
        .acm-modality-card:hover { border-color: #cbd5e1; }
        .acm-modality-card--active {
          border-color: #C9A227; background: #fffdfa; box-shadow: 0 0 0 1px #C9A227;
        }
        .acm-modality-radio {
          width: 16px; height: 16px; border-radius: 50%; border: 2px solid #94a3b8;
          display: flex; align-items: center; justify-content: center; margin-top: 2px; shrink-0;
        }
        .acm-modality-card--active .acm-modality-radio {
          border-color: #3b0b14;
        }
        .acm-modality-radio-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #3b0b14;
        }
        .acm-modality-content { flex: 1; min-width: 0; }
        .acm-modality-label {
          display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; color: #1e293b; margin-bottom: 0.25rem; flex-wrap: wrap;
        }
        .acm-tag-recommended {
          font-size: 0.65rem; font-weight: 800; background: #C9A227; color: #27170b;
          padding: 0.1rem 0.4rem; border-radius: 4px; text-transform: uppercase;
        }
        .acm-modality-content p {
          margin: 0; font-size: 0.72rem; color: #64748b; line-height: 1.35;
        }

        /* Categorias */
        .acm-categories-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 0.25rem;
        }
        @media (max-width: 640px) {
          .acm-categories-grid { grid-template-columns: 1fr 1fr; }
        }
        .acm-category-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.35rem;
          padding: 0.625rem 0.5rem; border: 1px solid #d1d5db; border-radius: 8px; background: #ffffff;
          font-size: 0.75rem; font-weight: 600; color: #4b5563; cursor: pointer; transition: all 0.15s;
        }
        .acm-category-btn:hover { border-color: #9ca3af; background: #f9fafb; }
        .acm-category-btn--active {
          border-color: #3B0B14; background: #3B0B14; color: #C9A227;
        }
        .acm-cat-icon { display: flex; align-items: center; }
        .acm-cat-label { font-size: 0.72rem; text-align: center; }
        .acm-helper-text { font-size: 0.72rem; color: #6b7280; margin-top: 0.25rem; font-style: italic; }

        .acm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
        .acm-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .acm-label { font-size: 0.8125rem; font-weight: 600; color: #374151; }
        .acm-input, .acm-textarea, .acm-select {
          width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #D1D5DB; border-radius: 8px;
          font-size: 0.875rem; color: #111827; background: #FFFFFF; transition: border-color 0.15s;
        }
        .acm-select {
          cursor: pointer;
          padding-right: 2.25rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%233B0B14' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 16px 16px;
          -webkit-appearance: none;
          appearance: none;
        }
        .acm-input:focus, .acm-textarea:focus, .acm-select:focus { outline: none; border-color: #3B0B14; box-shadow: 0 0 0 3px rgba(59,11,20,0.1); }
        .acm-alert { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; }
        .acm-alert-error { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; }
        .acm-alert-success { background: #ECFDF5; color: #065F46; border: 1px solid #6EE7B7; }
        .acm-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid #E5E7EB; }
        .acm-btn-cancel { padding: 0.625rem 1.25rem; background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .acm-btn-cancel:hover { background: #E5E7EB; }
        .acm-btn-save { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.3); border-radius: 8px; font-weight: 700; cursor: pointer; }
        .acm-btn-save:hover { background: #2A080E; }
        .acm-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
