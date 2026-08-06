import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from '@saas/ui';
import { BillingSummaryViewModel } from '../../_types/view-models';

export interface BillingSummaryViewProps {
  viewModel: BillingSummaryViewModel;
  onSimulateCheckout?: () => void;
}

export function BillingSummaryView({ viewModel, onSimulateCheckout }: BillingSummaryViewProps) {
  return (
    <Card variant="bordered" className="max-w-md w-full space-y-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{viewModel.planName}</CardTitle>
          <Badge variant="accent">{viewModel.billingModelLabel}</Badge>
        </div>
        <CardDescription>Código do Plano: {viewModel.planCode}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-mono">Valor do Ciclo Simulado</div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">{viewModel.priceFormatted}</div>
        </div>

        <ul className="space-y-2 text-xs text-slate-300">
          {viewModel.features.map((ft) => (
            <li key={ft} className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> {ft}
            </li>
          ))}
        </ul>

        {/* Mandatory Simulation Watermark Banner */}
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-mono text-center font-bold">
          ⚠️ CHECKOUT SIMULADO — NENHUMA COBRANÇA SERÁ REALIZADA
        </div>
      </CardContent>

      <CardFooter>
        <span className="text-xs text-slate-400 font-mono">Simulador Faturamento</span>
        <Button size="sm" variant="primary" onClick={onSimulateCheckout}>
          Simular Checkout
        </Button>
      </CardFooter>
    </Card>
  );
}

export { BillingSummaryView as BillingSummary };
