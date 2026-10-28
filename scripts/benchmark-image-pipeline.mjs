import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(path.resolve(__dirname, '../apps/web/package.json'));
const { chromium } = require('@playwright/test');
const rootDir = path.resolve(__dirname, '..');
const webPublicDir = path.resolve(rootDir, 'apps', 'web', 'public');

// Representative test images from the project
const testImages = [
  {
    name: 'convite-lancamento-conexao.jpg',
    path: path.join(webPublicDir, 'convite-lancamento-conexao.jpg'),
    type: 'image/jpeg',
    target: 'cover',
  },
  {
    name: 'entrecolunas-og.jpg',
    path: path.join(webPublicDir, 'entrecolunas-og.jpg'),
    type: 'image/jpeg',
    target: 'gallery',
  },
  {
    name: 'capafallback.png',
    path: path.join(webPublicDir, 'capafallback.png'),
    type: 'image/png',
    target: 'cover',
  },
  {
    name: 'logo-generico-comab.png',
    path: path.join(webPublicDir, 'lojas', 'genericos', 'logo-generico-comab.png'),
    type: 'image/png',
    target: 'logo',
  },
  {
    name: 'logoconexao_red.png',
    path: path.join(webPublicDir, 'logoconexao_red.png'),
    type: 'image/png',
    target: 'logo',
  },
];

