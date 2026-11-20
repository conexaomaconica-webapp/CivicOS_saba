import { describe, expect, it } from 'vitest';
import {
  isSafeImageCoverUrl,
  isVideoOrNonImageCoverUrl,
  resolveCoverUrlFromMediaList,
  sortMediaImagesFirst,
} from '../src/lib/business/cover-url-guard';

describe('cover-url-guard (Proteção canônica de imagens de capa vs vídeos institucionais)', () => {
  it('aceita imagens de capa válidas em múltiplos formatos (.webp, .png, .jpg, .jpeg, .avif, .svg, CDN sem extensão)', () => {
    const validUrls = [
      'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000201/cover/1789991047944-images__8_.webp',
      'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/company/cover/banner.png',
      'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/company/cover/photo.jpg',
      'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/company/cover/photo.jpeg?v=2',
      'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/company/cover/photo.avif',
      'https://cdn.conexaomaconica.com.br/images/banner-institucional',
      '/capafallback.png',
    ];

    for (const url of validUrls) {
      expect(isSafeImageCoverUrl(url)).toBe(true);
      expect(isVideoOrNonImageCoverUrl(url)).toBe(false);
    }
  });

  it('rejeita URLs de vídeo (YouTube, youtu.be, YouTube Shorts, Vimeo, MP4) como cover_url', () => {
    const invalidVideoUrls = [
      'https://youtu.be/am3teVpl-Ow', // Comandos
      'https://youtube.com/shorts/05Lm_cJzs34', // FISION
      'https://youtu.be/2bHPkewankE?is=tYJ5AFPO9TsGODz0', // Grupo MAP
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://vimeo.com/123456789',
      'https://cdn.example.com/videos/apresentacao.mp4',
      'https://cdn.example.com/videos/clip.webm?token=1',
      '',
      null,
      undefined,
    ];

    for (const url of invalidVideoUrls) {
      expect(isSafeImageCoverUrl(url)).toBe(false);
      expect(isVideoOrNonImageCoverUrl(url)).toBe(true);
    }
  });

  it('ordena mídias colocando imagens antes de vídeos com display_order=0, preservando integralmente o vídeo na lista', () => {
    // Caso real FISION: vídeo com display_order = 0 vinha antes da imagem com display_order = 0
    const fisionMedia = [
      {
        id: 'vid-1',
        display_order: 0,
        media_type: 'video',
        url: 'https://youtube.com/shorts/05Lm_cJzs34',
      },
      {
        id: 'img-cover',
        display_order: 0,
        media_type: 'image',
        url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/5d355d41-a5a2-4e86-808c-57f7ef86afef/cover/d7b72e7f-f92d-4345-8346-3c334b16b84c.webp',
      },
      {
        id: 'img-gal-1',
        display_order: 1,
        media_type: 'image',
        url: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000000/5d355d41-a5a2-4e86-808c-57f7ef86afef/gallery/e2fcedda-af2a-4fc8-9129-64fe5ba85230.webp',
      },
    ];

    const sorted = sortMediaImagesFirst(fisionMedia);
    expect(sorted).toHaveLength(3);
    expect(sorted[0]?.id).toBe('img-cover');
    expect(sorted[1]?.id).toBe('img-gal-1');
    expect(sorted[2]?.id).toBe('vid-1');
    expect(sorted.find((m) => m.media_type === 'video')?.url).toBe('https://youtube.com/shorts/05Lm_cJzs34');
  });

  it('resolve a capa correta mesmo quando candidateCoverUrl é uma URL de vídeo do YouTube (Comandos, FISION, Grupo MAP)', () => {
    const comandosCover =
      'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000201/cover/1789991047944-images__8_.webp';
    const media = [
      { display_order: 0, media_type: 'video', url: 'https://youtu.be/am3teVpl-Ow' },
      { display_order: 0, media_type: 'image', url: comandosCover },
    ];

    expect(resolveCoverUrlFromMediaList(media, 'https://youtu.be/am3teVpl-Ow')).toBe(comandosCover);
    expect(resolveCoverUrlFromMediaList(media, null)).toBe(comandosCover);
  });
});

