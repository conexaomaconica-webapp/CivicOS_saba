// Navegação real no estado LIGADO: busca, categoria, logo e links internos para /guia. Só leitura (nenhum clique grava dados).
// Uso: node scripts/nav-check-home-switch.mjs <baseUrl>
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve('node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/package.json'));
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:3100';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// Preview protegido: o segredo vem só da variável BYPASS_SECRET e grava o cookie de bypass neste contexto.
if (process.env.BYPASS_SECRET) {
  await page.goto(`${base}/?x-vercel-protection-bypass=${encodeURIComponent(process.env.BYPASS_SECRET)}&x-vercel-set-bypass-cookie=true`, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
}
await page.goto(base + '/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(2500);
const rej = await page.$('button:has-text("Rejeitar opcionais")');
if (rej) { await rej.click().catch(() => {}); await page.waitForTimeout(400); }

// 1) Links internos que ainda apontam para /guia exatamente (viram 308 -> "/"): funcionam, mas têm um salto a mais.
const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')).filter(Boolean));
const exactGuia = links.filter((h) => h === '/guia' || /^\/guia\?/.test(h) || h === '/guia/');
console.log(`links na página: ${links.length} | apontam para /guia (via 308): ${exactGuia.length} ${exactGuia.length ? JSON.stringify([...new Set(exactGuia)].slice(0, 5)) : ''}`);

// 2) Busca: a URL deve continuar em "/" com o parâmetro
const input = page.locator('input[name="q"]:visible').first();
if ((await input.count()) > 0) {
  await input.fill('otica');
  await Promise.all([page.waitForURL((u) => u.search.includes('q=otica'), { timeout: 30000 }).catch(() => null), input.press('Enter')]);
  await page.waitForTimeout(2000);
  const u = new URL(page.url());
  console.log(`busca "otica" -> caminho=${u.pathname} query=${u.search} h1="${(await page.textContent('h1').catch(() => ''))?.trim().slice(0, 45)}"`);
} else {
  console.log('campo de busca (input[name=q]) não encontrado na página inicial');
}

// 3) Voltar à página inicial e clicar na primeira categoria visível
await page.goto(base + '/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(2000);
const cat = await page.$('a[href*="/guia/empresas"][href*="cat="], a[href*="cat="]');
if (cat) {
  const href = await cat.getAttribute('href');
  console.log(`categoria encontrada href=${href}`);
} else {
  console.log('nenhum link de categoria com cat= (categorias podem usar botões; ver a captura)');
}

// 4) Logo e "Início": para onde levam?
const homeLink = await page.$('header a[href="/"], header a[href="/guia"]');
console.log(`link de início no cabeçalho: ${homeLink ? await homeLink.getAttribute('href') : 'não encontrado'}`);
console.log(`erros de console/página: ${errors.length}`);
await browser.close();