async function runBenchmark() {
  console.log('================================================================');
  console.log('   CONEXÃO MAÇÔNICA — BENCHMARK DE COMPRESSÃO E ENQUADRAMENTO   ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  // Load a blank page with canvas support
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head><title>Image Benchmark</title></head>
      <body>
        <canvas id="canvas"></canvas>
      </body>
    </html>
  `);

  const results = [];

  for (const item of testImages) {
    if (!fs.existsSync(item.path)) {
      console.warn(`[SKIP] Arquivo não encontrado: ${item.path}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(item.path);
    const originalBytes = fileBuffer.length;
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${item.type};base64,${base64Data}`;

    // Execute in-browser compression test
    const benchmarkResult = await page.evaluate(
      async ({ dataUri, originalBytes, target, name }) => {
        const startTime = performance.now();

        // 1. Load image
        const img = new Image();
        img.src = dataUri;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error('Falha ao decodificar imagem'));
        });

        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // Framing specs (from image-framing.ts)
        const specs = {
          logo: { width: 1000, height: 1000, fit: 'contain', background: '#ffffff' },
          cover: { width: 1920, height: 720, fit: 'cover', background: '#f5f5f4' },
          gallery: { width: 1600, height: 1200, fit: 'cover', background: '#f5f5f4' },
        };
        const spec = specs[target] || specs.gallery;

        // 2. Client-side Framing & WebP 0.88 Rendering
        const canvas = document.createElement('canvas');
        canvas.width = spec.width;
        canvas.height = spec.height;
        const ctx = canvas.getContext('2d', { alpha: true });

        // Background fill
        if (spec.background) {
          ctx.fillStyle = spec.background;
          ctx.fillRect(0, 0, spec.width, spec.height);
        }

        // Framing math
        const base =
          spec.fit === 'cover'
            ? Math.max(spec.width / naturalWidth, spec.height / naturalHeight)
            : Math.min(spec.width / naturalWidth, spec.height / naturalHeight);
        const drawW = naturalWidth * base;
        const drawH = naturalHeight * base;
        const dx = (spec.width - drawW) * 0.5;
        const dy = (spec.height - drawH) * 0.5;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Convert to WebP at quality 0.88
        const framedBlob = await new Promise((res) => {
          canvas.toBlob(res, 'image/webp', 0.88);
        });

        const framedBytes = framedBlob.size;

        // 3. Progressive optimizeImageForUpload simulation (if maxBytes constraint applied)
        // Let's also test progressive compression with 1.5MB maxBytes
        let progressiveBlob = framedBlob;
        let progressiveAttempts = 1;
        let curQuality = 0.86;
        let curW = spec.width;
        let curH = spec.height;

        if (framedBytes > 1_500_000) {
          for (let attempt = 0; attempt < 10; attempt++) {
            progressiveAttempts++;
            const pCanvas = document.createElement('canvas');
            pCanvas.width = curW;
            pCanvas.height = curH;
            const pCtx = pCanvas.getContext('2d', { alpha: true });
            pCtx.imageSmoothingEnabled = true;
            pCtx.imageSmoothingQuality = 'high';
            pCtx.drawImage(canvas, 0, 0, curW, curH);
            const b = await new Promise((res) => pCanvas.toBlob(res, 'image/webp', curQuality));
            if (b.size <= 1_500_000) {
              progressiveBlob = b;
              break;
            }
            if (curQuality > 0.56) curQuality -= 0.08;
            else {
              curW = Math.max(1, Math.round(curW * 0.85));
              curH = Math.max(1, Math.round(curH * 0.85));
            }
          }
        }

        const endTime = performance.now();

        return {
          name,
          target,
          originalBytes,
          naturalDimensions: `${naturalWidth}x${naturalHeight}`,
          framedDimensions: `${spec.width}x${spec.height}`,
          framedBytes,
          format: 'image/webp',
          reductionFramedPct: (
            ((originalBytes - framedBytes) / originalBytes) *
            100
          ).toFixed(1),
          processingTimeMs: Math.round(endTime - startTime),
        };
      },
      { dataUri, originalBytes, target: item.target, name: item.name }
    );

    results.push(benchmarkResult);
  }

  // Also test synthetic heavy image: 4000x3000 synthetic photo with gradient & text
  const heavySyntheticResult = await page.evaluate(async () => {
    const startTime = performance.now();
    const synthCanvas = document.createElement('canvas');
    synthCanvas.width = 3840;
    synthCanvas.height = 2160;
    const synthCtx = synthCanvas.getContext('2d');
    
    // Create rich pattern to simulate high frequency photo
    const grad = synthCtx.createLinearGradient(0, 0, 3840, 2160);
    grad.addColorStop(0, '#3b0b14');
    grad.addColorStop(0.5, '#c9a227');
    grad.addColorStop(1, '#1c1917');
    synthCtx.fillStyle = grad;
    synthCtx.fillRect(0, 0, 3840, 2160);
    
    // Draw complex noise/shapes
    for (let i = 0; i < 200; i++) {
      synthCtx.fillStyle = `rgba(${i % 255}, ${(i * 3) % 255}, ${(i * 7) % 255}, 0.6)`;
      synthCtx.fillRect((i * 47) % 3800, (i * 31) % 2100, 150, 150);
    }

    const uncompressedBlob = await new Promise((res) => synthCanvas.toBlob(res, 'image/png'));
    const originalBytes = uncompressedBlob.size;

    // Run cover framing (1920x720)
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 1920;
    outCanvas.height = 720;
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(synthCanvas, 0, 0, 1920, 720);

    const framedBlob = await new Promise((res) => outCanvas.toBlob(res, 'image/webp', 0.88));
    const endTime = performance.now();

    return {
      name: '4K-Heavy-Synthetic-Raw.png',
      target: 'cover',
      originalBytes,
      naturalDimensions: '3840x2160',
      framedDimensions: '1920x720',
      framedBytes: framedBlob.size,
      format: 'image/webp',
      reductionFramedPct: (((originalBytes - framedBlob.size) / originalBytes) * 100).toFixed(1),
      processingTimeMs: Math.round(endTime - startTime),
    };
  });

  results.push(heavySyntheticResult);

  await browser.close();

  // Print results table
  console.log('| Imagem de Teste | Tipo Alvo | Dimensões Originais | Dimensões Finais | Peso Original | Peso Otimizado | Redução (%) | Formato | Tempo Processamento |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const r of results) {
    const origKb = (r.originalBytes / 1024).toFixed(1) + ' KB';
    const optKb = (r.framedBytes / 1024).toFixed(1) + ' KB';
    console.log(
      `| \`${r.name}\` | ${r.target} | ${r.naturalDimensions} | ${r.framedDimensions} | ${origKb} | **${optKb}** | **-${r.reductionFramedPct}%** | \`${r.format}\` | ${r.processingTimeMs} ms |`
    );
  }

  console.log('\n[OK] Benchmark de compressão concluído com sucesso.');
  return results;
}

runBenchmark().catch((err) => {
  console.error('[ERRO NO BENCHMARK]:', err);
  process.exit(1);
});
