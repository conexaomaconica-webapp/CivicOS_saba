import React from 'react';
import { PageSkeleton } from '@/components/ui-states/PageSkeleton';
import { EmptyState } from '@/components/ui-states/EmptyState';
import { PermissionDenied } from '@/components/ui-states/PermissionDenied';
import { MaintenanceNotice } from '@/components/ui-states/MaintenanceNotice';

const SECTION_STYLE = {
  padding: 'var(--space-5)',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
} as const;

export default function DesignLabAuxPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Estados Auxiliares de Interface
        </h2>
        <p className="text-sm text-slate-400">
          AUX-001 a AUX-006 · CRIT-TRN-022 — componentes obrigatórios de loading, empty, 404, 500, 403 e manutenção (tokens de tema, acessíveis).
        </p>
      </div>

      <section style={SECTION_STYLE}>
        <h3 className="text-sm font-bold text-slate-300 mb-3">AUX-001 · Skeleton (Loading)</h3>
        <PageSkeleton title sections={2} rows={2} />
      </section>

      <section style={SECTION_STYLE}>
        <h3 className="text-sm font-bold text-slate-300 mb-3">AUX-002 · Estado Vazio (Lista sem resultados)</h3>
        <EmptyState
          title="Nenhum resultado encontrado"
          description="Ajuste os filtros ou tente uma nova busca para encontrar empresas na comunidade."
          icon="🔍"
          actionLabel="Limpar filtros"
        />
      </section>

      <section style={SECTION_STYLE}>
        <h3 className="text-sm font-bold text-slate-300 mb-3">AUX-003 · 404 — Conteúdo não encontrado</h3>
        <EmptyState
          title="Conteúdo não encontrado"
          description="A página que você procura não existe ou foi movida."
          icon="?"
        />
      </section>

      <section style={SECTION_STYLE}>
        <h3 className="text-sm font-bold text-slate-300 mb-3">AUX-004 · 500 — Falha de comunicação</h3>
        <EmptyState
          title="Algo deu errado"
          description="Não foi possível concluir a operação. Tente novamente em instantes."
          icon="!"
        />
      </section>

      <section style={SECTION_STYLE}>
        <h3 className="text-sm font-bold text-slate-300 mb-3">AUX-005 · 403 — Bloqueio de permissão</h3>
        <div className="rounded-lg overflow-hidden">
          <PermissionDenied requiredPermission="business:moderate" description="Seu perfil não permite moderar empresas deste tenant." />
        </div>
      </section>

      <section style={SECTION_STYLE}>
        <h3 className="text-sm font-bold text-slate-300 mb-3">AUX-006 · Manutenção programada</h3>
        <div className="rounded-lg overflow-hidden">
          <MaintenanceNotice estimatedReturn="19h00" />
        </div>
      </section>
    </div>
  );
}
