'use client';

import React, { useState } from 'react';
import { Button, Input, Card, Badge } from '@saas/ui';
import { createLeadCaptureAction } from '@/app/actions/lead-capture';

export function LandingLeadCapture() {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityState, setCityState] = useState('');
  const [interestedPlan, setInterestedPlan] = useState<'bronze' | 'prata' | 'ouro' | 'ouro_founder'>('ouro_founder');
  
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const res = await createLeadCaptureAction({
      fullName,
      companyName,
      phone,
      cityState,
      interestedPlan,
    });

    setLoading(false);

    if (!res.success) {
      setStatusMessage({ type: 'error', text: res.error || 'Erro ao enviar cadastro.' });
      return;
    }

    setStatusMessage({
      type: 'success',
      text: 'Solicitação registrada com sucesso! Redirecionando para o WhatsApp...',
    });

    if (res.whatsappUrl) {
      setTimeout(() => {
        window.open(res.whatsappUrl, '_blank');
      }, 1000);
    }
  };

  return (
    <section className="py-20 bg-slate-950 text-white border-t border-slate-800" id="captacao-lead">
      <div className="container mx-auto px-4 max-w-3xl">
        <Card className="p-8 md:p-12 bg-slate-900 border border-[#C9A227]/40 shadow-2xl space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2">
              <Badge variant="warning">CADASTRO DE PRÉ-LANÇAMENTO</Badge>
            </div>
            <h3 className="text-3xl font-extrabold text-white">Faça parte do início</h3>
            <p className="text-sm text-slate-300">
              Preencha os dados da sua empresa para garantir a condição de pré-lançamento e o atendimento prioritário da nossa equipe.
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-4 rounded-lg text-xs font-semibold text-center ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Seu Nome Completo *</label>
                <Input
                  placeholder="Ex: Carlos Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome da Empresa *</label>
                <Input
                  placeholder="Ex: Silva Advocacia e Consultoria"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp / Telefone *</label>
                <Input
                  placeholder="Ex: (75) 99999-8888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cidade / UF *</label>
                <Input
                  placeholder="Ex: Feira de Santana / BA"
                  value={cityState}
                  onChange={(e) => setCityState(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Plano de Interesse Inicial</label>
              <select
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white focus:outline-none focus:border-[#C9A227]"
                value={interestedPlan}
                onChange={(e) => setInterestedPlan(e.target.value as any)}
              >
                <option value="ouro_founder">Plano Ouro Fundador (Oferta Especial de Lançamento)</option>
                <option value="ouro">Plano Ouro (Recursos Completos + Eventos/Posts)</option>
                <option value="prata">Plano Prata (Empresa + Galeria de Fotos)</option>
                <option value="bronze">Plano Bronze (Presença Básica no Guia)</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full py-4 bg-[#C9A227] hover:bg-[#b08c1e] text-[#4B161B] font-extrabold shadow-lg shadow-[#C9A227]/20 rounded-lg text-base mt-4"
              disabled={loading}
            >
              {loading ? 'ENVIANDO SOLICITAÇÃO...' : 'QUERO SER EMPRESA FUNDADORA'}
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-500">
              Conexão Maçônica — Conexões que fortalecem relacionamentos e negócios.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
