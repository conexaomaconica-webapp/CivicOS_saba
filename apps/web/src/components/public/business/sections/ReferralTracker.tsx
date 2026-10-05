'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureVisitorKey } from '@/lib/referrals/visitor-client';
import { linkReferralsAction, recordReferralVisitAction } from '@/app/actions/referrals';

/**
 * Não mostra nada. Na página de uma empresa:
 *  - se a URL tem ?ref=CODIGO, registra a indicação (uma vez por pessoa e empresa);
 *  - se a pessoa está logada, liga este navegador à conta, para o funil acompanhar benefício e conexão.
 */
export function ReferralTracker({ businessSlug }: { businessSlug: string }) {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const visitorKey = ensureVisitorKey();
      if (!visitorKey) return;

      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) {
        // Evita repetir a chamada ao recarregar a página na mesma sessão.
        const flag = `cm_ref_${businessSlug}_${ref}`;
        let done = false;
        try {
          done = sessionStorage.getItem(flag) === '1';
          if (!done) sessionStorage.setItem(flag, '1');
        } catch {}
        if (!done) await recordReferralVisitAction({ businessSlug, code: ref, visitorKey });
      }

      if (cancelled) return;
      const { data } = await createClient().auth.getUser();
      if (data.user) await linkReferralsAction(visitorKey);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [businessSlug]);

  return null;
}
