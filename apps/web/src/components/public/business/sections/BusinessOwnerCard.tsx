'use client';

import React, { useState } from 'react';
import { UserCheck, Building2, ZoomIn, ShieldCheck, MessageCircle, Users } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { ImageZoomModal } from '../shared/ImageZoomModal';

import { resolveTreatmentLabel, resolveResponsibleGender } from '@/lib/business/responsible-role-resolver';

type BusinessOwnerCardProps = {
  owner: PublicBusinessPresentation['owner'];
  logo?: PublicBusinessPresentation['identity']['logo'];
  businessName?: string;
  className?: string;
  isVerified?: boolean;
};

export function BusinessOwnerCard({
  owner,
  logo,
  businessName = 'Empresa',
  className = '',
  isVerified = false,
}: BusinessOwnerCardProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (!owner) return null;

  const hasOwnerPhoto = Boolean(owner.avatar?.url);
  const isUsingLogoFallback = !hasOwnerPhoto && Boolean(logo?.url);

  // 1. Foto do responsável enviada no Prontuário 360 -> 2. Avatar elegante de iniciais
  const avatarUrl =
    owner.avatar?.url ||
    logo?.url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.name || businessName)}&background=4B161B&color=F3EEDD`;

  const treatmentLabel = resolveTreatmentLabel({
    communityLabel: owner.communityLabel,
    eligibilityType: owner.eligibilityType,
    familyRelationship: owner.familyRelationship,
  });
  const isCunhada = treatmentLabel === 'Cunhada';
  const isSobrinha = treatmentLabel === 'Sobrinha';
  const isSobrinho = treatmentLabel === 'Sobrinho';
  const isFamilyOrSpouse = isCunhada || isSobrinha || isSobrinho;

  const gender = resolveResponsibleGender({
    communityLabel: owner.communityLabel,
    eligibilityType: owner.eligibilityType,
    familyRelationship: owner.familyRelationship,
  });
  const defaultProp = gender === 'feminino' ? 'Proprietária' : 'Proprietário';
  const roleDisplay = owner.businessRole || defaultProp;

  const displayName = `${treatmentLabel ? `${treatmentLabel} ` : ''}${owner.name}`;

  const kinshipText = isCunhada
    ? (owner.referenceMasonName ? `Cônjuge do Ir∴ ${owner.referenceMasonName}` : 'Cônjuge de Irmão Maçom')
    : isSobrinha
      ? (owner.referenceMasonName ? `${owner.familyRelationship ? `${owner.familyRelationship} do` : 'Filha do'} Ir∴ ${owner.referenceMasonName}` : 'Familiar de Irmão Maçom')
      : isSobrinho
        ? (owner.referenceMasonName ? `${owner.familyRelationship ? `${owner.familyRelationship} do` : 'Filho do'} Ir∴ ${owner.referenceMasonName}` : 'Familiar de Irmão Maçom')
        : null;

  const whatsappDigits = owner.whatsapp?.replace(/\D/g, '') || '';
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá, ${owner.name}! Encontrei seu perfil no Guia Conexão Maçônica.`)}`
    : null;

  return (
    <>
      <section className={`p-4 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs relative overflow-hidden space-y-3 ${className}`}>
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <h3 className="font-serif font-bold text-sm text-[#4B161B] tracking-tight flex items-center gap-1.5">
            <span>Responsável</span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Verificado</span>
              </span>
            )}
          </h3>
          <UserCheck className="w-4 h-4 text-[#C9A227]" />
        </div>

        <div className="flex items-center gap-3.5 pt-1">
          {/* Avatar com acionador de Zoom */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            title="Clique para ampliar a foto do representante"
            style={isUsingLogoFallback && logo?.backgroundColor ? { backgroundColor: logo.backgroundColor } : undefined}
            className="w-16 h-16 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] overflow-hidden shrink-0 shadow-xs relative flex items-center justify-center p-0.5 group cursor-pointer transition-transform hover:scale-105 hover:border-[#C9A227]"
          >
            <img
              src={avatarUrl}
              alt={owner.name || businessName}
              className="w-full h-full object-cover rounded-lg transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.name || businessName)}&background=4B161B&color=F3EEDD`;
              }}
            />

            {/* Icone Hover Zoom */}
            <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-2xs">
              <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
            </div>

            {isUsingLogoFallback && (
              <span className="absolute bottom-0 inset-x-0 bg-stone-900/85 text-[8px] font-bold text-[#F3EEDD] text-center py-0.5 uppercase tracking-wider backdrop-blur-2xs">
                Empresa
              </span>
            )}
          </button>

          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="font-serif font-bold text-base text-stone-900 leading-snug truncate">
              {owner.name}
            </h4>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#3B0B14]/10 text-[#3B0B14] font-bold text-[11px] border border-[#3B0B14]/20">
                {treatmentLabel}
              </span>
              {roleDisplay && (
                <span className="text-xs text-stone-600 font-medium">
                  · {roleDisplay}
                </span>
              )}
            </div>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-800 hover:underline pt-0.5"
                aria-label={`Falar diretamente com ${owner.name} pelo WhatsApp`}
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">WhatsApp: {owner.whatsapp}</span>
              </a>
            )}
          </div>
        </div>

        {/* Vínculo Maçônico Auditável (Cunhada ou Sobrinho(a)) */}
        {isFamilyOrSpouse && (
          <div className="text-xs bg-[#FDFBF7] border border-[#E8E5DF] rounded-xl p-2.5 text-stone-800 flex items-start gap-2 shadow-2xs">
            <Users className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-stone-600">Vínculo maçônico: </span>
              <strong className="text-[#3B0B14] font-bold">{kinshipText}</strong>
            </div>
          </div>
        )}

        {owner.organization && (
          <div className="text-xs text-stone-700 bg-[#FDFBF7] border border-[#E8E5DF] p-2.5 rounded-xl flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C9A227] shrink-0" />
            <span className="truncate">
              Loja: <strong className="text-[#4B161B] font-bold">{owner.organization}</strong>
            </span>
          </div>
        )}

        {/* Marca d'água sutil ornamental */}
        <div className="absolute bottom-2 right-2 opacity-10 pointer-events-none">
          <svg className="w-10 h-10 text-[#C9A227]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2zm0 4.5L18.5 20h-13L12 6.5z" />
          </svg>
        </div>
      </section>

      {/* Modal de Zoom da Foto do Representante */}
      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        imageUrl={avatarUrl}
        altText={`Foto de ${owner.name}`}
        title={`${displayName}${roleDisplay ? ` - ${roleDisplay}` : ''}`}
        badge={`Loja Maçônica: ${owner.organization}`}
        backgroundColor={isUsingLogoFallback ? logo?.backgroundColor : undefined}
      />
    </>
  );
}
