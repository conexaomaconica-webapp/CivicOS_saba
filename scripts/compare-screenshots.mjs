// Compara duas capturas (PNG) pixel a pixel. Uso: node scripts/compare-screenshots.mjs <a.png> <b.png> [limiarPorCanal=24]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// sharp vive dentro do armazenamento do pnpm (não é dependência direta da raiz).
const require = createRequire(path.resolve('node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/package.json'));
const sharp = require('sharp');
const [a, b, thr = '24'] = process.argv.slice(2);
const limiar = Number(thr);
const load = async (f) => {
  const { data, info } = await sharp(fs.readFileSync(f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const A = await load(a);
const B = await load(b);
const w = Math.min(A.w, B.w);
const h = Math.min(A.h, B.h);
let diff = 0;
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const i = (y * A.w + x) * 4;
    const j = (y * B.w + x) * 4;
    if (Math.abs(A.data[i] - B.data[j]) > limiar || Math.abs(A.data[i + 1] - B.data[j + 1]) > limiar || Math.abs(A.data[i + 2] - B.data[j + 2]) > limiar) diff += 1;
  }
}
const total = w * h;
console.log(JSON.stringify({ a: path.basename(a), b: path.basename(b), tamanhoA: `${A.w}x${A.h}`, tamanhoB: `${B.w}x${B.h}`, mesmaAltura: A.h === B.h, pixelsDiferentes: diff, percentual: Number(((diff / total) * 100).toFixed(3)) }));
