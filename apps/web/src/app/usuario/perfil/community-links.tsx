'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  listMyCommunityLinks,
  listMyBusinessOptions,
  requestCommunityLink,
  submitLinkForReview,
  COMMUNITY_LINK_TYPES,
  COMMUNITY_LINK_TYPE_LABELS,
  type CommunityLinkDto,
  type BusinessOption,
} from '@/lib/masonic/masonic-links-service';

const CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  padding: 'var(--space-4)',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  marginBottom: 'var(--space-3)',
} as const;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  neutral: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  pending: { bg: 'oklch(0.93 0.1 80 / 0.25)', color: 'oklch(0.5 0.12 80)' },
  success: { bg: 'oklch(0.93 0.06 160 / 0.25)', color: 'oklch(0.42 0.11 160)' },
  danger: { bg: 'oklch(0.95 0.05 25 / 0.15)', color: 'var(--color-error-500)' },
};

const INPUT_STYLE = {
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
} as const;

function StatusBadge({ dto }: { dto: CommunityLinkDto }) {
  const colors = STATUS_COLORS[dto.statusTone] ?? STATUS_COLORS.neutral!;
  return (
    <span
      style={{
        padding: 'var(--space-1) var(--space-2)',
        backgroundColor: colors.bg,
        color: colors.color,
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-weight-semibold)',
      }}
    >
      {dto.statusLabel}
    </span>
  );
}

export default function CommunityLinks() {
  const supabase = createClient();

  const [links, setLinks] = useState<CommunityLinkDto[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [linkType, setLinkType] = useState<string>(COMMUNITY_LINK_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [consentByLink, setConsentByLink] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [linksData, businessesData] = await Promise.all([
        listMyCommunityLinks(supabase),
        listMyBusinessOptions(supabase),
      ]);
      setLinks(linksData);
      setBusinesses(businessesData);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar vínculos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await requestCommunityLink(supabase, {
      businessId,
      linkType: linkType as (typeof COMMUNITY_LINK_TYPES)[number],
    });
    if (result.ok) {
      setFormSuccess('Vínculo criado em rascunho. Envie-o para análise para entrar na fila de verificação.');
      setBusinessId('');
      setShowRequestForm(false);
      await load();
    } else {
      setFormError(result.error ?? 'Erro ao criar vínculo.');
    }
    setSubmitting(false);
  };

  const handleSubmitForReview = async (linkId: string) => {
    setFormError(null);
    if (consentByLink[linkId] !== true) {
      setFormError(
        'Autorize a publicação dos dados do vínculo (consentimento LGPD destacado) antes de enviar para análise.',
      );
      return;
    }
    const { error: consentError } = await supabase.rpc('upsert_publication_consent', {
      p_link_id: linkId,
      p_visibility_scope: 'authenticated_members',
    });
    if (consentError) {
      setFormError(`Não foi possível registrar o consentimento de publicação: ${consentError.message}`);
      return;
    }
    const result = await submitLinkForReview(supabase, linkId);
    if (result.ok) {
      setConsentByLink((prev) => ({ ...prev, [linkId]: false }));
      await load();
    } else {
      setFormError(result.error ?? 'Erro ao enviar para análise.');
    }
  };

  const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Vínculos comunitários que você declarou e o status da análise.
        </p>
        {!showRequestForm && businesses.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRequestForm(true)}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--text-xs)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Solicitar Novo Vínculo
          </button>
        )}
      </div>

      {formError && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'oklch(0.95 0.05 25 / 0.1)',
            border: '1px solid var(--color-error-500)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error-500)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {formError}
        </div>
      )}
      {formSuccess && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'oklch(0.93 0.06 160 / 0.1)',
            border: '1px solid oklch(0.55 0.12 160)',
            borderRadius: 'var(--radius-md)',
            color: 'oklch(0.4 0.1 160)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {formSuccess}
        </div>
      )}

      {showRequestForm && (
        <form
          onSubmit={(e) => {
            void handleRequest(e);
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
            Solicitar Novo Vínculo
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="business" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
              Empresa
            </label>
            <select id="business" value={businessId} onChange={(e) => setBusinessId(e.target.value)} required style={INPUT_STYLE}>
              <option value="">Selecione uma empresa</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="link-type" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
              Tipo de Vínculo
            </label>
            <select id="link-type" value={linkType} onChange={(e) => setLinkType(e.target.value)} style={INPUT_STYLE}>
              {COMMUNITY_LINK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {COMMUNITY_LINK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: submitting ? 'var(--accent-subtle)' : 'var(--accent)',
              color: 'var(--text-inverse)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--text-sm)',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Criando...' : 'Criar Rascunho'}
          </button>
        </form>
      )}

      {loading && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Carregando vínculos...</p>
      )}
      {!loading && loadError && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error-500)' }}>{loadError}</p>
      )}
      {!loading && !loadError && links.length === 0 && (
        <div style={CARD_STYLE}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Você ainda não possui vínculos comunitários.
          </p>
        </div>
      )}

      {!loading &&
        links.map((link) => (
          <div key={link.id} style={CARD_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
              <div>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                  {link.businessName || 'Empresa'}
                  {link.isPrimary && (
                    <span
                      style={{
                        marginLeft: 'var(--space-2)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--accent)',
                      }}
                    >
                      · Vínculo Principal
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                  {link.linkTypeLabel}
                  {link.organizationName ? ` · ${link.organizationName}` : ''} · desde {formatDate(link.createdAt)}
                </p>
              </div>
              <StatusBadge dto={link} />
            </div>

            {link.status === 'draft' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  alignItems: 'flex-start',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consentByLink[link.id] === true}
                    onChange={(e) =>
                      setConsentByLink((prev) => ({ ...prev, [link.id]: e.target.checked }))
                    }
                    style={{ marginTop: 'var(--space-1)' }}
                  />
                  <span>
                    Autorizo a publicação dos dados deste vínculo maçônico (dado pessoal sensível)
                    para membros autenticados do guia, conforme a Política de Privacidade v1.0.
                    Revogável a qualquer momento.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmitForReview(link.id);
                  }}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--text-xs)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  Enviar para Análise
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}