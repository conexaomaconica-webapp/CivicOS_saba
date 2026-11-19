import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Trava de regressão: pedir uma coluna que NÃO existe em business_locations faz o PostgREST recusar a consulta inteira, e a página
 * perde a localização em silêncio (foi o que aconteceu com a coluna "address" no modo preview).
 * Colunas reais: migration 007 (+ city_ibge_code da 093).
 */
const REAL_COLUMNS = new Set([
  'id', 'tenant_id', 'business_id', 'title', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'postal_code',
  'country', 'latitude', 'longitude', 'is_headquarters', 'created_at', 'updated_at', 'city_ibge_code',
]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

describe('consultas a business_locations só pedem colunas que existem', () => {
  it('nenhum .select() em src/ usa coluna inexistente', () => {
    const root = path.resolve(__dirname, '../src');
    const problems: string[] = [];
    let checked = 0;
    for (const file of sourceFiles(root)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(/from\('business_locations'\)\s*\.select\('([^']*)'/g)) {
        const columns = match[1]!.split(',').map((c) => c.trim()).filter((c) => c && c !== '*' && !c.includes('('));
        checked += 1;
        for (const column of columns) {
          if (!REAL_COLUMNS.has(column)) problems.push(`${path.relative(root, file)}: coluna "${column}"`);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});
