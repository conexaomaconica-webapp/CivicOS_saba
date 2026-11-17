// Validação visual/funcional local do Mural de Conexões (Etapas 2 e 3).
// Uso: node scripts/visual-check-connections.mjs <baseUrl> <pastaSaida> <larguras,separadas,por,virgula> [--stress]
// Requer o servidor rodando com CONNECTIONS_LIST_FIXTURE=1 (dados de demonstração SOMENTE locais). Nada é gravado no banco.
// Cada URL abre num contexto NOVO (isolamento) e espera a rede ficar ociosa antes de medir. Com --stress, navega em sequência
// SEM esperar a hidratação (reproduz o padrão do script antigo, para classificar o aviso "layout router to be mounted").
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.resolve('node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/package.json'));
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:3100';
const outDir = path.resolve(process.argv[3] ?? 'visual-check');
const widths = (process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4].split(',').map(Number) : [375, 768, 1280, 1440]);
const stress = process.argv.includes('--stress');
fs.mkdirSync(outDir, { recursive: true });

const ID_PHOTO = '00000000-0000-4000-8000-000000000000';
const ID_TEXT = '00000000-0000-4000-8000-000000000001';
const pages = [
  { name: 'conexoes', url: '/conexoes' },
  { name: 'conexoes-empresa', url: '/conexoes?empresa=otica-central' },
  { name: 'conexoes-empresa-vazia', url: '/conexoes?empresa=nao-existe' },
  { name: 'conexoes-busca', url: '/conexoes?q=otica' },
  { name: 'conexoes-sem-resultado', url: '/conexoes?q=zzzzzz' },
  { name: 'detalhe-com-foto', url: `/conexoes/${ID_PHOTO}`, detail: true },
  { name: 'detalhe-sem-foto', url: `/conexoes/${ID_TEXT}`, detail: true },
  { name: 'detalhe-inexistente', url: '/conexoes/00000000-0000-4000-8000-0000000000ff', expect404: true },
  { name: 'detalhe-id-invalido', url: '/conexoes/nao-e-um-uuid', expect404: true },
  { name: 'guia-home', url: '/guia' },
  { name: 'guia-empresas', url: '/guia/empresas' },
];

const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const parse = (css) => (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
for (const width of widths) {
  let sharedContext = null; let sharedPage = null;
  for (const p of pages) {
    const context = stress
      ? (sharedContext ??= await browser.newContext({ viewport: { width, height: 900 } }))
      : await browser.newContext({ viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = stress ? (sharedPage ??= await context.newPage()) : await context.newPage();
    const errors = [];
    const onErr = (e) => errors.push(`pageerror: ${e.message}`);
    page.on('pageerror', onErr);
    const row = { width, page: p.name, status: null, horizontalScroll: null, h1: null, errors };
    try {
      const res = await page.goto(base + p.url, { waitUntil: stress ? 'domcontentloaded' : 'load', timeout: 90000 });
      await page.waitForTimeout(stress ? 800 : 1500);
      // Faixa de cookies (LGPD) de quem chega pela primeira vez: recusa os opcionais para medir a página sem a sobreposição.
      if (!stress) { const rej = await page.$('button:has-text("Rejeitar opcionais")'); if (rej) { await rej.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); } }
      row.status = res?.status() ?? null;
      row.horizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      row.h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? null);

      if (!stress) {
        // Contraste do breadcrumb (WCAG AA = 4.5:1 para texto normal)
        row.breadcrumb = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('nav[aria-label="Breadcrumb"] a, nav[aria-label="Breadcrumb"] span[aria-current]'));
          const section = document.querySelector('nav[aria-label="Breadcrumb"]')?.closest('section');
          if (!links.length || !section) return null;
          return { colors: links.map((l) => getComputedStyle(l).color) };
        });
        if (row.breadcrumb) {
          const bg = [0x4b, 0x16, 0x1b]; // início do degradê do banner (#4b161b), onde o breadcrumb fica
          row.breadcrumb.ratios = row.breadcrumb.colors.map((c) => Number(ratio(parse(c), bg).toFixed(2)));
          row.breadcrumb.minRatio = Math.min(...row.breadcrumb.ratios);
        }
        if (p.detail) {
          row.detail = await page.evaluate(() => ({
            images: document.querySelectorAll('article img').length,
            like: !!document.querySelector('[data-testid="like"]'),
            whatsapp: document.querySelector('a[href^="https://wa.me/"]')?.getAttribute('href') ?? null,
            cta: Array.from(document.querySelectorAll('a')).find((a) => /Conhecer esta empresa/.test(a.textContent ?? ''))?.getAttribute('href') ?? null,
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
            ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null,
            ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null,
            robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
          }));
          const copy = await page.$('button:has-text("Copiar link")');
          if (copy) {
            await copy.click();
            await page.waitForTimeout(400);
            row.detail.copiedLabel = await page.evaluate(() => /Link copiado/.test(document.body.innerText));
            row.detail.clipboard = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
          }
        }
        if (p.expect404) {
          row.noindex = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null);
        }
        await page.screenshot({ path: path.join(outDir, `${p.name}-${width}.png`), fullPage: true });
      }
    } catch (e) {
      errors.push(`script: ${String(e.message).slice(0, 160)}`);
    }
    page.off('pageerror', onErr);
    report.push(row);
    if (!stress) await context.close();
  }
  if (stress && sharedContext) await sharedContext.close();
}
await browser.close();
const tag = stress ? 'stress' : 'fresh';
fs.writeFileSync(path.join(outDir, `relatorio-${tag}-${widths.join('-')}.json`), JSON.stringify(report, null, 2));
for (const r of report) {
  const extras = [
    r.breadcrumb ? `breadcrumbMin=${r.breadcrumb.minRatio}` : '',
    r.detail ? `detalhe=${JSON.stringify({ img: r.detail.images, like: r.detail.like, copiado: r.detail.copiedLabel, clip: r.detail.clipboard ? 'ok' : r.detail.clipboard })}` : '',
    r.noindex ? `robots=${r.noindex}` : '',
  ].filter(Boolean).join(' ');
  console.log(`${String(r.width).padStart(4)}px ${tag} ${r.page.padEnd(22)} status=${r.status} rolagemH=${r.horizontalScroll} h1="${(r.h1 ?? '').slice(0, 40)}" erros=${r.errors.length} ${extras}`);
}
