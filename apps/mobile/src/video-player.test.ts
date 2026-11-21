import { describe, expect, it } from 'vitest';
import {
  extractYouTubeVideoId,
  isDirectVideoFileUrl,
  parseInstitutionalVideoUrl,
} from './video-player';

describe('Institutional Video Player URL Classifier (iOS WKWebView & Android Compatibility)', () => {
  it('reconhece links youtube.com/watch e gera embedUrl com playsinline=1', () => {
    const parsed = parseInstitutionalVideoUrl('https://www.youtube.com/watch?v=9yG8W3mX1pQ');
    expect(parsed).toEqual({
      kind: 'youtube',
      videoId: '9yG8W3mX1pQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/9yG8W3mX1pQ?playsinline=1&rel=0&modestbranding=1',
      watchUrl: 'https://www.youtube.com/watch?v=9yG8W3mX1pQ',
    });
  });

  it('reconhece links curtos youtu.be (ex.: Comandos)', () => {
    const parsed = parseInstitutionalVideoUrl('https://youtu.be/abc123XYZ_9?si=test');
    expect(parsed).toEqual({
      kind: 'youtube',
      videoId: 'abc123XYZ_9',
      embedUrl: 'https://www.youtube-nocookie.com/embed/abc123XYZ_9?playsinline=1&rel=0&modestbranding=1',
      watchUrl: 'https://www.youtube.com/watch?v=abc123XYZ_9',
    });
  });

  it('reconhece links youtube.com/shorts (ex.: FISION e Grupo MAP)', () => {
    const parsed = parseInstitutionalVideoUrl('https://www.youtube.com/shorts/fisionShort01?feature=share');
    expect(parsed).toEqual({
      kind: 'youtube',
      videoId: 'fisionShort01',
      embedUrl: 'https://www.youtube-nocookie.com/embed/fisionShort01?playsinline=1&rel=0&modestbranding=1',
      watchUrl: 'https://www.youtube.com/watch?v=fisionShort01',
    });
  });

  it('preserva arquivos diretos de vídeo (.mp4, .webm, .mov, .m3u8) para reprodução via tag <video>', () => {
    const mp4Url = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/videos/institucional.mp4';
    expect(isDirectVideoFileUrl(mp4Url)).toBe(true);
    expect(parseInstitutionalVideoUrl(mp4Url)).toEqual({
      kind: 'direct',
      src: mp4Url,
    });

    const movUrl = 'https://cdn.conexaomaconica.com.br/media/apresentacao.mov?token=123';
    expect(parseInstitutionalVideoUrl(movUrl)).toEqual({
      kind: 'direct',
      src: movUrl,
    });
  });

  it('classifica links externos que não são YouTube nem arquivo de vídeo direto como fallback externo seguro', () => {
    const vimeoUrl = 'https://vimeo.com/123456789';
    expect(extractYouTubeVideoId(vimeoUrl)).toBeNull();
    expect(parseInstitutionalVideoUrl(vimeoUrl)).toEqual({
      kind: 'external',
      href: vimeoUrl,
    });
  });

  it('rejeita URLs vazias ou esquemas inseguros (javascript:, data:)', () => {
    expect(parseInstitutionalVideoUrl('')).toBeNull();
    expect(parseInstitutionalVideoUrl('   ')).toBeNull();
    expect(parseInstitutionalVideoUrl('javascript:alert(1)')).toBeNull();
  });
});

