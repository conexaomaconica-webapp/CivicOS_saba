import React from 'react';
import { getApprovalDossierAction } from '@/lib/admin/admin-approval-service';
import ApprovalDossierClient from './approval-dossier-client';

export const metadata = {
  title: 'Dossiê 360º de Aprovação — Admin | Conexão Maçônica',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminApprovalDossierPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getApprovalDossierAction(id);

  if (!result.success || !result.dossier) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200">
          <h2 className="text-lg font-bold mb-2">Erro ao carregar Dossiê</h2>
          <p>{result.error || 'Cadastro não encontrado.'}</p>
        </div>
      </div>
    );
  }

  return <ApprovalDossierClient initialDossier={result.dossier} />;
}
