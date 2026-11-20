/**
 * Normalização e higienização robusta de links de redes sociais e websites.
 * Garante compatibilidade nas 4 plataformas (Web, Web Mobile, App iOS, App Android).
 *
 * Suporta:
 * - Handles com ou sem arroba: "@empresa.oficial" -> "https://www.instagram.com/empresa.oficial"
 * - Handles com ponto no nome: "empresa.oficial" -> "https://www.instagram.com/empresa.oficial"
 * - URLs parciais: "instagram.com/empresa.oficial" -> "https://www.instagram.com/empresa.oficial"
 * - URLs completas: "https://instagram.com/empresa.oficial"
 * - URLs com @ residual no pathname: "https://instagram.com/@empresa.oficial" -> "https://www.instagram.com/empresa.oficial"
 * - Canais e handles do YouTube: "@meucanal" -> "https://www.youtube.com/@meucanal"
 */

export type SupportedSocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'website';

const DOMAIN_MAP: Record<'instagram' | 'facebook' | 'linkedin' | 'youtube', string> = {
  instagram: 'instagram.com',
  facebook: 'facebook.com',
  linkedin: 'linkedin.com',
  youtube: 'youtube.com',
};

export function normalizeSocialUrl(
  raw: string | undefined | null,
  platform: SupportedSocialPlatform
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Bloqueio de esquemas perigosos
  if (/^(javascript|data|file):/i.test(trimmed)) return null;

  if (platform === 'website') {
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }

  const domain = DOMAIN_MAP[platform];

  // Se já é uma URL completa com http:// ou https://
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      // Se for URL para o próprio domínio e tiver @ no início do pathname (exceto youtube), limpa o @
      if (platform !== 'youtube' && parsed.pathname.startsWith('/@')) {
        parsed.pathname = '/' + parsed.pathname.slice(2);
      }
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  // Se já contém o próprio domínio (ex: instagram.com/usuario ou www.instagram.com/usuario)
  if (trimmed.toLowerCase().includes(domain)) {
    let clean = trimmed.replace(/^\/+/, '');
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    try {
      const parsed = new URL(clean);
      if (platform !== 'youtube' && parsed.pathname.startsWith('/@')) {
        parsed.pathname = '/' + parsed.pathname.slice(2);
      }
      return parsed.toString();
    } catch {
      return clean;
    }
  }

  // Remove '@' e barras iniciais para extrair o handle limpo
  const cleanHandle = trimmed.replace(/^@+/, '').replace(/^\/+/, '');
  if (!cleanHandle) return null;

  if (platform === 'youtube') {
    return `https://www.youtube.com/@${cleanHandle}`;
  }

  return `https://www.${domain}/${cleanHandle}`;
}

