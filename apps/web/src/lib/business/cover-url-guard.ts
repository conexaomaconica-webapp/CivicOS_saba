/**
 * Proteção canônica para URLs de imagens de capa (cover_url).
 *
 * Regras:
 * 1. Rejeita links de plataformas de vídeo (YouTube, YouTube Shorts, youtu.be, Vimeo, Dailymotion, TikTok, Loom, Facebook Watch, Reels)
 *    e arquivos de vídeo/áudio (.mp4, .webm, .mov, .m4v, .avi, .mkv, .m3u8, .mp3, .wav, .ogg).
 * 2. Aceita qualquer formato de imagem válido (.webp, .png, .jpg, .jpeg, .gif, .avif, .svg, .bmp)
 *    bem como URLs de imagem servidas por CDN/Storage sem extensão explícita.
 * 3. Preserva integralmente os vídeos institucionais em suas coleções de mídia (media_type = 'video'),
 *    impedindo apenas que sejam utilizados como imagem de capa.
 */

const VIDEO_HOST_PATTERNS = [
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)youtube-nocookie\.com$/i,
  /(^|\.)vimeo\.com$/i,
  /(^|\.)dailymotion\.com$/i,
  /(^|\.)dai\.ly$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)loom\.com$/i,
  /(^|\.)fb\.watch$/i,
];

const VIDEO_PATH_OR_EXT_REGEX =
  /\.(mp4|webm|mov|m4v|avi|mkv|m3u8|mp3|wav|ogg)(?:[?#]|$)/i;

const SOCIAL_VIDEO_PATH_REGEX =
  /\/(shorts|watch|embed|reel|reels)\b/i;

export function isVideoOrNonImageCoverUrl(url: unknown): boolean {
  if (typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;

  if (VIDEO_PATH_OR_EXT_REGEX.test(trimmed)) return true;

  if (trimmed.startsWith('/')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }
    const host = parsed.hostname.toLowerCase();
    if (VIDEO_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
      return true;
    }
    if (
      (host.includes('instagram.com') || host.includes('facebook.com')) &&
      SOCIAL_VIDEO_PATH_REGEX.test(parsed.pathname)
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function isSafeImageCoverUrl(url: unknown): url is string {
  return typeof url === 'string' && !isVideoOrNonImageCoverUrl(url);
}

export type MediaCandidateItem = {
  id?: string | null;
  url?: string | null;
  title?: string | null;
  media_type?: string | null;
  display_order?: number | null;
  [key: string]: unknown;
};

/**
 * Ordena a lista de mídias priorizando imagens ('cover', 'image') antes de vídeos ('video')
 * quando houver empate de display_order (ex.: display_order = 0), sem remover nem alterar nenhum vídeo.
 */
export function sortMediaImagesFirst<T extends MediaCandidateItem>(mediaList: T[]): T[] {
  if (!Array.isArray(mediaList)) return [];
  return [...mediaList].sort((a, b) => {
    const aType = String(a?.media_type ?? '').toLowerCase();
    const bType = String(b?.media_type ?? '').toLowerCase();
    const aIsVideo = aType === 'video' || isVideoOrNonImageCoverUrl(a?.url);
    const bIsVideo = bType === 'video' || isVideoOrNonImageCoverUrl(b?.url);

    if (aIsVideo !== bIsVideo) {
      return aIsVideo ? 1 : -1;
    }
    const aIsCover = aType === 'cover';
    const bIsCover = bType === 'cover';
    if (aIsCover !== bIsCover) {
      return aIsCover ? -1 : 1;
    }
    const aOrder = typeof a?.display_order === 'number' ? a.display_order : 0;
    const bOrder = typeof b?.display_order === 'number' ? b.display_order : 0;
    return aOrder - bOrder;
  });
}

/**
 * Resolve a URL de imagem de capa a partir de um cover_url candidato e/ou da lista de mídias da empresa.
 */
export function resolveCoverUrlFromMediaList(
  mediaList: unknown,
  candidateCoverUrl?: unknown,
): string | null {
  if (isSafeImageCoverUrl(candidateCoverUrl)) {
    return candidateCoverUrl.trim();
  }
  if (!Array.isArray(mediaList)) return null;

  const sorted = sortMediaImagesFirst(mediaList as MediaCandidateItem[]);
  for (const item of sorted) {
    const type = String(item?.media_type ?? '').toLowerCase();
    if (type === 'video') continue;
    if (isSafeImageCoverUrl(item?.url)) {
      return item.url.trim();
    }
  }
  return null;
}

