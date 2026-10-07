'use client';

import { Heart, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useBusinessAnalytics } from '@/components/public/business/BusinessContactTracker';

export function BusinessShareActions({ businessName }: { businessName: string }) {
  const [copied, setCopied] = useState(false);
  const analytics = useBusinessAnalytics();

  async function share() {
    analytics?.track('share_business');
    const data = { title: businessName, url: window.location.href };
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="cm-bronze-share" aria-label="Ações da empresa">
      <button type="button" disabled title="Entre na plataforma para favoritar"><Heart /> Favoritar</button>
      <button type="button" onClick={() => { void share().catch(() => undefined); }}><Share2 /> {copied ? 'Link copiado' : 'Compartilhar'}</button>
    </div>
  );
}
