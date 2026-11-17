// Captura de tela do Guia para comparar ANTES (/guia, virada desligada) e DEPOIS (/, virada ligada).
// Uso: node scripts/visual-home-switch.mjs <baseUrl> <pastaSaida> <rotulo> <caminho> [larguras,separadas,por,virgula]
// Só leitura. Contexto novo por captura, cookies opcionais recusados, sem rolagem horizontal verificada.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.resolve('node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/package.json'));
const { chromium } = require('playwright');

const [base = 'http://localhost:3100', outDir = 'docs/home-switch/capturas', label = 'estado', pagePath = '/', widthsArg = '375,768,1440'] = process.argv.slice(2);
const widths = widthsArg.split(',').map(Number);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const res = await page.goto(base + pagePath, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(2500);
  const rej = await page.$('button:has-text("Rejeitar opcionais")');
  if (rej) { await rej.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); }
  // Congela animações e carrosséis para a comparação medir layout, não movimento.
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => ({
    horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) ?? null,
    headers: document.querySelectorAll('header').length,
    footers: document.querySelectorAll('footer').length,
    sections: document.querySelectorAll('main section, section').length,
    height: document.documentElement.scrollHeight,
  }));
  await page.screenshot({ path: path.join(outDir, `${label}-${width}.png`), fullPage: true });
  console.log(`${label} ${String(width).padStart(4)}px status=${res?.status()} rolagemH=${info.horizontalScroll} headers=${info.headers} footers=${info.footers} sections=${info.sections} altura=${info.height} h1="${info.h1}" erros=${errors.length}`);
  await context.close();
}
await browser.close();
