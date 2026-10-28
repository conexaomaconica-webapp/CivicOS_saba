import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(path.resolve(__dirname, '../apps/web/package.json'));
const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3009';

async function diagnoseGuia(browser, iteration) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);
  // Force disable network cache for accurate network measurement
  await cdpSession.send('Network.setCacheDisabled', { cacheDisabled: true });

  const resources = [];
  page.on('response', async (res) => {
    try {
      const url = res.url();
      const status = res.status();
      const headers = res.headers();
      const contentType = headers['content-type'] || '';
      let bytes = 0;
      try {
        const body = await res.body();
        bytes = body.length;
      } catch {
        bytes = headers['content-length'] ? parseInt(headers['content-length'], 10) : 0;
      }

      resources.push({
        url: url.startsWith(BASE_URL) ? url.replace(BASE_URL, '') : url,
        status,
        contentType,
        bytes,
        resourceType: res.request().resourceType(),
      });
    } catch {}
  });

  console.log(`\n--- INICIANDO DIAGNÓSTICO /guia (Iteração ${iteration}) ---`);
  const navStart = Date.now();
  await page.goto(`${BASE_URL}/guia`, { waitUntil: 'networkidle', timeout: 30000 });
  const totalDuration = Date.now() - navStart;

  // Extract detailed performance breakdown
  const details = await page.evaluate(() => {
    return new Promise((resolve) => {
      // 1. Navigation Timing
      const navTiming = performance.getEntriesByType('navigation')[0];
      const navStats = navTiming
        ? {
            dns: Math.round(navTiming.domainLookupEnd - navTiming.domainLookupStart),
            tcp: Math.round(navTiming.connectEnd - navTiming.connectStart),
            ttfb: Math.round(navTiming.responseStart - navTiming.requestStart),
            download: Math.round(navTiming.responseEnd - navTiming.responseStart),
            domInteractive: Math.round(navTiming.domInteractive),
            domContentLoaded: Math.round(navTiming.domContentLoadedEventEnd),
            loadComplete: Math.round(navTiming.loadEventEnd),
          }
        : {};

      // 2. Paint timing
      let fcp = 0;
      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          fcp = Math.round(entry.startTime);
        }
      }

      // 3. LCP Observer
      let lcpDetails = {
        startTime: 0,
        renderTime: 0,
        loadTime: 0,
        size: 0,
        elementTag: 'N/A',
        elementClass: 'N/A',
        elementText: 'N/A',
        url: 'N/A',
      };

      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            const el = lastEntry.element;
            lcpDetails = {
              startTime: Math.round(lastEntry.startTime),
              renderTime: Math.round(lastEntry.renderTime),
              loadTime: Math.round(lastEntry.loadTime),
              size: lastEntry.size,
              elementTag: el ? el.tagName.toLowerCase() : 'N/A',
              elementClass: el ? el.className : 'N/A',
              elementText: el ? (el.innerText || el.textContent || '').trim().slice(0, 100) : 'N/A',
              url: lastEntry.url || 'N/A',
            };
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {}

      // 4. CLS Observer
      let cls = 0;
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) cls += entry.value;
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {}

      // Give 600ms for buffered events
      setTimeout(() => {
        resolve({
          navStats,
          fcp,
          lcpDetails,
          cls: parseFloat(cls.toFixed(4)),
        });
      }, 600);
    });
  });

  await context.close();

  return {
    iteration,
    totalDuration,
    resources,
    ...details,
  };
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const run1 = await diagnoseGuia(browser, 1);
  const run2 = await diagnoseGuia(browser, 2);

  await browser.close();

  for (const r of [run1, run2]) {
    console.log('\n================================================================');
    console.log(`  RESULTADO DETALHADO — ITERAÇÃO ${r.iteration}`);
    console.log('================================================================');
    console.log(`Tempo Total de Rede (Idle): ${r.totalDuration}ms`);
    console.log(`TTFB (Time to First Byte): ${r.navStats.ttfb}ms`);
    console.log(`DOM Interactive: ${r.navStats.domInteractive}ms`);
    console.log(`DOM Content Loaded: ${r.navStats.domContentLoaded}ms`);
    console.log(`FCP (First Contentful Paint): ${r.fcp}ms`);
    console.log(`LCP (Largest Contentful Paint): ${r.lcpDetails.startTime}ms`);
    console.log(`  - Elemento LCP: <${r.lcpDetails.elementTag}> class="${r.lcpDetails.elementClass}"`);
    console.log(`  - Texto / Conteúdo LCP: "${r.lcpDetails.elementText}"`);
    console.log(`  - URL do Recurso LCP: ${r.lcpDetails.url}`);
    console.log(`  - Render Time: ${r.lcpDetails.renderTime}ms | Load Time: ${r.lcpDetails.loadTime}ms | Size: ${r.lcpDetails.size}px`);
    console.log(`CLS: ${r.cls}`);

    // Summary of resources
    const imgRes = r.resources.filter((x) => x.resourceType === 'image');
    const jsRes = r.resources.filter((x) => x.resourceType === 'script');
    const cssRes = r.resources.filter((x) => x.resourceType === 'stylesheet');
    const fontRes = r.resources.filter((x) => x.resourceType === 'font');

    const sumBytes = (arr) => arr.reduce((acc, cur) => acc + cur.bytes, 0);

    console.log(`\nDistribuição de Recursos:`);
    console.log(`  - Imagens: ${imgRes.length} requisições, ${(sumBytes(imgRes) / 1024).toFixed(1)} KB`);
    console.log(`  - JavaScript: ${jsRes.length} requisições, ${(sumBytes(jsRes) / 1024).toFixed(1)} KB`);
    console.log(`  - CSS: ${cssRes.length} requisições, ${(sumBytes(cssRes) / 1024).toFixed(1)} KB`);
    console.log(`  - Fontes: ${fontRes.length} requisições, ${(sumBytes(fontRes) / 1024).toFixed(1)} KB`);

    console.log(`\nDetalhamento das Imagens Baixadas (${imgRes.length}):`);
    imgRes.forEach((img, i) => {
      console.log(`  [${i + 1}] ${img.url.slice(0, 75)} (${(img.bytes / 1024).toFixed(1)} KB, ${img.contentType})`);
    });
  }
}

run().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
