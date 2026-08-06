'use client';

import React, { useState } from 'react';
import { Button, Badge, Card } from '@saas/ui';
import { StatusTimeline } from '../../_components/domain/StatusTimeline';
import { BillingSummary } from '../../_components/domain/BillingSummary';
import { ContractViewer } from '../../_components/domain/ContractViewer';
import { MOCK_PLANS } from '../../_mocks/plans';
import { MOCK_CONTRACTS } from '../../_mocks/contracts';
import { toBillingSummaryViewModel, toContractViewerViewModel } from '../../_types/view-models';

export default function AdvertiserPilotPage() {
  const [advertiserState, setAdvertiserState] = useState<'active' | 'pending' | 'defaulter' | 'suspended'>('active');
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'contract'>('overview');

  const stateBadges = {
    active: { label: 'Conta Ativa & Anúncio Veiculado', tone: 'success' as const },
    pending: { label: 'Aguardando Aprovação de Moderação', tone: 'warning' as const },
    defaulter: { label: 'Inadimplente — Aguardando Pagamento', tone: 'danger' as const },
    suspended: { label: 'Conta Suspensa por violação', tone: 'danger' as const }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
            <span>💼 Piloto 2</span>
            <span>•</span>
            <span>Dashboard & Jornada do Anunciante</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Painel do Anunciante & Gestão Comercial
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Gestão de anúncio, status da conta, faturamento simulado e minuta contratual.
          </p>
        </div>

        {/* State Switcher */}
        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-2">
          <span className="text-slate-400">Estado Simulado:</span>
          {(['active', 'pending', 'defaulter', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setAdvertiserState(st)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                advertiserState === st
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* State Indicator Card */}
      <Card variant="elevated" className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xs text-slate-400 font-mono">Status da Conta do Anunciante</div>
          <div className="text-base font-bold text-white">Oficina Irmãos Unidos Ltda</div>
        </div>
        <Badge variant={stateBadges[advertiserState].tone} size="md">
          {stateBadges[advertiserState].label}
        </Badge>
      </Card>

      {/* Internal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Visão Geral & Linha do Tempo
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'billing' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Faturamento & Planos
        </button>
        <button
          onClick={() => setActiveTab('contract')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'contract' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Contrato & Termo de Adesão
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <StatusTimeline
              steps={[
                { label: 'Cadastro Inicial da Empresa', timestamp: '2026-08-01 10:00', status: 'completed' },
                { label: 'Verificação do Vínculo Fraterno', timestamp: '2026-08-02 14:30', status: 'completed' },
                { label: 'Análise de Moderação Administrativa', timestamp: '2026-08-03 09:15', status: advertiserState === 'pending' ? 'current' : 'completed' },
                { label: 'Assinatura do Contrato de Veiculação', timestamp: '2026-08-04 11:00', status: 'completed' },
                { label: 'Publicação no Guia Comercial', timestamp: '2026-08-05 16:00', status: advertiserState === 'active' ? 'completed' : advertiserState === 'suspended' ? 'error' : 'pending' }
              ]}
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card variant="bordered" className="p-4 space-y-3">
              <div className="text-xs font-bold text-white font-mono">Ações Rápidas do Anunciante</div>
              <Button size="sm" variant="outline" className="w-full justify-start">
                ✏️ Editar Perfil da Empresa
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start">
                🖼️ Atualizar Logotipo & Fotos
              </Button>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="flex justify-center">
          <BillingSummary viewModel={toBillingSummaryViewModel(MOCK_PLANS[0]!)} />
        </div>
      )}

      {activeTab === 'contract' && (
        <div className="flex justify-center">
          <ContractViewer viewModel={toContractViewerViewModel(MOCK_CONTRACTS[0]!)} />
        </div>
      )}
    </div>
  );
}
