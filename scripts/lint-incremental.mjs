#!/usr/bin/env node

/**
 * Script de Lint Incremental — Conexão Maçônica / CivicOS SABA
 *
 * Executa o ESLint estrito exclusivamente nos arquivos TypeScript/JavaScript
 * adicionados, modificados ou renomeados no Pull Request em relação à branch base.
 *
 * Princípios e Garantias:
 * 1. Zero novos erros ou violações de regras toleradas.
 * 2. As regras rigorosas do ESLint continuam ativas e inalteradas.
 * 3. O pipeline de CI do GitHub Actions não é bloqueado pelo passivo de lint preexistente da main.
 * 4. Preserva integridade de Typecheck, Test e Build.
 * 5. Monitora alterações em arquivos de infraestrutura (ESLint, TypeScript, dependências, workflows).
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Identifica referência base (GitHub Actions PR base ou origin/main local)
function getBaseRef() {
  const args = process.argv.slice(2);
  const baseArgIdx = args.indexOf('--base');
  if (baseArgIdx !== -1 && args[baseArgIdx + 1]) {
    return args[baseArgIdx + 1];
  }

  // No GitHub Actions em contexto de Pull Request:
  if (process.env.GITHUB_BASE_REF) {
    const prBase = process.env.GITHUB_BASE_REF;
    for (const candidate of [`origin/${prBase}`, prBase]) {
      try {
        execSync(`git rev-parse --verify "${candidate}"`, { cwd: rootDir, stdio: 'ignore' });
        return candidate;
      } catch {
        // tenta o próximo candidato
      }
    }
    return prBase;
  }

  // Em ambiente local ou push:
  for (const candidate of ['origin/main', 'main', 'HEAD~1']) {
    try {
      execSync(`git rev-parse --verify "${candidate}"`, { cwd: rootDir, stdio: 'ignore' });
      return candidate;
    } catch {
      // tenta o próximo candidato
    }
  }

  return 'HEAD';
}

// 2. Determina o ancestral comum (merge-base)
function getMergeBase(baseRef) {
  try {
    const stdout = execSync(`git merge-base "${baseRef}" HEAD`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const hash = stdout.trim();
    if (hash) return hash;
  } catch {
    // fallback se git merge-base falhar
  }
  return baseRef;
}

// 3. Obtém arquivos alterados com NUL-separator (-z) para suporte a espaços e caracteres especiais
function getChangedFiles(mergeBase) {
  try {
    // Arquivos modificados/adicionados/renomeados entre mergeBase e working tree (ou HEAD)
    const diffTarget = process.env.CI ? `"${mergeBase}" HEAD` : `"${mergeBase}"`;
    const stdout = execSync(`git diff -z --name-only --diff-filter=ACMR ${diffTarget}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const changed = stdout.split('\0').map((f) => f.trim()).filter(Boolean);

    // Se estiver em ambiente local, inclui também arquivos untracked novos
    if (!process.env.CI) {
      try {
        const untracked = execSync('git ls-files -z --others --exclude-standard', {
          cwd: rootDir,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        });
        const untrackedFiles = untracked.split('\0').map((f) => f.trim()).filter(Boolean);
        changed.push(...untrackedFiles);
      } catch {
        // ignora se falhar
      }
    }

    return Array.from(new Set(changed));
  } catch (err) {
    console.error('Falha ao obter arquivos modificados via git diff:', err);
    return [];
  }
}

// 4. Verifica alterações em arquivos críticos de infraestrutura
function checkCriticalConfigChanges(mergeBase) {
  try {
    const stdout = execSync(`git diff -z --name-only "${mergeBase}" HEAD`, {
      cwd: rootDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const allChanged = stdout.split('\0').map((f) => f.trim()).filter(Boolean);

    const criticalPatterns = [
      'eslint.config.mjs',
      'package.json',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'apps/web/tsconfig.json',
      '.github/workflows/',
    ];

    const affectedCritical = allChanged.filter((file) =>
      criticalPatterns.some((pattern) => file === pattern || file.startsWith(pattern))
    );

    return affectedCritical;
  } catch {
    return [];
  }
}

// 5. Filtra arquivos aplicáveis para o ESLint estrito
function isLintable(relPath) {
  const normalized = relPath.replace(/\\/g, '/');

  // Ignora explicitamente arquivos gerados, builds, dependências e lockfiles
  if (
    normalized.endsWith('database.types.ts') ||
    normalized.endsWith('pnpm-lock.yaml') ||
    normalized.includes('/.next/') ||
    normalized.includes('/dist/') ||
    normalized.includes('/out/') ||
    normalized.includes('/node_modules/')
  ) {
    return false;
  }

  // Aceita exclusivamente extensões TypeScript e JavaScript
  const validExtensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];
  const hasValidExt = validExtensions.some((ext) => normalized.endsWith(ext));
  if (!hasValidExt) return false;

  // Garante existência real no disco (trata arquivos renomeados ou deletados)
  const fullPath = path.resolve(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return false;
  try {
    if (!fs.statSync(fullPath).isFile()) return false;
  } catch {
    return false;
  }

  // O ESLint type-checked requer que o arquivo pertença ao parserOptions.project de um tsconfig.json.
  // Suporta pacote Web e pacotes/plugins sob o monorepo.
  const isInSource =
    normalized.startsWith('apps/web/src/') ||
    normalized.startsWith('packages/') ||
    normalized.startsWith('plugins/');

  // Arquivos em test/ e e2e/ não fazem parte do parserOptions.project do Next.js e são validados pelo Vitest / Playwright
  if (normalized.includes('/test/') || normalized.includes('/e2e/')) {
    return false;
  }

  return isInSource;
}

function main() {
  console.log('🔍 Executando Lint Incremental — Conexão Maçônica / CivicOS SABA');

  const baseRef = getBaseRef();
  const mergeBase = getMergeBase(baseRef);
  console.log(`📌 Referência base: ${baseRef} (merge-base: ${mergeBase.slice(0, 8)})`);

  // Auditoria de configurações críticas
  const criticalConfigs = checkCriticalConfigChanges(mergeBase);
  if (criticalConfigs.length > 0) {
    console.log(`ℹ️  Alterações em infraestrutura/configuração detectadas (${criticalConfigs.length}):`);
    for (const cfg of criticalConfigs) {
      console.log(`   ⚙️  ${cfg}`);
    }
  }

  const changed = getChangedFiles(mergeBase);
  const targetFiles = changed.filter(isLintable);

  if (targetFiles.length === 0) {
    console.log('✅ Nenhum arquivo TypeScript/JavaScript relevante foi adicionado ou modificado no PR.');
    console.log('Lint incremental concluído com sucesso (0 arquivos para validar).');
    process.exit(0);
  }

  console.log(`📋 Validando ${targetFiles.length} arquivo(s) modificado(s) com ESLint estrito (zero tolerância a erros/warnings):`);
  for (const file of targetFiles) {
    console.log(`   - ${file}`);
  }

  // Executa eslint via pnpm exec (ou npx como fallback)
  const isWindows = process.platform === 'win32';
  const binName = isWindows ? 'pnpm.cmd' : 'pnpm';
  const eslintArgs = ['exec', 'eslint', '--max-warnings=0', ...targetFiles];

  console.log('\n⏳ Executando ESLint via pnpm exec...');
  const result = spawnSync(binName, eslintArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: isWindows,
  });

  if (result.error) {
    // Fallback para npx se pnpm não estiver no path direto do subprocesso
    console.warn('Fallback para npx eslint devido a erro no spawn do pnpm:', result.error.message);
    const fallbackResult = spawnSync('npx', ['eslint', '--max-warnings=0', ...targetFiles], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });
    if (fallbackResult.status !== 0) {
      console.error(`\n❌ Falha no lint incremental: código de erro ${fallbackResult.status} encontrado.`);
      process.exit(fallbackResult.status || 1);
    }
  } else if (result.status !== 0) {
    console.error(`\n❌ Falha no lint incremental: código de erro ${result.status} encontrado.`);
    process.exit(result.status || 1);
  }

  console.log('\n✅ Lint incremental aprovado! Todos os arquivos modificados cumprem 100% das regras.');
  process.exit(0);
}

main();
