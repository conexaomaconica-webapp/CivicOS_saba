const { execSync } = require('child_process');

const projectId = process.env.SUPABASE_PROJECT_ID;
const isLocal = process.argv.includes('--local');

if (isLocal) {
  console.log('Gerando tipos TypeScript do Supabase (Local)...');
  execSync('npx supabase gen types typescript --local > apps/web/src/types/database.types.ts', { stdio: 'inherit' });
} else {
  if (!projectId) {
    console.error('ERRO: A variável de ambiente SUPABASE_PROJECT_ID não está configurada.');
    console.error('Uso: SUPABASE_PROJECT_ID="seu-ref" pnpm run types:supabase');
    process.exit(1);
  }
  console.log(`Gerando tipos TypeScript do Supabase para o projeto ref: ${projectId}...`);
  execSync(`npx supabase gen types typescript --project-id "${projectId}" --schema public > apps/web/src/types/database.types.ts`, { stdio: 'inherit' });
}
