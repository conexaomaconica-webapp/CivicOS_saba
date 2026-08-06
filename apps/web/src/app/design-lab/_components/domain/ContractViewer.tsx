'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from '@saas/ui';
import { ContractViewerViewModel } from '../../_types/view-models';

export interface ContractViewerProps {
  viewModel: ContractViewerViewModel;
  onAcceptTerms?: () => void;
}

export function ContractViewer({ viewModel, onAcceptTerms }: ContractViewerProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 30) {
      setHasScrolledToEnd(true);
    }
  };

  return (
    <Card variant="bordered" className="max-w-xl w-full space-y-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{viewModel.documentTitle}</CardTitle>
          <Badge variant={viewModel.statusTone} size="sm">
            {viewModel.statusLabel}
          </Badge>
        </div>
        <CardDescription>Plano de Veiculação: {viewModel.planName}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mandatory Legal Simulation Watermark Banner */}
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 font-mono text-center font-bold">
          📜 DOCUMENTO SIMULADO — SEM VALIDADE JURÍDICA
        </div>

        {/* Scrollable Terms Text Container */}
        <div
          onScroll={handleScroll}
          className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto space-y-3 font-sans"
        >
          {viewModel.termsContent.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            disabled={!hasScrolledToEnd}
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
          />
          <span>Li e aceito os termos da minuta simulada</span>
        </label>
      </CardContent>

      <CardFooter>
        <span className="text-[11px] text-slate-400 font-mono">
          {!hasScrolledToEnd ? 'Role até o fim para liberar' : 'Termos lidos'}
        </span>
        <Button
          size="sm"
          variant="primary"
          disabled={!accepted}
          onClick={onAcceptTerms}
        >
          Assinar Termo
        </Button>
      </CardFooter>
    </Card>
  );
}
