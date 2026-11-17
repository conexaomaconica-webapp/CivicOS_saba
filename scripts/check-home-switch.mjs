// Homologação da virada da página inicial: coleta as respostas HTTP e o conteúdo das páginas de um servidor em um dos estados.
// Uso: node scripts/check-home-switch.mjs <baseUrl> <pastaSaida> <rotulo>
// Só faz leituras (GET). Não grava nada em banco. Gera <pasta>/<rotulo>.json com status, redirecionamentos, canonical, robots e
// um "resumo" do conteúdo visível de cada página (para comparar o Guia em /guia antes com o Guia em / depois, sem diferença).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [base = 'http://localhost:3100', outDir = 'docs/home-switch', label = 'estado'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const paths = ['/', '/guia', '/guia?cidade=feira-de-santana', '/guia?q=otica', '/institucional', '/guia/empresas', '/conexoes', '/termos', '/sitemap.xml', '/robots.txt'];

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const meta = (html, re) => (html.match(re) || [])[1] ?? null;

const results = {};
for (const p of paths) {
  // Preview protegido pela Vercel: o segredo de bypass vem SOMENTE da variável de ambiente BYPASS_SECRET (nunca gravado em arquivo).
  const headers = { 'user-agent': 'HomologacaoViradaInicial/1.0 (verificacao interna)' };
  if (process.env.BYPASS_SECRET) headers['x-vercel-protection-bypass'] = process.env.BYPASS_SECRET;
  const res = await fetch(base + p, { redirect: 'manual', headers });
  const body = await res.text();
  const isHtml = (res.headers.get('content-type') || '').includes('text/html');
  const text = isHtml ? strip(body) : '';
  results[p] = {
    status: res.status,
    location: res.headers.get('location'),
    cacheControl: res.headers.get('cache-control'),
    vercelCache: res.headers.get('x-vercel-cache'),
    canonical: meta(body, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i) ?? meta(body, /<link[^>]*href="([^"]*)"[^>]*rel="canonical"/i),
    robots: meta(body, /<meta[^>]*name="robots"[^>]*content="([^"]*)"/i),
    title: meta(body, /<title>([^<]*)<\/title>/i),
    h1: meta(body, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() ?? null,
    textLength: text.length,
    textHash: text ? crypto.createHash('sha1').update(text).digest('hex').slice(0, 12) : null,
    ...(p === '/sitemap.xml' ? { loc: [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\.br\/?(institucional|guia)?$|localhost:\d+\/?(institucional|guia)?$/.test(u)).slice(0, 6) } : {}),
  };
  if (isHtml && res.status === 200) fs.writeFileSync(path.join(outDir, `${label}-${p.replace(/[^a-z0-9]+/gi, '_') || 'raiz'}.txt`), text);
}
fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(results, null, 2));
for (const [p, r] of Object.entries(results)) {
  console.log(`${p.padEnd(34)} ${String(r.status).padEnd(4)} ${r.location ? '-> ' + r.location : ''}  canonical=${r.canonical ?? '-'}  robots=${r.robots ?? '-'}  h1="${(r.h1 ?? '').slice(0, 38)}"  texto=${r.textLength}`);
}
