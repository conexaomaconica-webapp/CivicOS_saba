// Etapa 3 — envia os brasões já conferidos e grava organizations.logo_url.
//
// Uso:
//   node scripts/lodge-crests-upload.mjs "<pasta dos brasões>" "<relatorio-brasoes.csv>"            (SIMULAÇÃO: não grava nada)
//   node scripts/lodge-crests-upload.mjs "<pasta>" "<relatorio.csv>" --apply                         (envia e grava)
//   Opções: --overwrite  também substitui brasão de loja que já tem logo_url/emblem_url
//
// Regra de seleção por linha do relatório: usa `loja_id_confirmada` (sua revisão); se vazia, usa a sugestão
// APENAS quando o status for "alta". Linhas ambíguas/sem correspondência e sem confirmação são ignoradas.
// Sugestão "alta" com número do arquivo diferente do cadastro NÃO é enviada sem loja_id_confirmada.
// Duas linhas apontando para a mesma loja são ignoradas (conflito) até você resolver no CSV.
// Lê apps/web/.env.local (nada é impresso). Aborta se a URL não for a do projeto esperado.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const EXPECTED_REF = 'rwvztwsjcjljphqttiws';
const TENANT_ID = '00000000-0000-0000-0000-000000000000'; // tenant canônico da Conexão (não usar ...0010)
const BUCKET = 'business-assets';
const MAX_BYTES = 1_500_000; // mesmo limite do editor (LODGE_IMAGE_MAX_OPTIMIZED_BYTES)

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const overwrite = args.includes('--overwrite');
const [folder, reportPath] = args.filter((a) => !a.startsWith('--'));
if (!folder || !reportPath || !fs.existsSync(folder) || !fs.existsSync(reportPath)) {
  console.error('Uso: node scripts/lodge-crests-upload.mjs "<pasta>" "<relatorio-brasoes.csv>" [--apply] [--overwrite]');
  process.exit(1);
}

// --- ambiente ---
const root = path.resolve(import.meta.dirname, '..');
const env = {};
for (const line of fs.readFileSync(path.join(root, 'apps/web/.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente em apps/web/.env.local');
  process.exit(1);
}
if (!url.includes(`${EXPECTED_REF}.supabase.co`)) {
  console.error(`Abortado: a URL do Supabase não é do projeto esperado (${EXPECTED_REF}).`);
  process.exit(1);
}

const require = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key, { auth: { persistSession: false } });

let sharp = null;
try {
  const pnpmDir = path.join(root, 'node_modules/.pnpm');
  const dir = fs.readdirSync(pnpmDir).find((d) => d.startsWith('sharp@'));
  if (dir) sharp = createRequire(path.join(pnpmDir, dir, 'node_modules', 'sharp', 'package.json'))('sharp');
} catch {
  sharp = null;
}

// --- CSV (separador ;, aspas duplas) ---
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ';') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const [header, ...lines] = parseCsv(fs.readFileSync(reportPath, 'utf8'));
const col = (name) => header.indexOf(name);
const iFile = col('arquivo');
const iStatus = col('status');
const iSuggested = col('loja_id_sugerida');
const iConfirmed = col('loja_id_confirmada');
if ([iFile, iStatus, iSuggested, iConfirmed].some((i) => i < 0)) {
  console.error('Relatório inválido: colunas esperadas não encontradas.');
  process.exit(1);
}

// --- seleção ---
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plan = [];
const ignored = [];
for (const r of lines) {
  const file = r[iFile];
  const confirmed = (r[iConfirmed] || '').trim();
  const suggested = (r[iSuggested] || '').trim();
  const lodgeId = confirmed || (r[iStatus] === 'alta' ? suggested : '');
  if (!lodgeId) {
    ignored.push({ file, reason: `sem loja confirmada (status: ${r[iStatus]})` });
    continue;
  }
  if (!UUID.test(lodgeId)) {
    ignored.push({ file, reason: `loja_id_confirmada inválido: "${lodgeId}"` });
    continue;
  }
  if (!fs.existsSync(path.join(folder, file))) {
    ignored.push({ file, reason: 'arquivo não encontrado na pasta' });
    continue;
  }
  plan.push({ file, lodgeId, source: confirmed ? 'confirmada' : 'alta' });
}

