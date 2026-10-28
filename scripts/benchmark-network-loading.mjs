import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(path.resolve(__dirname, '../apps/web/package.json'));
const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3009';

const routesToTest = [
  { name: 'Guia Principal (/guia)', path: '/guia' },
  { name: 'Catálogo de Empresas (/guia/empresas)', path: '/guia/empresas' },
  { name: 'Lojas (/guia/lojas)', path: '/guia/lojas' },
];

async function measureRoute(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ConexaoMaconica-NetworkAudit/1.0',
  });

  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);
  // Force disable network cache for reproducible cold-load measurement
  await cdpSession.send('Network.setCacheDisabled', { cacheDisabled: true });

  const networkStats = {
    totalRequests: 0,
    totalBytes: 0,
    imageRequests: 0,
    imageBytes: 0,
    images: [],
    jsRequests: 0,
    jsBytes: 0,
    cssRequests: 0,
    cssBytes: 0,
    documentBytes: 0,
    statusCodes: {},
  };

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      networkStats.statusCodes[status] = (networkStats.statusCodes[status] || 0) + 1;

      // Extract transfer size from headers or body
      const headers = response.headers();
      const contentLength = headers['content-length'] ? parseInt(headers['content-length'], 10) : 0;
      let bodyLength = contentLength;
      if (!bodyLength) {
        try {
          const buffer = await response.body();
          bodyLength = buffer.length;
        } catch {
          bodyLength = 0;
        }
      }

      networkStats.totalRequests += 1;
      networkStats.totalBytes += bodyLength;

      const contentType = headers['content-type'] || '';
      if (contentType.includes('image') || /\.(webp|png|jpg|jpeg|svg|gif|avif)($|\?)/i.test(url)) {
        networkStats.imageRequests += 1;
        networkStats.imageBytes += bodyLength;
        networkStats.images.push({
          url: url.replace(BASE_URL, ''),
          type: contentType,
          bytes: bodyLength,
          status,
        });
      } else if (contentType.includes('javascript') || url.endsWith('.js')) {
        networkStats.jsRequests += 1;
        networkStats.jsBytes += bodyLength;
      } else if (contentType.includes('text/css') || url.endsWith('.css')) {
        networkStats.cssRequests += 1;
        networkStats.cssBytes += bodyLength;
      } else if (contentType.includes('text/html')) {
        networkStats.documentBytes += bodyLength;
      }
    } catch {
      // Ignore background aborts
    }
  });

  const fullUrl = `${BASE_URL}${route.path}`;
  const startTime = Date.now();
  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const loadDuration = Date.now() - startTime;

  // Web Vitals & DOM analysis
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      let lcp = 0;
      let cls = 0;
      let fcp = 0;

      // Paint timings
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          fcp = entry.startTime;
        }
      }

      // Observer for LCP & CLS
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            lcp = entries[entries.length - 1].startTime;
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // Observer not supported or error
      }

      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Ignore
      }

      // Check card image attributes (eager vs lazy, fetchpriority)
      const imagesInDom = Array.from(document.querySelectorAll('img')).map((img, index) => ({
        index,
        src: img.src.substring(0, 80),
        loading: img.getAttribute('loading') || 'auto',
        fetchPriority: img.getAttribute('fetchpriority') || 'auto',
        decoding: img.getAttribute('decoding') || 'auto',
        isFirstCard: index === 0,
      }));

      // Give observers a short moment to flush buffered entries
      setTimeout(() => {
        resolve({
          fcp: Math.round(fcp),
          lcp: Math.round(lcp || fcp),
          cls: parseFloat(cls.toFixed(4)),
          imagesInDom,
        });
      }, 500);
    });
  });

  await context.close();

  return {
    route: route.name,
    path: route.path,
    loadDuration,
    networkStats,
    metrics,
  };
}

