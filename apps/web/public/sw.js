// Service Worker Leve — Conexão Maçônica (PWA)
// FASE MOBILE 1 — Estratégia de Cache Seguro (Network-First para HTML, Cache-First para Assets Estáticos)

const CACHE_NAME = 'conexao-pwa-v1';

// Rotas e padrões estritamente PROIBIDOS de cache (LGPD & Segurança)
const PRIVATE_OR_DYNAMIC_PATTERNS = [
  /\/admin/,
  /\/master/,
  /\/minha-conta/,
  /\/usuario/,
  /\/anunciante/,
  /\/contratacao/,
  /\/cadastro/,
  /\/adesao/,
  /\/api/,
  /pagamentos/,
  /contratos/,
  /checkpoint/,
  /onboarding/,
];

// Instalação: ativa imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apenas requisições GET de mesma origem ou assets permitidos
  if (request.method !== 'GET') return;

  // VERIFICAÇÃO DE SEGURANÇA: Bloqueia qualquer rota privada ou API
  const isForbidden = PRIVATE_OR_DYNAMIC_PATTERNS.some((pattern) =>
    pattern.test(url.pathname)
  );

  if (isForbidden || request.headers.has('Authorization')) {
    // Ignora o Service Worker e vai direto para a rede
    return;
  }

  // Assets Estáticos Versionados (Next.js static, imagens, fontes, CSS)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Para páginas HTML públicas (/guia, /eventos, /lojas), usar Network-First
  // para garantir que novos dados de empresas e SEO fiquem sempre atualizados.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
  }
});
