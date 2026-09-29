'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlatformEventAction } from '@/app/actions/platform-events';
import { X, CalendarPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminCreateEventModal({ onClose, onSuccess }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    eventDate: '',
    startTime: '19:30',
    endTime: '22:00',
    venueName: '',
    venueAddress: '',
    city: '',
    coverImageUrl: '',
    registrationEnabled: true,
    capacity: '',
    status: 'published' as const,
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      registrationEnabled: formData.registrationEnabled,
      capacity: formData.capacity.trim() ? parseInt(formData.capacity, 10) : null,
      status: formData.status,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMessage('Evento criado com sucesso!');
      setTimeout(() => {
        router.refresh();
        if (onSuccess) onSuccess();
        onClose();
      }, 800);
    } else {
      setErrorMessage(res.error || 'Erro ao criar evento.');
    }
  };

  return (
    <div className="acm-overlay" onClick={onClose} role="dialog" aria-label="Criar Novo Evento">
      <div className="acm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acm-header">
          <div className="acm-header-title">
            <CalendarPlus size={20} className="acm-icon" />
            <div>
              <h3>Criar Novo Evento</h3>
              <p>Cadastre um novo evento institucional com suporte a RSVP</p>
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

          <div className="acm-field">
            <label className="acm-label" htmlFor="create-title">Título do Evento *</label>
            <input
              id="create-title"
              type="text"
              className="acm-input"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ex: Sessão Solene de Aniversário da Loja"
              required
            />
          </div>

          <div className="acm-field">
            <label className="acm-label" htmlFor="create-subtitle">Subtítulo / Tema</label>
            <input
              id="create-subtitle"
              type="text"
              className="acm-input"
              value={formData.subtitle}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              placeholder="Ex: Homenagem aos Fundadores e Confraternização Maçônica"
            />
          </div>

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

          <div className="acm-grid">
            <div className="acm-field">
              <label className="acm-label" htmlFor="create-venueName">Nome do Local</label>
              <input
                id="create-venueName"
                type="text"
                className="acm-input"
                value={formData.venueName}
                onChange={(e) => handleChange('venueName', e.target.value)}
                placeholder="Ex: Templo Nobre da Grande Loja"
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
                placeholder="Ex: Salvador - BA"
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
              placeholder="Ex: Av. Sete de Setembro, 1500 - Corredor da Vitória"
            />
          </div>

          <div className="acm-field">
            <label className="acm-label" htmlFor="create-description">Descrição Detalhada</label>
            <textarea
              id="create-description"
              className="acm-textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Informações adicionais, trajes exigidos, programação do evento..."
            />
          </div>

          <div className="acm-grid">
            <div className="acm-field">
              <label className="acm-label" htmlFor="create-capacity">Capacidade Máxima</label>
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
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>

          <div className="acm-checkbox-group">
            <label className="acm-checkbox-label">
              <input
                type="checkbox"
                checked={formData.registrationEnabled}
                onChange={(e) => handleChange('registrationEnabled', e.target.checked)}
              />
              <span>Habilitar formulário de inscrições (RSVP)</span>
            </label>
          </div>

          <div className="acm-actions">
            <button type="button" onClick={onClose} className="acm-btn-cancel" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="acm-btn-save" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="acm-spin" />
                  Criando...
                </>
              ) : (
                'Criar Evento'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .acm-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .acm-modal {
          background: #FFFFFF; width: 100%; max-width: 640px;
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
        .acm-form { padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
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
        .acm-checkbox-group { margin-top: 0.25rem; }
        .acm-checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #374151; cursor: pointer; }
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
