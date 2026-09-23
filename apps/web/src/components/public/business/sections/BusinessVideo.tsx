'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';

type VideoSource = {
  embedUrl: string | null;
  thumbnailUrl: string | null;
};

function resolveVideoSource(url: string): VideoSource {
  try {
    const parsed = new URL(url);
    let youtubeId: string | null = null;

    if (parsed.hostname === 'youtu.be') youtubeId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    if (parsed.hostname === 'youtube.com' || parsed.hostname.endsWith('.youtube.com')) {
      youtubeId = parsed.searchParams.get('v')
        ?? (parsed.pathname.startsWith('/shorts/') ? parsed.pathname.split('/')[2] ?? null : null)
        ?? (parsed.pathname.startsWith('/embed/') ? parsed.pathname.split('/')[2] ?? null : null);
    }

    if (youtubeId) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`,
        thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      };
    }

    if (parsed.hostname === 'vimeo.com' || parsed.hostname.endsWith('.vimeo.com')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const vimeoId = pathParts.find((part) => /^\d+$/.test(part)) ?? null;
      return {
        embedUrl: vimeoId ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1` : null,
        thumbnailUrl: null,
      };
    }
  } catch {}

  return { embedUrl: null, thumbnailUrl: null };
}

export function BusinessVideo({ video }: { video: PublicMediaAsset | null }) {
  const [shouldLoadPlayer, setShouldLoadPlayer] = useState(false);
  if (!video) return null;

  const source = resolveVideoSource(video.url);
  const title = video.alt || 'Vídeo institucional';

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#C9A227]/40 bg-white shadow-sm">
      <h2 className="border-b border-stone-200 px-5 py-4 font-serif text-lg font-bold text-stone-900">
        Vídeo institucional
      </h2>
      <div className="aspect-video bg-black">
        {!shouldLoadPlayer ? (
          <button
            type="button"
            onClick={() => setShouldLoadPlayer(true)}
            className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-stone-950 text-white"
            aria-label={`Reproduzir ${title}`}
          >
            {source.thumbnailUrl && (
              <img
                src={source.thumbnailUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            )}
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-[#4B161B]/95 shadow-2xl transition-transform group-hover:scale-110">
              <Play className="ml-1 h-7 w-7 fill-current" />
            </span>
          </button>
        ) : source.embedUrl ? (
          <iframe
            src={source.embedUrl}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={video.url}
            title={title}
            className="h-full w-full"
            controls
            autoPlay
            playsInline
            preload="none"
          />
        )}
      </div>
    </section>
  );
}
