/**
 * Classificador e resolvedor de URLs de vídeos institucionais para Mobile (iOS WKWebView & Android WebView).
 *
 * Resolve incompatibilidade de links do YouTube (watch, youtu.be, shorts, embed) que não podem ser
 * reproduzidos diretamente na tag HTML5 <video src="...">, convertendo-os para embed seguro
 * (youtube-nocookie.com/embed/{id}?playsinline=1&rel=0) com fallback para abertura externa,
 * preservando <video controls playsInline> para arquivos de mídia diretos (.mp4, .webm, .mov, .m4v, .m3u8).
 */

export type ParsedInstitutionalVideo =
  | {
      kind: 'youtube';
      videoId: string;
      embedUrl: string;
      watchUrl: string;
    }
  | {
      kind: 'direct';
      src: string;
    }
  | {
      kind: 'external';
      href: string;
    };

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{6,20}$/;

/**
 * Extrai o ID de vídeo do YouTube a partir de formatos comuns:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 */
export function extractYouTubeVideoId(rawUrl: string | undefined | null): string | null {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized) && /^(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
      return YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const vParam = parsed.searchParams.get('v');
      if (vParam && YOUTUBE_ID_REGEX.test(vParam)) {
        return vParam;
      }

      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0]!.toLowerCase())) {
        const candidate = segments[1]!;
        return YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
      }
    }
  } catch {
    // Fallback regex caso a URL tenha caracteres extras
  }

  const fallbackMatch = trimmed.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/i,
  );
  return fallbackMatch?.[1] ?? null;
}

export function isDirectVideoFileUrl(rawUrl: string | undefined | null): boolean {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return false;
  if (extractYouTubeVideoId(trimmed)) return false;

  const cleanPath = (trimmed.split('?')[0] ?? '').split('#')[0] ?? '';
  if (/\.(mp4|webm|mov|m4v|m3u8|ogg|ogv)$/i.test(cleanPath)) {
    return true;
  }

  // Arquivos armazenados no Supabase Storage em pastas de mídia de vídeo sem extensão explícita
  if (/\/storage\/v1\/object\/public\/[^?#]+\.(mp4|webm|mov|m4v)$/i.test(cleanPath)) {
    return true;
  }

  return false;
}

export function parseInstitutionalVideoUrl(rawUrl: string | undefined | null): ParsedInstitutionalVideo | null {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return null;
  if (/^(javascript|data|file|vbscript):/i.test(trimmed)) return null;

  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    return {
      kind: 'youtube',
      videoId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?playsinline=1&rel=0&modestbranding=1`,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}`,
    };
  }

  const safeHttpUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;

  if (isDirectVideoFileUrl(safeHttpUrl)) {
    return {
      kind: 'direct',
      src: safeHttpUrl,
    };
  }

  return {
    kind: 'external',
    href: safeHttpUrl,
  };
}

