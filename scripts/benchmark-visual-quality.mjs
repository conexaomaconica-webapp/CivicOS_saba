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

const testImages = [
  {
    name: 'convite-lancamento-conexao.jpg',
    path: path.join(webPublicDir, 'convite-lancamento-conexao.jpg'),
    type: 'image/jpeg',
    target: 'cover',
  },
  {
    name: 'logo-generico-comab.png',
    path: path.join(webPublicDir, 'lojas', 'genericos', 'logo-generico-comab.png'),
    type: 'image/png',
    target: 'logo',
  },
  {
    name: 'entrecolunas-og.jpg',
    path: path.join(webPublicDir, 'entrecolunas-og.jpg'),
    type: 'image/jpeg',
    target: 'gallery',
  },
];

async function runVisualQualityAudit() {
  console.log('================================================================');
  console.log('   CONEXÃO MAÇÔNICA — AUDITORIA DE QUALIDADE VISUAL (PSNR/MAE)  ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  await page.setContent(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);

  const results = [];

  for (const item of testImages) {
    const fileBuffer = fs.readFileSync(item.path);
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${item.type};base64,${base64Data}`;

    const qualityMetrics = await page.evaluate(
      async ({ dataUri, target, name }) => {
        const img = new Image();
        img.src = dataUri;
        await new Promise((res) => (img.onload = res));

        const specs = {
          logo: { width: 1000, height: 1000, fit: 'contain', background: '#ffffff' },
          cover: { width: 1920, height: 720, fit: 'cover', background: '#f5f5f4' },
          gallery: { width: 1600, height: 1200, fit: 'cover', background: '#f5f5f4' },
        };
        const spec = specs[target];

        // 1. Draw to uncompressed canvas
        const canvas1 = document.createElement('canvas');
        canvas1.width = spec.width;
        canvas1.height = spec.height;
        const ctx1 = canvas1.getContext('2d');
        if (spec.background) {
          ctx1.fillStyle = spec.background;
          ctx1.fillRect(0, 0, spec.width, spec.height);
        }
        const base =
          spec.fit === 'cover'
            ? Math.max(spec.width / img.naturalWidth, spec.height / img.naturalHeight)
            : Math.min(spec.width / img.naturalWidth, spec.height / img.naturalHeight);
        const drawW = img.naturalWidth * base;
        const drawH = img.naturalHeight * base;
        const dx = (spec.width - drawW) * 0.5;
        const dy = (spec.height - drawH) * 0.5;
        ctx1.imageSmoothingEnabled = true;
        ctx1.imageSmoothingQuality = 'high';
        ctx1.drawImage(img, dx, dy, drawW, drawH);

        const originalImageData = ctx1.getImageData(0, 0, spec.width, spec.height);

        // 2. Encode to WebP 0.88
        const webpBlob = await new Promise((res) => canvas1.toBlob(res, 'image/webp', 0.88));

        // 3. Decode WebP back to another canvas
        const webpUrl = URL.createObjectURL(webpBlob);
        const webpImg = new Image();
        webpImg.src = webpUrl;
        await new Promise((res) => (webpImg.onload = res));

        const canvas2 = document.createElement('canvas');
        canvas2.width = spec.width;
        canvas2.height = spec.height;
        const ctx2 = canvas2.getContext('2d');
        ctx2.drawImage(webpImg, 0, 0);

        const decodedImageData = ctx2.getImageData(0, 0, spec.width, spec.height);
        URL.revokeObjectURL(webpUrl);

        // 4. Calculate Mean Squared Error (MSE), Peak Signal-to-Noise Ratio (PSNR), and Mean Absolute Error (MAE)
        const d1 = originalImageData.data;
        const d2 = decodedImageData.data;
        let sumSquaredError = 0;
        let sumAbsoluteError = 0;
        const totalSamples = spec.width * spec.height * 3; // RGB channels

        for (let i = 0; i < d1.length; i += 4) {
          const dr = d1[i] - d2[i];
          const dg = d1[i + 1] - d2[i + 1];
          const db = d1[i + 2] - d2[i + 2];
          sumSquaredError += dr * dr + dg * dg + db * db;
          sumAbsoluteError += Math.abs(dr) + Math.abs(dg) + Math.abs(db);
        }

        const mse = sumSquaredError / totalSamples;
        const mae = sumAbsoluteError / totalSamples;
        const psnr = mse === 0 ? 99.9 : 10 * Math.log10((255 * 255) / mse);

        return {
          name,
          target,
          mse: mse.toFixed(2),
          mae: mae.toFixed(2),
          psnr: psnr.toFixed(1),
          qualityAssessment:
            psnr >= 40
              ? 'Excelente (degradação imperceptível ao olho humano)'
              : psnr >= 35
              ? 'Boa (alta fidelidade visual, leve atenuação em alta frequência)'
              : 'Aceitável (compressão perceptível sob ampliação)',
        };
      },
      { dataUri, target: item.target, name: item.name }
    );

    results.push(qualityMetrics);
  }

  await browser.close();

  console.log('| Imagem de Teste | Alvo | MSE (Erro Médio²) | MAE (Erro Absoluto / 255) | PSNR (dB) | Avaliação Visual Técnica |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const r of results) {
    console.log(`| \`${r.name}\` | ${r.target} | ${r.mse} | ${r.mae} / 255 | **${r.psnr} dB** | ${r.qualityAssessment} |`);
  }

  console.log('\n[OK] Avaliação de qualidade visual concluída.');
}

runVisualQualityAudit().catch((err) => {
  console.error('[ERRO NO AUDIT DE QUALIDADE]:', err);
  process.exit(1);
});
