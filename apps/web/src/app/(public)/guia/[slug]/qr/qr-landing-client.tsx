'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Handshake, MapPin, ShoppingBag, Store } from 'lucide-react';
import { trackQrScanAction } from '@/lib/analytics/analytics-service';
import { captureVisitOrigin } from '@/lib/analytics/visit-origin';
import { createClient } from '@/lib/supabase/client';
import { RegisterConnectionModal } from '@/components/public/business/sections/BusinessConnectionsCard';
import type { ConnectionType } from '@/app/actions/connections';

export function QrLandingClient({ slug, name }: { slug: string; name: string }) {
  const [modalType, setModalType] = useState<ConnectionType | null>(null);

  useEffect(() => {
    captureVisitOrigin('qr');
    void trackQrScanAction(slug);
  }, [slug]);

  // Registrar exige login: visitante sem sessão entra e volta para esta mesma página do QR.
  const openRegister = async (type: ConnectionType) => {
    try {
      const { data } = await createClient().auth.getUser();
      if (!data.user) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/guia/${slug}/qr`)}`;
        return;
      }
    } catch {
      // Sem como checar a sessão: abre o formulário, que valida no servidor.
    }
    setModalType(type);
  };

  const primary = 'flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-xs transition hover:border-[#C9A227]';

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-5 px-4 py-10">
      <header className="text-center">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C9A227]">Conexão Maçônica</span>
        <h1 className="mt-1 font-serif text-2xl font-bold text-[#4B161B]">Você está em {name}</h1>
        <p className="mt-1 text-sm text-stone-600">Registre sua experiência e fortaleça as empresas da família maçônica.</p>
      </header>

      <div className="space-y-3">
        <button type="button" onClick={() => void openRegister('visita')} className={`${primary} w-full`}>
          <MapPin className="h-5 w-5 text-[#C9A227]" aria-hidden />
          <span className="font-semibold text-stone-900">Registrar visita</span>
        </button>
        <button type="button" onClick={() => void openRegister('compra')} className={`${primary} w-full`}>
          <ShoppingBag className="h-5 w-5 text-[#C9A227]" aria-hidden />
          <span className="font-semibold text-stone-900">Registrar compra ou serviço</span>
        </button>
        <Link href={`/guia/${slug}#beneficios`} className={primary}>
          <Gift className="h-5 w-5 text-[#C9A227]" aria-hidden />
          <span className="font-semibold text-stone-900">Ver benefícios</span>
        </Link>
        <Link href={`/guia/${slug}`} className={primary}>
          <Store className="h-5 w-5 text-[#C9A227]" aria-hidden />
          <span className="font-semibold text-stone-900">Conhecer a empresa</span>
        </Link>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
        <Handshake className="h-3.5 w-3.5" aria-hidden /> A empresa confirma o registro antes de aparecer no Mural.
      </p>

      {modalType && (
        <RegisterConnectionModal
          businessSlug={slug}
          defaultType={modalType}
          defaultOrigin="qr_empresa"
          onClose={() => setModalType(null)}
        />
      )}
    </main>
  );
}
