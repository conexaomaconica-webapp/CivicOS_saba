'use client';

import React, { useState } from 'react';
import { CalendarDays, Check, Download, Loader2, Sparkles, Tag, X } from 'lucide-react';
import type { PublicBusinessBenefit } from '@/lib/business/public-business-presentation';
import { redeemBenefitAction } from '@/lib/business/benefit-redemption-service';

type BusinessBenefitsProps = {
  benefits: PublicBusinessBenefit[];
  businessName: string;
  className?: string;
};

type RedemptionCard = {
  benefit: PublicBusinessBenefit;
  code: string;
  expiresAt: string | null;
};

const inPortuguese = (value: string) => value.replace(/\bOFF\b/gi, 'Desconto');
const formatExpiration = (value: string | null | undefined) => value
  ? new Date(value).toLocaleDateString('pt-BR')
  : 'Consulte as condições da oferta';

export function BusinessBenefits({ benefits, businessName, className = '' }: BusinessBenefitsProps) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { code?: string; error?: string }>>({});
  const [card, setCard] = useState<RedemptionCard | null>(null);

  if (!benefits?.length) return null;

  const handleRedeem = async (benefit: PublicBusinessBenefit) => {
    if (!benefit.id) return;
    setRedeemingId(benefit.id);
    const result = await redeemBenefitAction(benefit.id, crypto.randomUUID());
    if (!result.success && result.error?.startsWith('UNAUTHORIZED')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setResults((current) => ({
      ...current,
      [benefit.id!]: result.success
        ? { code: result.redemption?.public_code }
        : { error: result.error || 'Não foi possível resgatar este benefício.' },
    }));
    if (result.success && result.redemption?.public_code) {
      setCard({ benefit, code: result.redemption.public_code, expiresAt: result.redemption.expires_at || benefit.validUntil || null });
    }
    setRedeemingId(null);
  };

  const downloadCard = async () => {
    if (!card) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, '#4B161B');
    gradient.addColorStop(1, '#22070C');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#C9A227';
    context.lineWidth = 8;
    context.strokeRect(42, 42, 996, 1266);

    try {
      const logo = new Image();
      logo.src = '/logoconexao_red.png';
      await new Promise<void>((resolve, reject) => { logo.onload = () => resolve(); logo.onerror = () => reject(); });
      context.drawImage(logo, 390, 90, 300, 150);
    } catch {
      context.fillStyle = '#E7C65D';
      context.font = 'bold 40px Georgia';
      context.textAlign = 'center';
      context.fillText('CONEXÃO MAÇÔNICA', 540, 160);
    }

    context.textAlign = 'center';
    context.fillStyle = '#E7C65D';
    context.font = 'bold 34px Arial';
    context.fillText('BENEFÍCIO RESGATADO', 540, 300);
    context.fillStyle = '#FFFFFF';
    context.font = 'bold 50px Georgia';
    context.fillText(businessName.slice(0, 36), 540, 390);
    context.font = 'bold 42px Arial';
    context.fillStyle = '#F3EEDD';
    context.fillText(inPortuguese(card.benefit.title).slice(0, 42), 540, 500);
    if (card.benefit.discountPercentage) {
      context.fillStyle = '#E7C65D';
      context.font = 'bold 60px Arial';
      context.fillText(`${card.benefit.discountPercentage}% Desconto`, 540, 600);
    }
    context.fillStyle = '#FFFFFF';
    context.font = '26px Arial';
    context.fillText(inPortuguese(card.benefit.description).slice(0, 70), 540, 690);
    context.fillStyle = '#FDFBF7';
    context.fillRect(145, 760, 790, 220);
    context.fillStyle = '#4B161B';
    context.font = 'bold 28px Arial';
    context.fillText('CÓDIGO DE UTILIZAÇÃO', 540, 825);
    context.font = 'bold 68px monospace';
    context.fillText(card.code, 540, 925);
    context.fillStyle = '#E7C65D';
    context.font = 'bold 28px Arial';
    context.fillText(`Validade: ${formatExpiration(card.expiresAt)}`, 540, 1060);
    context.fillStyle = '#F3EEDD';
    context.font = '24px Arial';
    context.fillText('Apresente este código no estabelecimento.', 540, 1150);
    context.fillText('Uso pessoal e sujeito às condições da oferta.', 540, 1190);

    const link = document.createElement('a');
    link.download = `beneficio-${card.code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <section className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5"><Sparkles className="w-5 h-5 text-[#C9A227]" /><h2 className="text-base font-serif font-bold text-[#4B161B]">Benefícios e Ofertas</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benefits.map((benefit, index) => {
          const itemKey = benefit.id || `benefit-${index}`;
          const result = results[itemKey];
          return (
            <div key={itemKey} className="p-4 rounded-2xl bg-gradient-to-br from-[#4B161B] to-[#2A070E] text-white border border-[#C9A227]/50 shadow-md space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/30"><Tag className="w-3 h-3" />{inPortuguese(benefit.badgeText || benefit.benefitType || 'Oferta Exclusiva')}</span><h3 className="font-serif font-bold text-base text-[#F3EEDD]">{inPortuguese(benefit.title)}</h3></div>
                {benefit.discountPercentage ? <div className="px-3 py-1.5 rounded-xl bg-[#C9A227] text-stone-950 font-black text-lg shrink-0">{benefit.discountPercentage}% Desconto</div> : null}
              </div>
              <p className="text-xs text-stone-200 leading-relaxed">{inPortuguese(benefit.description)}</p>
              <div className="pt-2 space-y-2 border-t border-stone-700/60">
                <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-stone-300">{result?.code ? `Código: ${result.code}` : 'Código pessoal gerado no resgate'}</span><button type="button" onClick={() => result?.code ? setCard({ benefit, code: result.code, expiresAt: benefit.validUntil || null }) : handleRedeem(benefit)} disabled={!benefit.id || redeemingId === itemKey} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A227] disabled:opacity-60 text-stone-950 text-xs font-bold">{redeemingId === itemKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : result?.code ? <Check className="w-3.5 h-3.5" /> : null}<span>{redeemingId === itemKey ? 'Resgatando...' : result?.code ? 'Ver comprovante' : 'Resgatar benefício'}</span></button></div>
                {result?.error && <p className="text-[11px] text-rose-200">{result.error}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {card && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Benefício resgatado">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="relative bg-gradient-to-br from-[#4B161B] to-[#22070C] p-6 text-center text-white border-b-4 border-[#C9A227]">
              <button onClick={() => setCard(null)} className="absolute right-3 top-3 rounded-full bg-white/10 p-2" aria-label="Fechar"><X className="h-4 w-4" /></button>
              <img src="/logoconexao_red.png" alt="Conexão Maçônica" className="mx-auto mb-3 h-16 w-auto object-contain" />
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#E7C65D]">BENEFÍCIO RESGATADO</p>
              <h3 className="mt-2 font-serif text-xl font-bold">{businessName}</h3>
              <p className="mt-2 text-sm text-stone-100">{inPortuguese(card.benefit.title)}</p>
              {card.benefit.discountPercentage ? <p className="mt-2 text-2xl font-black text-[#E7C65D]">{card.benefit.discountPercentage}% Desconto</p> : null}
              <div className="mt-5 rounded-xl bg-white p-4 text-[#4B161B]"><p className="text-[10px] font-bold">CÓDIGO DE UTILIZAÇÃO</p><p className="mt-1 font-mono text-2xl font-black tracking-wider">{card.code}</p></div>
              <p className="mt-3 flex items-center justify-center gap-1 text-xs"><CalendarDays className="h-4 w-4" />Validade: {formatExpiration(card.expiresAt)}</p>
            </div>
            <div className="space-y-4 p-5"><p className="text-sm text-stone-700">Salve o comprovante e apresente o código na empresa antes da compra ou da execução do serviço.</p><button onClick={downloadCard} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4B161B] px-4 py-3 text-sm font-bold text-white"><Download className="h-4 w-4" />Baixar comprovante em PNG</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