// Conflito: duas linhas para a mesma loja
const byLodge = new Map();
for (const p of plan) byLodge.set(p.lodgeId, [...(byLodge.get(p.lodgeId) ?? []), p]);
const finalPlan = [];
for (const [, group] of byLodge) {
  if (group.length > 1) group.forEach((g) => ignored.push({ file: g.file, reason: 'conflito: mais de um arquivo para a mesma loja' }));
  else finalPlan.push(group[0]);
}

// --- lojas no banco ---
const ids = finalPlan.map((p) => p.lodgeId);
const { data: lodges, error: lodgesError } = ids.length
  ? await supabase.from('organizations').select('id, name, tenant_id, code_number, logo_url, emblem_url').eq('tenant_id', TENANT_ID).in('id', ids)
  : { data: [], error: null };
if (lodgesError) {
  console.error(`Falha ao ler organizations: ${lodgesError.message}`);
  process.exit(1);
}
const lodgeById = new Map(lodges.map((l) => [l.id, l]));

const toSend = [];
for (const p of finalPlan) {
  const lodge = lodgeById.get(p.lodgeId);
  if (!lodge) {
    ignored.push({ file: p.file, reason: 'loja não encontrada no tenant da Conexão' });
  } else if (p.source === 'alta' && /^\d{1,5}-/.test(p.file) && lodge.code_number !== Number(p.file.match(/^(\d{1,5})-/)[1])) {
    // Sugestão automática com número divergente: pode ser outra loja de mesmo nome. Só segue com confirmação explícita.
    ignored.push({ file: p.file, reason: `número do arquivo (${p.file.match(/^(\d{1,5})-/)[1]}) difere do cadastro (${lodge.code_number}) de "${lodge.name}": confirme em loja_id_confirmada` });
  } else if ((lodge.logo_url || lodge.emblem_url) && !overwrite) {
    ignored.push({ file: p.file, reason: `loja "${lodge.name}" já tem brasão (use --overwrite para substituir)` });
  } else {
    toSend.push({ ...p, lodge });
  }
}

console.log(`${apply ? 'APLICANDO' : 'SIMULAÇÃO'} | projeto ${EXPECTED_REF} | tenant ${TENANT_ID}`);
console.log(`A enviar: ${toSend.length} | Ignorados: ${ignored.length}${sharp ? '' : ' | sharp indisponível: envia o arquivo original'}`);
for (const t of toSend) console.log(`  ✔ ${t.file}  ->  ${t.lodge.name}  (${t.source})`);
for (const i of ignored) console.log(`  – ${i.file}: ${i.reason}`);

const results = [];
if (apply) {
  for (const t of toSend) {
    try {
      const original = fs.readFileSync(path.join(folder, t.file));
      let body = original;
      let ext = path.extname(t.file).toLowerCase().replace('.', '') || 'jpg';
      let contentType = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
      if (sharp && ext !== 'svg') {
        body = await sharp(original)
          .rotate()
          .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        ext = 'webp';
        contentType = 'image/webp';
      }
      if (body.length > MAX_BYTES) throw new Error(`imagem muito grande após otimização (${body.length} bytes)`);

      const filePath = `${TENANT_ID}/lodges/${t.lodgeId}/logo/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, body, { contentType, upsert: true });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

      const { error: updErr } = await supabase
        .from('organizations')
        .update({ logo_url: pub.publicUrl })
        .eq('id', t.lodgeId)
        .eq('tenant_id', TENANT_ID);
      if (updErr) throw new Error(`update: ${updErr.message}`);

      results.push([t.file, t.lodgeId, t.lodge.name, 'ok', pub.publicUrl]);
      console.log(`  ✔ enviado: ${t.file}`);
    } catch (err) {
      results.push([t.file, t.lodgeId, t.lodge.name, 'erro', err instanceof Error ? err.message : String(err)]);
      console.error(`  ✖ ${t.file}: ${err instanceof Error ? err.message : err}`);
    }
  }
  const out = path.join(path.dirname(path.resolve(reportPath)), 'resultado-envio-brasoes.csv');
  const rows = [['arquivo', 'loja_id', 'loja', 'resultado', 'url_ou_erro'], ...results, ...ignored.map((i) => [i.file, '', '', 'ignorado', i.reason])];
  fs.writeFileSync(out, '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n');
  const ok = results.filter((r) => r[3] === 'ok').length;
  console.log(`Concluído: ${ok} enviados, ${results.length - ok} com erro. Resultado: ${out}`);
} else {
  console.log('Nada foi gravado. Para aplicar, rode de novo com --apply.');
}
