// Sonda do botão "Copiar link" a 375 px: mede posição, cobertura por elementos fixos e estabilidade.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/package.json'));
const { chromium } = require('playwright');
const [base, url, out] = [process.argv[2], process.argv[3], process.argv[4]];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 375, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
await page.goto(base + url, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /Copiar link/.test(b.textContent ?? ''));
  if (!btn) return { found: false };
  btn.scrollIntoView({ block: 'center' });
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return { found: true, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, viewport: { w: innerWidth, h: innerHeight }, topElement: top ? `${top.tagName} ${(top.getAttribute('aria-label') || top.textContent || '').trim().slice(0, 40)}` : null, isButton: top === btn || btn.contains(top) };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: out, fullPage: false });
const b1 = await (async () => { try { const el = await page.$('button:has-text("Copiar link")'); await el.click({ timeout: 8000 }); return 'clique ok'; } catch (e) { return 'clique falhou: ' + String(e.message).split('\n').slice(0, 6).join(' | '); } })();
console.log(b1);
await browser.close();
