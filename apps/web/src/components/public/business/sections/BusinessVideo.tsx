import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';

function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname === 'youtube.com' || parsed.hostname.endsWith('.youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname === 'vimeo.com' || parsed.hostname.endsWith('.vimeo.com')) return `https://player.vimeo.com/video/${parsed.pathname.split('/').filter(Boolean)[0]}`;
  } catch {}
  return null;
}

export function BusinessVideo({ video }: { video: PublicMediaAsset | null }) {
  if (!video) return null;
  const src = getEmbedUrl(video.url);
  if (!src) return null;
  return <section className="mb-6 overflow-hidden rounded-2xl border border-[#C9A227]/40 bg-white shadow-sm"><h2 className="border-b border-stone-200 px-5 py-4 font-serif text-lg font-bold text-stone-900">Vídeo institucional</h2><div className="aspect-video bg-black"><iframe src={src} title={video.alt || 'Vídeo institucional'} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>;
}
