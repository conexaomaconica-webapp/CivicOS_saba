// Etapa 1 — relatório de correspondência entre arquivos de brasão e lojas cadastradas (SOMENTE LEITURA).
//
// Uso:  node scripts/lodge-crests-match.mjs "<pasta com os brasões>" [pasta de saída]
// Lê apps/web/.env.local (URL e chave de serviço; nada é impresso). Só faz SELECT em public.organizations.
// Gera na pasta de saída (padrão: a pasta pai dos brasões):
//   relatorio-brasoes.csv      -> uma linha por arquivo, com loja sugerida, alternativas e coluna para você confirmar
//   lojas-sem-brasao.csv       -> lojas sem arquivo e sem brasão no banco (usarão o genérico da potência)
// Confira o Project Ref antes de rodar: o script aborta se a URL não for a esperada (EXPECTED_REF).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const EXPECTED_REF = 'rwvztwsjcjljphqttiws';
const TENANT_ID = '00000000-0000-0000-0000-000000000000'; // tenant canônico da Conexão (não usar ...0010)
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

const folder = process.argv[2];
if (!folder || !fs.existsSync(folder)) {
  console.error('Informe a pasta dos brasões: node scripts/lodge-crests-match.mjs "<pasta>" [saída]');
  process.exit(1);
}
const outDir = process.argv[3] || path.dirname(path.resolve(folder));

// --- ambiente (sem imprimir segredos) ---
const root = path.resolve(import.meta.dirname, '..');
const envPath = path.join(root, 'apps/web/.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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

// --- normalização e similaridade ---
const STOP = new Set([
  'loja', 'lojas', 'arls', 'arbls', 'arl', 'arbl', 'maconica', 'augusta', 'respeitavel', 'benemerita',
  'simbolica', 'no', 'n', 'nr', 'numero', 'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'i', 'r', 'l', 's', 'b', 'gob', 'cmsb', 'comab', 'gosp', 'grande', 'oriente', 'brasil',
]);

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function tokens(text) {
  return normalize(text).split(' ').filter((t) => t && !STOP.has(t));
}
function similarity(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const jaccard = inter / (A.size + B.size - inter);
  const containment = inter / Math.min(A.size, B.size);
  return Math.round((0.5 * jaccard + 0.5 * containment) * 100) / 100;
}

// --- arquivos ---
const files = fs
  .readdirSync(folder)
  .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
  .filter((f) => !/logo-generico/i.test(f))
  .sort();

function parseFile(file) {
  const base = path.basename(file, path.extname(file));
  const m = base.match(/^(\d{1,5})-(.+)$/);
  return { number: m ? Number(m[1]) : null, nameTokens: tokens(m ? m[2] : base) };
}

// --- lojas (somente leitura) ---
async function fetchLodges() {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, code_number, potency, logo_url, emblem_url')
      .eq('tenant_id', TENANT_ID)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Falha ao ler organizations: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

const lodges = (await fetchLodges()).map((l) => ({ ...l, nameTokens: tokens(l.name) }));
console.log(`Lojas no tenant da Conexão: ${lodges.length} | Arquivos de brasão: ${files.length}`);

// --- correspondência ---
const usedLodgeIds = new Map(); // loja -> arquivos que a escolheram (detecta conflito)
const report = files.map((file) => {
  const { number, nameTokens } = parseFile(file);
  const scored = lodges
    .map((l) => {
      const nameSim = similarity(nameTokens, l.nameTokens);
      const numberMatch = number !== null && l.code_number === number;
      // Número só ajuda quando bate; se não bate, o número do arquivo pode ser mera sequência: não penaliza.
      // Sem teto: o bônus do número precisa desempatar lojas de mesmo nome em potências diferentes.
      const score = nameSim + (numberMatch ? 0.25 : 0);
      return { lodge: l, nameSim, numberMatch, score: Math.round(score * 100) / 100 };
    })
    .sort((x, y) => y.score - x.score);

  const top = scored[0];
  const second = scored[1];
  const margin = top && second ? top.score - second.score : top?.score ?? 0;

  let status = 'sem_correspondencia';
  if (top && top.score >= 0.5) {
    const rivalByNumber = second && second.numberMatch && second.nameSim >= 0.5;
    const strongByNumber = top.numberMatch && top.nameSim >= 0.5 && !rivalByNumber;
    const strongByName = top.nameSim >= 0.85 && margin >= 0.15;
    status = strongByNumber || strongByName ? 'alta' : 'ambigua';
  }
  if (status === 'alta') {
    const arr = usedLodgeIds.get(top.lodge.id) ?? [];
    arr.push(file);
    usedLodgeIds.set(top.lodge.id, arr);
  }
  return { file, number, status, top, alternatives: scored.slice(0, 3).filter((s) => s.score >= 0.3) };
});

// Duas "altas" para a mesma loja viram "ambigua": a revisão decide qual arquivo vale.
for (const r of report) {
  if (r.status === 'alta' && (usedLodgeIds.get(r.top.lodge.id)?.length ?? 0) > 1) r.status = 'ambigua';
}

// --- CSV ---
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = (header, rows) =>
  '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';

const fmtAlt = (s) =>
  `${s.lodge.id} | ${s.lodge.name} | nº ${s.lodge.code_number ?? '-'} | ${s.lodge.potency ?? '-'} | ${s.score}`;

const reportRows = report.map((r) => {
  const t = r.top;
  const suggested = r.status === 'sem_correspondencia' || !t ? null : t.lodge;
  return [
    r.file,
    r.number ?? '',
    r.status,
    suggested?.id ?? '',
    suggested?.name ?? '',
    suggested?.code_number ?? '',
    suggested?.potency ?? '',
    t ? Math.min(1, t.score) : '',
    suggested && (suggested.logo_url || suggested.emblem_url) ? 'sim' : suggested ? 'nao' : '',
    r.alternatives.map(fmtAlt).join('  ##  '),
    '', // loja_id_confirmada: preencher na revisão
  ];
});

fs.mkdirSync(outDir, { recursive: true });
const reportFile = path.join(outDir, 'relatorio-brasoes.csv');
fs.writeFileSync(
  reportFile,
  csv(
    ['arquivo', 'numero_no_arquivo', 'status', 'loja_id_sugerida', 'loja_sugerida', 'numero_loja', 'potencia', 'similaridade', 'loja_ja_tem_brasao', 'alternativas', 'loja_id_confirmada'],
    reportRows
  )
);

// Lojas sem arquivo escolhido e sem brasão no banco -> usarão o genérico da potência
const matchedIds = new Set(report.filter((r) => r.status !== 'sem_correspondencia' && r.top).map((r) => r.top.lodge.id));
const withoutCrest = lodges.filter((l) => !l.logo_url && !l.emblem_url && !matchedIds.has(l.id));
const withoutFile = path.join(outDir, 'lojas-sem-brasao.csv');
fs.writeFileSync(
  withoutFile,
  csv(
    ['loja_id', 'loja', 'numero_loja', 'potencia'],
    withoutCrest.map((l) => [l.id, l.name, l.code_number ?? '', l.potency ?? ''])
  )
);

const count = (s) => report.filter((r) => r.status === s).length;
console.log(`Alta confiança: ${count('alta')} | Ambígua: ${count('ambigua')} | Sem correspondência: ${count('sem_correspondencia')}`);
console.log(`Lojas sem brasão (usarão genérico da potência): ${withoutCrest.length}`);
console.log(`Relatórios: ${reportFile}\n            ${withoutFile}`);
