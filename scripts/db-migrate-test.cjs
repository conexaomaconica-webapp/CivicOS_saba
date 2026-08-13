/* eslint-env node */
// ============================================================================
// db:migrate:test · Executa as migrations + seed num banco local e valida o
// smoke do Gate 1 (INF-001/002/003). Requer Docker e o CLI do Supabase.
// ============================================================================
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUPABASE_DIR = path.join(REPO_ROOT, 'supabase');

// --- Localiza o executável do CLI -------------------------------------------------
function findSupabaseCli() {
  const candidates = [
    process.env.SUPABASE_CLI_PATH,
    path.join(REPO_ROOT, 'supabase_cli', 'supabase.exe'),
    path.join(REPO_ROOT, 'supabase_cli', 'supabase'),
    'supabase',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'supabase' || fs.existsSync(candidate)) return candidate;
  }
  return 'supabase';
}

function runCli(cmd) {
  console.log(`\n$ supabase ${cmd.join(' ')}`);
  const res = spawnSync(findSupabaseCli(), cmd, {
    cwd: SUPABASE_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.error) {
    console.error(`FALHA ao executar supabase: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(`supabase ${cmd[0]} falhou (exit ${res.status}).`);
    process.exit(res.status || 1);
  }
  return res;
}

// --- Execução ------------------------------------------------------------------------
// 1. Garante stack local rodando (Docker). `db reset` sinaliza erro claro se ausente.
runCli(['start', '--exclude', 'studio,analytics,imgproxy,inbucket']);

// 2. Reset completo: migrations em ordem (001–028) + seed.sql.
runCli(['db', 'reset']);

// 3. Smoke do Gate 1: exceção no SQL -> exit != 0 -> script falha.
runCli(['db', 'query', '--local', '--file', path.join(SUPABASE_DIR, 'gate1-smoke.sql')]);

console.log('\nGATE 1 (db:migrate:test) OK — schema migrado, seed aplicado e smoke verde.');