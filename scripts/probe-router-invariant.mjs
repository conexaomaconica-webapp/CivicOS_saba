// Sonda: reproduz o aviso "invariant expected layout router to be mounted" e coleta a pilha, em contexto NOVO.
// Uso: node scripts/probe-router-invariant.mjs <baseUrl> <caminho,caminho,...> [--perm]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/package.json'));
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:3100';
const paths = (process.argv[3] ?? '/privacidade,/guia').split(',');
const withPerm = process.argv.includes('--perm');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const p of paths) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...(withPerm ? { permissions: ['clipboard-read', 'clipboard-write'] } : {}) });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 6).join('\n')}`));
  await page.goto(base + p, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2500);
  const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim()?.slice(0, 50) ?? null);
  console.log(`${p}  h1="${h1}"  erros=${errors.length}`);
  for (const e of errors) console.log('   ' + e.replace(/\n/g, '\n   '));
  // segunda carga do mesmo contexto (cookies/armazenamento já criados)
  const errors2 = [];
  page.on('pageerror', (e) => errors2.push(e.message));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const h1b = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim()?.slice(0, 50) ?? null);
  console.log(`   recarregando o mesmo contexto: h1="${h1b}" erros=${errors2.length}`);
  await context.close();
}
await browser.close();
