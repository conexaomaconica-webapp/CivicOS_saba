import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Trava contra "falso sucesso": nos serviços do onboarding e do pagamento, toda gravação (insert/update/upsert/delete) precisa
 * tratar o erro do banco — guardando { error } ou usando .throwOnError(). Um INSERT bloqueado por política (RLS) ou por
 * coluna inexistente que era ignorado deixou o endereço da contratação "salvo" sem estar salvo.
 * Registro de auditoria e mapa de cliente do gateway seguem best-effort de propósito.
 */
const CRITICAL_FILES = [
  'src/lib/contracts/admin-contracts-service.ts',
  'src/lib/admin/admin-businesses-service.ts',
  'src/lib/admin/admin-approval-service.ts',
  'src/lib/payment/commercial-onboarding-charge-service.ts',
  'src/lib/payment/commercial-onboarding-webhook-service.ts',
  'src/lib/admin/admin-payments-service.ts',
  'src/lib/onboarding/onboarding-server-state.ts',
  'src/lib/admin/admin-advertiser-create-service.ts',
];
const BEST_EFFORT_TABLES = new Set(['admin_audit_logs', 'payment_customers']);

const STATEMENT_START =
  /^[ \t]*await\s+\(?\(?\w+(?:\s+as\s+any)?\)?\s*\n?\s*\.from\('([a-z_]+)'\)\s*\n?\s*\.(insert|update|upsert|delete)\(/gm;

function statementEnd(source: string, from: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < source.length; i += 1) {
    const char = source[i]!;
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
    } else if ('\'"`'.includes(char)) quote = char;
    else if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) depth -= 1;
    else if (char === ';' && depth === 0) return i;
  }
  return -1;
}

describe('gravações no banco não podem ignorar erro', () => {
  for (const file of CRITICAL_FILES) {
    it(file, () => {
      const source = readFileSync(resolve(__dirname, '..', file), 'utf8');
      const offenders: string[] = [];
      for (const match of source.matchAll(STATEMENT_START)) {
        if (BEST_EFFORT_TABLES.has(match[1]!)) continue;
        const end = statementEnd(source, match.index!);
        const statement = source.slice(match.index!, end);
        if (statement.includes('.throwOnError()') || /\.select\(/.test(statement.split('.from(')[1] ?? '')) continue;
        offenders.push(`linha ${source.slice(0, match.index!).split('\n').length}: ${match[1]}.${match[2]}`);
      }
      expect(offenders, `Gravações sem tratar erro (use .throwOnError() ou guarde { error }):\n${offenders.join('\n')}`).toEqual([]);
    });
  }
});
