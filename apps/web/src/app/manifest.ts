import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Conexão Maçônica',
    short_name: 'Conexão',
    description: 'Guia de empresas, benefícios, eventos e conexões da família maçônica.',
    start_url: '/guia',
    display: 'standalone',
    background_color: '#F3EEDD',
    theme_color: '#4B161B',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icone.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icone.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icone.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['business', 'networking', 'shopping'],
  };
}
