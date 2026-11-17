// Captura dos modelos de e-mail (preview com valores de exemplo) em celular e desktop. Uso: node scripts/screenshot-email-templates.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.resolve('node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/package.json'));
const { chromium } = require('playwright');
const out = path.resolve('docs/email-templates/capturas');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const name of ['recuperar-senha', 'codigo-de-confirmacao', 'troca-de-email']) {
  for (const width of [375, 700]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(path.resolve(`docs/email-templates/preview/${name}.html`)).href, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const horizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const logo = await page.evaluate(() => {
      const img = document.querySelector('img');
      return img ? { carregou: img.complete && img.naturalWidth > 0, larguraNatural: img.naturalWidth } : null;
    });
    await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
    console.log(`${name} ${width}px rolagemH=${horizontalScroll} logo=${JSON.stringify(logo)}`);
    await ctx.close();
  }
}
await browser.close();
