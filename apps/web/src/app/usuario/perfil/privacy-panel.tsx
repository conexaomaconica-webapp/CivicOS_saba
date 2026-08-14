'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  listMyAcceptances,
  listMyConsents,
  exportPersonalData,
  revokeMyConsent,
  requestAccountDeletion,
  CONSENT_PURPOSE_LABELS,
  type AcceptanceDto,
  type ConsentDto,
} from '@/lib/privacy/privacy-service';

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

const INPUT_STYLE = {
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
} as const;

const BUTTON_PRIMARY = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--accent)',
  color: 'var(--text-inverse)',
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--text-xs)',
  border: 'none',
  cursor: 'pointer',
} as const;

const BUTTON_SECONDARY = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--text-xs)',
  border: '1px solid var(--border-default)',
  cursor: 'pointer',
} as const;

function ErrorBanner({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  );
}

export default function PrivacyPanel() {
  const supabase = createClient();
  const router = useRouter();

  const [acceptances, setAcceptances] = useState<AcceptanceDto[]>([]);
  const [consents, setConsents] = useState<ConsentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeSuccess, setRevokeSuccess] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [acceptancesData, consentsData] = await Promise.all([
        listMyAcceptances(supabase),
        listMyConsents(supabase),
      ]);
      setAcceptances(acceptancesData);
      setConsents(consentsData);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar seus dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(null);
    const result = await exportPersonalData(supabase);
    if (!result.ok || !result.data) {
      setExportError(result.error ?? 'Não foi possível exportar seus dados.');
      setExporting(false);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `meus-dados-cm-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportSuccess('Exportação concluída. O arquivo JSON foi baixado.');
    setExporting(false);
  };

  const handleRevoke = async (consentId: string) => {
    setRevokingId(consentId);
    setRevokeError(null);
    setRevokeSuccess(null);
    const result = await revokeMyConsent(supabase, consentId, revokeReason);
    if (!result.ok) {
      setRevokeError(result.error ?? 'Não foi possível revogar o consentimento.');
    } else {
      setRevokeSuccess('Consentimento revogado. Vínculos maçônicos foram removidos da vitrine pública.');
    }
    setRevokeTarget(null);
    setRevokeReason('');
    setRevokingId(null);
    await load();
  };

  const handleDelete = async () => {
    if (confirmText !== 'EXCLUIR') return;
    setDeleting(true);
    setDeleteError(null);
    const result = await requestAccountDeletion(supabase);
    if (!result.ok) {
      setDeleteError(result.error ?? 'Não foi possível solicitar a exclusão da conta.');
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

  return (
    <div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
        Seus direitos como titular de dados (LGPD — art. 18): exportar seus dados,
        revogar consentimentos opcionais e solicitar a exclusão da conta.
      </p>

      {exportError && <ErrorBanner message={exportError} />}
      {exportSuccess && <SuccessBanner message={exportSuccess} />}

      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
          Exportar meus dados (portabilidade)
        </h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Baixe um arquivo JSON com seus dados pessoais: perfil, aceites de termos,
          consentimentos, afiliação maçônica, vínculos e anúncios.
        </p>
        <button
          type="button"
          onClick={() => {
            void handleExport();
          }}
          disabled={exporting}
          style={{ ...BUTTON_PRIMARY, alignSelf: 'flex-start', opacity: exporting ? 0.6 : 1, cursor: exporting ? 'not-allowed' : 'pointer' }}
        >
          {exporting ? 'Gerando...' : 'Exportar dados (JSON)'}
        </button>
      </div>

      {revokeError && <ErrorBanner message={revokeError} />}
      {revokeSuccess && <SuccessBanner message={revokeSuccess} />}

      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
          Consentimentos
        </h3>
        {loading && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Carregando...</p>
        )}
        {!loading && loadError && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error-500)' }}>{loadError}</p>
        )}
        {!loading && !loadError && consents.length === 0 && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Nenhum consentimento registrado.
          </p>
        )}
        {!loading &&
          consents.map((consent) => (
            <div
              key={consent.consent_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                  {CONSENT_PURPOSE_LABELS[consent.purpose] ?? consent.purpose}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {consent.granted ? 'Ativo' : 'Revogado'} · desde {formatDate(consent.created_at)}
                  {consent.withdrawn_at ? ` · revogado em ${formatDate(consent.withdrawn_at)}` : ''}
                  {consent.doc_version ? ` · Política v${consent.doc_version}` : ''}
                </p>
              </div>
              {consent.granted && revokeTarget !== consent.consent_id && (
                <button
                  type="button"
                  onClick={() => setRevokeTarget(consent.consent_id)}
                  disabled={revokingId !== null}
                  style={BUTTON_SECONDARY}
                >
                  Revogar
                </button>
              )}
              {consent.granted && revokeTarget === consent.consent_id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                  <input
                    type="text"
                    placeholder="Motivo (opcional)"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    style={INPUT_STYLE}
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(null)}
                      disabled={revokingId !== null}
                      style={BUTTON_SECONDARY}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRevoke(consent.consent_id);
                      }}
                      disabled={revokingId !== null}
                      style={{ ...BUTTON_PRIMARY, backgroundColor: 'var(--color-error-500)' }}
                    >
                      {revokingId === consent.consent_id ? 'Revogando...' : 'Confirmar revogação'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      <div style={CARD_STYLE}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
          Aceites legais
        </h3>
        {loading && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Carregando...</p>
        )}
        {!loading && !loadError && acceptances.length === 0 && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Nenhum aceite registrado.
          </p>
        )}
        {!loading &&
          acceptances.map((acceptance) => (
            <div
              key={`${acceptance.code}-${acceptance.version}-${acceptance.accepted_at}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                {acceptance.code} · v{acceptance.version}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Aceito em {formatDate(acceptance.accepted_at)}
                {acceptance.content_hash
                  ? ` · hash ${acceptance.content_hash.slice(0, 12)}…`
                  : ''}
              </p>
            </div>
          ))}
      </div>

      {deleteError && <ErrorBanner message={deleteError} />}

      <div style={{ ...CARD_STYLE, border: '1px solid var(--color-error-500)' }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-error-500)' }}>
          Excluir minha conta
        </h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Revoga seus consentimentos, remove sua afiliação maçônica e dados sensíveis,
          tira seus anúncios da vitrine e marca a conta para exclusão. A exclusão é
          bloqueada enquanto houver pagamentos ou reservas pendentes.
        </p>
        <input
          type="text"
          placeholder='Digite EXCLUIR para confirmar'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          style={INPUT_STYLE}
        />
        <button
          type="button"
          onClick={() => {
            void handleDelete();
          }}
          disabled={confirmText !== 'EXCLUIR' || deleting}
          style={{
            ...BUTTON_PRIMARY,
            backgroundColor: 'var(--color-error-500)',
            alignSelf: 'flex-start',
            opacity: confirmText !== 'EXCLUIR' || deleting ? 0.5 : 1,
            cursor: confirmText !== 'EXCLUIR' || deleting ? 'not-allowed' : 'pointer',
          }}
        >
          {deleting ? 'Excluindo...' : 'Solicitar exclusão da conta'}
        </button>
      </div>
    </div>
  );
}