async function run() {
  console.log('================================================================');
  console.log('  CONEXÃO MAÇÔNICA — AUDITORIA DE REDE E CARREGAMENTO DE IMAGENS');
  console.log('  Ambiente: Local Next.js Produção (:3009) | Cache: Desativado   ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const allResults = [];

  for (const route of routesToTest) {
    console.log(`[TESTANDO] ${route.name} (${route.path})...`);
    try {
      const res = await measureRoute(browser, route);
      allResults.push(res);
      console.log(`  -> Sucesso: ${res.networkStats.totalRequests} reqs, Total: ${(res.networkStats.totalBytes / 1024).toFixed(1)} KB`);
      console.log(`     Imagens: ${res.networkStats.imageRequests} reqs, ${(res.networkStats.imageBytes / 1024).toFixed(1)} KB`);
      console.log(`     FCP: ${res.metrics.fcp}ms | LCP: ${res.metrics.lcp}ms | CLS: ${res.metrics.cls}`);
    } catch (err) {
      console.error(`  -> Erro ao testar ${route.path}:`, err.message);
    }
  }

  // Also discover a slug if any business exists
  console.log('\n[TESTANDO] Rota de Detalhe (/guia/[slug])...');
  try {
    const context = await browser.newContext();
    const probePage = await context.newPage();
    await probePage.goto(`${BASE_URL}/guia/empresas`, { waitUntil: 'domcontentloaded' });
    const slugLink = await probePage.evaluate(() => {
      const link = document.querySelector('a[href^="/guia/"]');
      return link ? link.getAttribute('href') : null;
    });
    await context.close();

    if (slugLink && slugLink !== '/guia' && slugLink !== '/guia/empresas') {
      console.log(`  Encontrado perfil: ${slugLink}`);
      const slugRes = await measureRoute(browser, { name: `Perfil (${slugLink})`, path: slugLink });
      allResults.push(slugRes);
      console.log(`  -> Sucesso: ${slugRes.networkStats.totalRequests} reqs, ${(slugRes.networkStats.totalBytes / 1024).toFixed(1)} KB`);
      console.log(`     Imagens: ${slugRes.networkStats.imageRequests} reqs, ${(slugRes.networkStats.imageBytes / 1024).toFixed(1)} KB`);
      console.log(`     FCP: ${slugRes.metrics.fcp}ms | LCP: ${slugRes.metrics.lcp}ms | CLS: ${slugRes.metrics.cls}`);
    } else {
      console.log('  Nenhum slug de empresa retornado em /guia/empresas (ambiente local sem empresas cadastradas no mock ou catálogo vazio). Testando rota canônica fallback /guia/exemplo-empresa');
      const fallbackRes = await measureRoute(browser, { name: 'Perfil (/guia/empresa-modelo)', path: '/guia/empresa-modelo' });
      allResults.push(fallbackRes);
    }
  } catch (err) {
    console.warn('  Aviso no teste de perfil:', err.message);
  }

  await browser.close();

  console.log('\n================================================================');
  console.log('                 RELATÓRIO CONSOLIDADO DE REDE                  ');
  console.log('================================================================\n');

  for (const r of allResults) {
    console.log(`--- ${r.route} ---`);
    console.log(`Tempo Total de Carga (Network Idle): ${r.loadDuration}ms`);
    console.log(`Bytes Transferidos (Cold Cache): ${(r.networkStats.totalBytes / 1024).toFixed(1)} KB em ${r.networkStats.totalRequests} requisições`);
    console.log(`  - HTML Documento: ${(r.networkStats.documentBytes / 1024).toFixed(1)} KB`);
    console.log(`  - JavaScript: ${(r.networkStats.jsBytes / 1024).toFixed(1)} KB (${r.networkStats.jsRequests} reqs)`);
    console.log(`  - CSS: ${(r.networkStats.cssBytes / 1024).toFixed(1)} KB (${r.networkStats.cssRequests} reqs)`);
    console.log(`  - Imagens: ${(r.networkStats.imageBytes / 1024).toFixed(1)} KB (${r.networkStats.imageRequests} reqs)`);
    console.log(`Core Web Vitals:`);
    console.log(`  - FCP (First Contentful Paint): ${r.metrics.fcp}ms`);
    console.log(`  - LCP (Largest Contentful Paint): ${r.metrics.lcp}ms`);
    console.log(`  - CLS (Cumulative Layout Shift): ${r.metrics.cls}`);
    console.log(`Estratégia de Loading nos Primeiros Elementos do DOM:`);
    const cardImgs = r.metrics.imagesInDom.slice(0, 4);
    cardImgs.forEach((img, i) => {
      console.log(`    [Img #${i}] loading="${img.loading}" | fetchpriority="${img.fetchPriority}" | decoding="${img.decoding}"`);
    });
    console.log('');
  }
}

run().catch((err) => {
  console.error('Fatal error in benchmark:', err);
  process.exit(1);
});
