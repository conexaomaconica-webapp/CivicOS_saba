'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { saveStepDataAction } from '@/lib/onboarding/onboarding-server-state';

export interface MasonicBondFormProps {
  businessId: string;
  businessName: string;
}

export default function MasonicBondForm({ businessId, businessName }: MasonicBondFormProps) {
  const router = useRouter();

  const [masonicStatus, setMasonicStatus] = useState<'brother' | 'sister' | 'nephew' | 'none'>('brother');
  const [companyRelationship, setCompanyRelationship] = useState<'owner' | 'partner' | 'representative' | 'attorney'>('owner');
  const [cimbCode, setCimbCode] = useState('');
  const [lodgeName, setLodgeName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await saveStepDataAction({
        step: 3,
        businessId,
        data: {
          masonicStatus,
          companyRelationship,
          cimbCode,
          lodgeName,
        },
      });

      if (res.success) {
        router.push('/anunciar/passo-4');
      } else {
        setErrorMsg(res.message || 'Falha ao salvar vínculo.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      {/* SEÇÃO 1: VÍNCULO COM A ORDEM */}
      <div className="space-y-3">
        <label className="text-xs font-serif font-bold text-[#C9A227] uppercase tracking-wider block">
          1. Qual é o seu vínculo com a comunidade?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'brother', label: 'Irmão', desc: 'Membro Regular da Loja' },
            { id: 'sister', label: 'Cunhada', desc: 'Esposa / Viúva de Maçom' },
            { id: 'nephew', label: 'Sobrinho', desc: 'Filho / APJ / DeMolay / Filha de Jó' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMasonicStatus(item.id as any)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${masonicStatus === item.id
                ? 'bg-[#3B0B14] border-[#C9A227] text-white shadow-md'
                : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
            >
              <strong className="block text-sm font-bold">{item.label}</strong>
              <span className="text-[11px] text-stone-400 block mt-0.5">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DETALHES FRATERNOS OPCIONAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="text-xs font-semibold text-stone-300 block mb-1">
            Loja Maçônica / Potência (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: ARLS União Fraterna nº 100"
            value={lodgeName}
            onChange={(e) => setLodgeName(e.target.value)}
            className="w-full p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white outline-none focus:border-[#C9A227]"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-300 block mb-1">
            CIMB / Registro (Opcional)
          </label>
          <input
            type="text"
            placeholder="Código ou número de registro"
            value={cimbCode}
            onChange={(e) => setCimbCode(e.target.value)}
            className="w-full p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white outline-none focus:border-[#C9A227]"
          />
        </div>
      </div>

      {/* SEÇÃO 2: RELAÇÃO COM A EMPRESA */}
      <div className="space-y-3 pt-4 border-t border-stone-800/80">
        <label className="text-xs font-serif font-bold text-[#C9A227] uppercase tracking-wider block">
          2. Qual é sua relação com a empresa <strong className="text-white font-sans">{businessName}</strong>?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'owner', label: 'Proprietário' },
            { id: 'partner', label: 'Sócio' },
            { id: 'representative', label: 'Representante' },
            { id: 'attorney', label: 'Procurador' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCompanyRelationship(item.id as any)}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${companyRelationship === item.id
                ? 'bg-[#3B0B14] border-[#C9A227] text-white shadow-xs'
                : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* NOTA PRIVACIDADE & COMPROVAÇÃO DE VÍNCULO */}
      <div className="p-4 bg-[#3B0B14]/40 border border-[#C9A227]/30 rounded-2xl text-xs text-stone-300 space-y-1">
        <div className="flex items-center gap-2 font-bold text-[#C9A227]">
          <ShieldCheck className="w-4 h-4" /> Privacidade & Validação de Rede
        </div>
        <p>
          A comprovação do vínculo é usada para validação da participação na rede fraterna. Seu nome somente será exibido publicamente se você autorizar no seu painel.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* BOTÃO SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-2xl bg-[#C9A227] hover:bg-[#D9B237] text-[#1f0509] font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Registrando vínculo...</span>
          </>
        ) : (
          <>
            <span>Salvar e Escolher Plano</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
