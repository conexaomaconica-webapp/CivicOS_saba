import { createClient } from '../apps/web/node_modules/@supabase/supabase-js/dist/main/index.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) return '';
  return match[1].replace(/^["']|["']$/g, '').trim();
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('businesses')
    .select('commercial_status');

  if (error) {
    console.error('Error fetching businesses:', error);
    process.exit(1);
  }

  const counts = {};
  for (const row of data) {
    const status = row.commercial_status === null ? '<NULL>' : row.commercial_status;
    counts[status] = (counts[status] || 0) + 1;
  }

  console.log('--- COMMERCIAL STATUS COUNT ---');
  console.table(
    Object.entries(counts).map(([commercial_status, total]) => ({
      commercial_status,
      total,
    }))
  );
  console.log('Total businesses:', data.length);
}

run();
