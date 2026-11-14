import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', 'src', rel), 'utf8');
const root = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', '..', rel), 'utf8');

describe('Gate 1C.2 · contrato do representante (estático)', () => {
  const service = src('lib/commercial/contract-service.ts');
  const queries = src('lib/commercial/contract-queries.ts');
  const layout = src('app/representante/layout.tsx');
  const migration = root('supabase/migrations/241_commercial_representative_contract.sql');

  it('o aceite passa pela função do banco e a versão/hash são conferidos no banco', () => {
    expect(service).toMatch(/rpc\('commercial_accept_representative_contract'/);
    expect(service).not.toMatch(/createHash|crypto/);
    expect(migration).toMatch(/sha256\(convert_to\(p_content/);
    expect(migration).toMatch(/version_changed/);
  });

  it('publicar exige settings.manage e justificativa, e é auditado', () => {
    expect(service).toMatch(/tryCommercialPermission\('settings\.manage'\)/);
    expect(service).toMatch(/reason\.length < 10/);
    expect(service).toMatch(/COMMERCIAL_CONTRACT_PUBLISHED/);
  });

  it('o aceite exige o representante logado e módulo ligado', () => {
    expect(service).toMatch(/isCommercialModuleEnvEnabled\(\)/);
    expect(service).toMatch(/getRepresentativeContext\(\)/);
  });

  it('a área do representante exibe o aceite antes do conteúdo e não bloqueia desligados', () => {
    expect(layout).toMatch(/getContractGate\(ctx\.tenantId, ctx\.userId\)/);
    expect(layout).toMatch(/contractGate\.required \?/);
    expect(layout).toMatch(/'suspended' \|\| representative\.status === 'terminated'/);
  });

  it('a leitura do gate é só de servidor e falha sem trancar o representante', () => {
    expect(queries).toMatch(/import 'server-only'/);
    expect(queries).toMatch(/commercial\.contract_gate_failed/);
  });

  it('migration 241: tabela só para service_role, imutável e sem exclusão', () => {
    expect(migration).toMatch(/REVOKE ALL ON public\.commercial_contract_versions FROM PUBLIC, anon, authenticated/);
    expect(migration).not.toMatch(/GRANT[^;]*commercial_contract_versions[^;]*\bTO\b[^;]*\b(anon|authenticated)\b/i);
    expect(migration).toMatch(/não admite exclusão/);
    expect(migration).toMatch(/uq_commercial_contract_one_active/);
  });

  it('o código não embute texto de contrato (o texto é publicado pela equipe)', () => {
    for (const f of ['lib/commercial/contract-service.ts', 'app/representante/contract-acceptance.tsx', 'app/comercial/configuracoes/contract-client.tsx']) {
      expect(src(f)).not.toMatch(/CONTRATANTE|CONTRATADA|CLÁUSULA/i);
    }
  });

  it('migrations anteriores permanecem inalteradas (apenas adições)', () => {
    expect(fs.existsSync(path.resolve(__dirname, '..', '..', '..', 'supabase/migrations/241_commercial_representative_contract.sql'))).toBe(true);
  });
});
