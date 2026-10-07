'use client';

import { Heart, Share2 } from 'lucide-react';
import { useState } from 'react';
import { businessSlugFromPath, trackGaEvent } from '@/lib/analytics/ga-events';

export function BusinessShareActions({ businessName }: { businessName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const slug = businessSlugFromPath(window.location.pathname);
    if (slug) trackGaEvent({ name: 'share_business', params: { business_slug: slug } });
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
