'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Loader2,
  Tag,
  X,
} from 'lucide-react';
import { formatBenefitBadgeLabel, type PublicBusinessBenefit } from '@/lib/business/public-business-presentation';
import { redeemBenefitAction } from '@/lib/business/benefit-redemption-service';
import { formatDateBR } from '@/lib/format/datetime-br';
import { BusinessCard, type BusinessCardData } from './BusinessCard';

export interface BenefitDirectoryBusinessItem {
  business_id: string;
  business_name: string;
  business_slug: string;
  primary_category_name?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  is_founder?: boolean;
  is_pedra_fundamental?: boolean;
  card?: BusinessCardData;
  benefits: PublicBusinessBenefit[];
}

type RedemptionCardState = {
  businessName: string;
  benefit: PublicBusinessBenefit;
  code: string;
  expiresAt: string | null;
};

const inPortuguese = (value: string) => value.replace(/\bOFF\b/gi, 'Desconto');
const formatExpiration = (value: string | null | undefined) =>
  value ? formatDateBR(value) : 'Consulte as condições da oferta';

export function BenefitsDirectoryCards({ items }: { items: BenefitDirectoryBusinessItem[] }) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { code?: string; error?: string; expiresAt?: string | null }>>({});
  const [card, setCard] = useState<RedemptionCardState | null>(null);

  const handleRedeem = async (businessName: string, benefit: PublicBusinessBenefit) => {
    if (!benefit.id) return;
    setRedeemingId(benefit.id);
    const result = await redeemBenefitAction(benefit.id, crypto.randomUUID());
    if (!result.success && result.code === 'UNAUTHORIZED') {
      window.location.href = `/login?redirect=${encodeURIComponent('/guia/beneficios')}`;
      return;
    }

    const expiresAt = result.redemption?.expires_at || benefit.validUntil || null;
    setResults((current) => ({
      ...current,
      [benefit.id!]: result.success
        ? { code: result.redemption?.public_code, expiresAt }
        : { error: result.error || 'Não foi possível resgatar este benefício.' },
    }));

    if (result.success && result.redemption?.public_code) {
      setCard({
        businessName,
        benefit,
        code: result.redemption.public_code,
        expiresAt,
      });
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
      await new Promise<void>((resolve, reject) => {
        logo.onload = () => resolve();
        logo.onerror = () => reject();
      });
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
    context.fillText(card.businessName.slice(0, 36), 540, 390);
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
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((biz) => {
          const cardData: BusinessCardData = biz.card ?? {
            id: biz.business_id,
            slug: biz.business_slug,
            name: biz.business_name,
            short_description: biz.description ?? null,
            logo_url: biz.logo_url ?? null,
            cover_url: biz.cover_url ?? null,
            category_name: biz.primary_category_name ?? null,
            city: biz.city ?? null,
            state: biz.state ?? null,
            is_founder: Boolean(biz.is_founder),
            is_pedra_fundamental: Boolean(biz.is_pedra_fundamental),
            has_benefits: true,
          };

          return (
            <article
              key={biz.business_id || biz.business_slug}
              className="flex min-w-0 flex-col gap-2.5"
            >
              <BusinessCard data={cardData} discoverySource="benefits_club" />

              {/* Lista Direta de Benefícios Ativos da Empresa */}
              {biz.benefits.length > 0 && (
                <div className="space-y-2.5">
                  {biz.benefits.map((benefit, index) => {
                    const itemKey = benefit.id || `${biz.business_id}-benefit-${index}`;
                    const result = results[itemKey];
                    return (
                      <div
                        key={itemKey}
                        className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#C9A227]/50 bg-gradient-to-br from-[#4B161B] to-[#2A070E] p-4 text-white shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-[#C9A227]/35 bg-[#C9A227]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#E7C65D]">
                              <Tag className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {formatBenefitBadgeLabel(benefit.badgeText, benefit.benefitType)}
                              </span>
                            </span>

                            {benefit.discountPercentage ? (
                              <span className="inline-flex shrink-0 items-center rounded-lg bg-[#C9A227] px-2.5 py-0.5 text-xs font-black text-stone-950">
                                {benefit.discountPercentage}% Desconto
                              </span>
                            ) : null}
                          </div>

                          <h3 className="font-serif text-sm font-bold leading-snug text-[#F3EEDD] sm:text-base">
                            {inPortuguese(benefit.title)}
                          </h3>

                          {benefit.description && (
                            <p className="text-xs leading-relaxed text-stone-200 line-clamp-3">
                              {inPortuguese(benefit.description)}
                            </p>
                          )}

                          {benefit.externalUrl && (
                            <a
                              href={/^https?:\/\//i.test(benefit.externalUrl) ? benefit.externalUrl : `https://${benefit.externalUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E7C65D] hover:text-white underline underline-offset-4 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span>Acessar link do benefício</span>
                            </a>
                          )}
                        </div>

                        <div className="space-y-2 border-t border-stone-700/60 pt-2.5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[11px] text-stone-300">
                              {result?.code ? `Código: ${result.code}` : 'Código pessoal gerado no resgate'}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                result?.code
                                  ? setCard({
                                    businessName: biz.business_name,
                                    benefit,
                                    code: result.code,
                                    expiresAt: result.expiresAt || benefit.validUntil || null,
                                  })
                                  : handleRedeem(biz.business_name, benefit)
                              }
                              disabled={!benefit.id || redeemingId === itemKey}
                              className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#C9A227] px-3.5 py-2 text-xs font-bold text-stone-950 shadow-sm transition-all hover:bg-[#d8b030] active:bg-[#b89420] disabled:opacity-60 sm:w-auto"
                            >
                              {redeemingId === itemKey ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : result?.code ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : null}
                              <span>
                                {redeemingId === itemKey
                                  ? 'Resgatando...'
                                  : result?.code
                                    ? 'Ver comprovante'
                                    : 'Resgatar benefício'}
                              </span>
                            </button>
                          </div>

                          {result?.error && <p className="text-[11px] text-rose-200">{result.error}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Modal de Comprovante do Benefício Resgatado */}
      {card && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Benefício resgatado"
        >
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="relative border-b-4 border-[#C9A227] bg-gradient-to-br from-[#4B161B] to-[#22070C] p-5 text-center text-white sm:p-6">
              <button
                onClick={() => setCard(null)}
                className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-stone-300 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              <img src="/logoconexao_red.png" alt="Conexão Maçônica" className="mx-auto mb-3 h-14 w-auto object-contain sm:h-16" />
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#E7C65D]">BENEFÍCIO RESGATADO</p>
              <h3 className="mt-2 break-words font-serif text-lg font-bold sm:text-xl">{card.businessName}</h3>
              <p className="mt-2 break-words text-xs text-stone-100 sm:text-sm">{inPortuguese(card.benefit.title)}</p>
              {card.benefit.discountPercentage ? (
                <p className="mt-2 text-xl font-black text-[#E7C65D] sm:text-2xl">{card.benefit.discountPercentage}% Desconto</p>
              ) : null}

              <div className="mt-4 rounded-xl bg-white p-3 text-[#4B161B] sm:mt-5 sm:p-4">
                <p className="text-[10px] font-bold">CÓDIGO DE UTILIZAÇÃO</p>
                <p className="mt-1 break-all font-mono text-xl font-black tracking-wider sm:text-2xl">{card.code}</p>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1 text-xs text-stone-200">
                <CalendarDays className="h-4 w-4 text-[#E7C65D]" />
                Validade: {formatExpiration(card.expiresAt)}
              </p>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <p className="text-xs leading-relaxed text-stone-700 sm:text-sm">
                Salve o comprovante e apresente o código na empresa antes da compra ou da execução do serviço.
              </p>
              <button
                onClick={downloadCard}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4B161B] px-4 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#3B0B14] sm:text-sm"
              >
                <Download className="h-4 w-4 text-[#C9A227]" />
                Baixar Comprovante em PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

