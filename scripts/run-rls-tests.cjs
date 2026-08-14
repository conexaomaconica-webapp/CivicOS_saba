/* eslint-env node */
// ============================================================================
// Local-only RLS runner
// ============================================================================
// Rebuilds the LOCAL Supabase database, then executes every SQL file under
// supabase/tests/rls in lexical order. There is intentionally no --linked or
// remote mode in this script.
// ============================================================================

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUPABASE_DIR = path.join(REPO_ROOT, 'supabase');
const RLS_TEST_DIR = path.join(SUPABASE_DIR, 'tests', 'rls');

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

function runCli(args) {
  const forbidden = new Set(['--linked', '--db-url']);
  if (args.some((arg) => forbidden.has(arg))) {
    throw new Error('Runner RLS aceita somente o banco Supabase local.');
  }

  process.stdout.write(`\n$ supabase ${args.join(' ')}\n`);
  const result = spawnSync(findSupabaseCli(), args, {
    cwd: SUPABASE_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw new Error(`Falha ao executar Supabase CLI: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`supabase ${args[0]} falhou (exit ${result.status ?? 1})`);
  }
}

if (!fs.existsSync(RLS_TEST_DIR)) {
  throw new Error(`Diretorio de testes RLS inexistente: ${RLS_TEST_DIR}`);
}

const testFiles = fs
  .readdirSync(RLS_TEST_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => path.join(RLS_TEST_DIR, entry.name))
  .sort((left, right) => left.localeCompare(right));

if (testFiles.length === 0) {
  throw new Error('Nenhum teste SQL de RLS foi encontrado.');
}

// Local-only by construction. `supabase test db` usa pgTAP e executa os SQLs
// em ordem lexical, cada um dentro da transacao declarada pelo proprio teste.
runCli(['start', '--exclude', 'studio,analytics,imgproxy,inbucket']);
runCli(['db', 'reset', '--local']);
runCli(['db', 'lint', '--local', '--level', 'error']);
runCli(['test', 'db', 'tests/rls', '--local']);

process.stdout.write(`\nRLS OK (${testFiles.length} arquivo(s), banco local)\n`);
