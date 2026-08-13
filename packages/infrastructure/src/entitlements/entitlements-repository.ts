// ============================================================================
// Entitlements Repository — INF-005
// ============================================================================
// Persistence contract and PostgreSQL implementation for the entitlements
// core, aligned with migration 013_entitlements_engine.sql.
// Queries run through the service-role SQL path (RLS bypassed by service_role).
// ============================================================================

import type { DatabaseClient } from '../database/database-client';
import type {
  EntitlementDefinition,
  EntitlementDefinitionUpsert,
  EntitlementGrant,
  EntitlementGrantCreate,
  EntitlementGrantStatus,
  EntitlementOverride,
  EntitlementOverrideCreate,
  EntitlementSource,
  EntitlementSourceCreate,
  EntitlementUsage,
} from './entitlements-types';

export interface EntitlementsRepository {
  // -- Definitions -----------------------------------------------------------
  ensureDefinition(input: EntitlementDefinitionUpsert): Promise<EntitlementDefinition>;
  listDefinitions(): Promise<EntitlementDefinition[]>;

  // -- Sources ---------------------------------------------------------------
  createSource(input: EntitlementSourceCreate): Promise<EntitlementSource>;

  // -- Grants ----------------------------------------------------------------
  createGrant(input: EntitlementGrantCreate): Promise<EntitlementGrant>;
  getGrantById(grantId: string): Promise<EntitlementGrant | null>;
  getGrantByCode(tenantId: string, businessId: string, entitlementCode: string): Promise<EntitlementGrant | null>;
  listGrantsForBusiness(tenantId: string, businessId: string): Promise<EntitlementGrant[]>;
  updateGrantStatus(
    grantId: string,
    status: EntitlementGrantStatus,
    actorUserId?: string,
    reason?: string,
  ): Promise<EntitlementGrant | null>;

  // -- Usage ----------------------------------------------------------------
  getUsage(grantId: string, businessId: string): Promise<EntitlementUsage | null>;
  upsertUsage(grantId: string, businessId: string, currentUsage: number): Promise<EntitlementUsage>;

  // -- Overrides -------------------------------------------------------------
  createOverride(input: EntitlementOverrideCreate): Promise<EntitlementOverride>;
  listOverrides(grantId: string): Promise<EntitlementOverride[]>;
}

// ---------------------------------------------------------------------------
// PostgreSQL implementation
// ---------------------------------------------------------------------------

interface DefinitionRow {
  id: string;
  code: string;
  name: string;
  value_type: string;
  description?: string;
}

interface SourceRow {
  id: string;
  tenant_id: string;
  source_type: string;
  source_reference_id: string;
  source_metadata: Record<string, unknown>;
}

interface GrantRow {
  id: string;
  tenant_id: string;
  business_id: string;
  entitlement_id: string;
  source_id: string;
  status: string;
  value_boolean: boolean | null;
  value_numeric: number | null;
  is_unlimited: boolean;
  valid_from: string;
  valid_until: string | null;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  reason: string | null;
  entitlement_code: string;
  entitlement_name: string;
}

interface UsageRow {
  grant_id: string;
  business_id: string;
  current_usage: number;
  last_used_at: string;
}

interface OverrideRow {
  id: string;
  grant_id: string;
  override_value_numeric: number | null;
  override_value_boolean: boolean | null;
  reason: string;
  authorized_by: string;
  created_at: string;
}

const GRANT_SELECT = `
  SELECT eg.id, eg.tenant_id, eg.business_id, eg.entitlement_id, eg.source_id,
         eg.status, eg.value_boolean, eg.value_numeric, eg.is_unlimited,
         eg.valid_from, eg.valid_until, eg.granted_by, eg.revoked_at, eg.revoked_by,
         eg.reason,
         ed.code AS entitlement_code, ed.name AS entitlement_name
  FROM public.entitlement_grants eg
  JOIN public.entitlement_definitions ed ON ed.id = eg.entitlement_id`;

export class PostgresEntitlementsRepository implements EntitlementsRepository {
  constructor(private readonly db: DatabaseClient) {}

  // -- Definitions -----------------------------------------------------------

  async ensureDefinition(input: EntitlementDefinitionUpsert): Promise<EntitlementDefinition> {
    const rows = await this.db.query<DefinitionRow>(
      `INSERT INTO public.entitlement_definitions (code, name, value_type, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         value_type = EXCLUDED.value_type,
         description = EXCLUDED.description
       RETURNING *;`,
      [input.code, input.name, input.valueType, input.description ?? null],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('Entitlements: ensureDefinition returned no row');
    return this.toDefinition(row);
  }

  async listDefinitions(): Promise<EntitlementDefinition[]> {
    const rows = await this.db.query<DefinitionRow>(
      'SELECT * FROM public.entitlement_definitions ORDER BY code;',
    );
    return rows.map((row) => this.toDefinition(row));
  }

  // -- Sources ---------------------------------------------------------------

  async createSource(input: EntitlementSourceCreate): Promise<EntitlementSource> {
    const rows = await this.db.query<SourceRow>(
      `INSERT INTO public.entitlement_sources
        (tenant_id, source_type, source_reference_id, source_metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [input.tenantId, input.sourceType, input.sourceReferenceId, input.sourceMetadata ?? {}],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('Entitlements: createSource returned no row');
    return {
      id: row.id,
      tenantId: row.tenant_id,
      sourceType: row.source_type as EntitlementSource['sourceType'],
      sourceReferenceId: row.source_reference_id,
      sourceMetadata: row.source_metadata,
    };
  }

  // -- Grants ----------------------------------------------------------------

  async createGrant(input: EntitlementGrantCreate): Promise<EntitlementGrant> {
    const rows = await this.db.query<GrantRow>(
      `WITH source AS (
         INSERT INTO public.entitlement_sources (tenant_id, source_type, source_reference_id, source_metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id
       )
       INSERT INTO public.entitlement_grants
         (tenant_id, business_id, entitlement_id, source_id, status,
          value_boolean, value_numeric, is_unlimited, valid_from, valid_until, granted_by, reason)
       SELECT
         $1, $5, (SELECT id FROM public.entitlement_definitions WHERE code = $6), source.id,
         'active', $7, $8, COALESCE($9, false), NOW(), $10, $11, $12
       FROM source
       RETURNING *;`,
      [
        input.tenantId,
        input.sourceType,
        input.sourceReferenceId,
        input.sourceMetadata ?? {},
        input.businessId,
        input.entitlementCode,
        input.valueBoolean ?? null,
        input.valueNumeric ?? null,
        input.isUnlimited ?? false,
        input.validUntil ?? null,
        input.grantedBy ?? null,
        input.reason ?? null,
      ],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('Entitlements: createGrant returned no row');
    const enriched = await this.enrichRow(row);
    return enriched;
  }

  async getGrantById(grantId: string): Promise<EntitlementGrant | null> {
    const rows = await this.db.query<GrantRow>(`${GRANT_SELECT} WHERE eg.id = $1;`, [grantId]);
    return rows[0] === undefined ? null : this.toGrant(rows[0]);
  }

  async getGrantByCode(
    tenantId: string,
    businessId: string,
    entitlementCode: string,
  ): Promise<EntitlementGrant | null> {
    const rows = await this.db.query<GrantRow>(
      `${GRANT_SELECT}
       WHERE eg.tenant_id = $1 AND eg.business_id = $2 AND ed.code = $3
       LIMIT 1;`,
      [tenantId, businessId, entitlementCode],
    );
    return rows[0] === undefined ? null : this.toGrant(rows[0]);
  }

  async listGrantsForBusiness(tenantId: string, businessId: string): Promise<EntitlementGrant[]> {
    const rows = await this.db.query<GrantRow>(
      `${GRANT_SELECT}
       WHERE eg.tenant_id = $1 AND eg.business_id = $2
       ORDER BY eg.created_at DESC;`,
      [tenantId, businessId],
    );
    return rows.map((row) => this.toGrant(row));
  }

  async updateGrantStatus(
    grantId: string,
    status: EntitlementGrantStatus,
    actorUserId?: string,
    reason?: string,
  ): Promise<EntitlementGrant | null> {
    const rows = await this.db.query<GrantRow>(
      `UPDATE public.entitlement_grants
       SET status = $2,
           revoked_at = CASE WHEN $2 IN ('revoked', 'expired') THEN COALESCE(revoked_at, NOW()) ELSE revoked_at END,
           revoked_by = CASE WHEN $2 = 'revoked' THEN COALESCE(revoked_by, $3) ELSE revoked_by END,
           reason = COALESCE($4, reason)
       WHERE id = $1
       RETURNING *;`,
      [grantId, status, actorUserId ?? null, reason ?? null],
    );
    const row = rows[0];
    return row === undefined ? null : this.toGrant(row);
  }

  // -- Usage ----------------------------------------------------------------

  async getUsage(grantId: string, businessId: string): Promise<EntitlementUsage | null> {
    const rows = await this.db.query<UsageRow>(
      `SELECT grant_id, business_id, current_usage, last_used_at
       FROM public.entitlement_usage
       WHERE grant_id = $1 AND business_id = $2
       LIMIT 1;`,
      [grantId, businessId],
    );
    const row = rows[0];
    if (row === undefined) return null;
    return {
      grantId: row.grant_id,
      businessId: row.business_id,
      currentUsage: row.current_usage,
      lastUsedAt: row.last_used_at,
    };
  }

  async upsertUsage(grantId: string, businessId: string, currentUsage: number): Promise<EntitlementUsage> {
    const rows = await this.db.query<UsageRow>(
      `INSERT INTO public.entitlement_usage (grant_id, business_id, current_usage, last_used_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (grant_id, business_id)
       DO UPDATE SET current_usage = EXCLUDED.current_usage, last_used_at = NOW()
       RETURNING grant_id, business_id, current_usage, last_used_at;`,
      [grantId, businessId, currentUsage],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('Entitlements: upsertUsage returned no row');
    return {
      grantId: row.grant_id,
      businessId: row.business_id,
      currentUsage: row.current_usage,
      lastUsedAt: row.last_used_at,
    };
  }

  // -- Overrides -------------------------------------------------------------

  async createOverride(input: EntitlementOverrideCreate): Promise<EntitlementOverride> {
    const rows = await this.db.query<OverrideRow>(
      `INSERT INTO public.entitlement_overrides
        (grant_id, override_value_numeric, override_value_boolean, reason, authorized_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        input.grantId,
        input.overrideValueNumeric ?? null,
        input.overrideValueBoolean ?? null,
        input.reason,
        input.authorizedBy,
      ],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('Entitlements: createOverride returned no row');
    return this.toOverride(row);
  }

  async listOverrides(grantId: string): Promise<EntitlementOverride[]> {
    const rows = await this.db.query<OverrideRow>(
      `SELECT * FROM public.entitlement_overrides WHERE grant_id = $1 ORDER BY created_at DESC;`,
      [grantId],
    );
    return rows.map((row) => this.toOverride(row));
  }

  // -- Mappers ---------------------------------------------------------------

  private toDefinition(row: DefinitionRow): EntitlementDefinition {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      valueType: row.value_type as EntitlementDefinition['valueType'],
      description: row.description,
    };
  }

  private toGrant(row: GrantRow): EntitlementGrant {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      businessId: row.business_id,
      entitlementId: row.entitlement_id,
      entitlementCode: row.entitlement_code,
      entitlementName: row.entitlement_name,
      sourceId: row.source_id,
      status: row.status as EntitlementGrant['status'],
      valueBoolean: row.value_boolean ?? undefined,
      valueNumeric: row.value_numeric ?? undefined,
      isUnlimited: row.is_unlimited,
      validFrom: row.valid_from,
      validUntil: row.valid_until ?? undefined,
      grantedBy: row.granted_by ?? undefined,
      revokedAt: row.revoked_at ?? undefined,
      revokedBy: row.revoked_by ?? undefined,
      reason: row.reason ?? undefined,
    };
  }

  private toOverride(row: OverrideRow): EntitlementOverride {
    return {
      id: row.id,
      grantId: row.grant_id,
      overrideValueNumeric: row.override_value_numeric ?? undefined,
      overrideValueBoolean: row.override_value_boolean ?? undefined,
      reason: row.reason,
      authorizedBy: row.authorized_by,
      createdAt: row.created_at,
    };
  }

  /** Re-reads a grant row so the joined definition code/name are resolved. */
  private async enrichRow(row: GrantRow): Promise<EntitlementGrant> {
    const enriched = await this.db.query<GrantRow>(
      `${GRANT_SELECT} WHERE eg.id = $1;`,
      [row.id],
    );
    const full = enriched[0];
    return full === undefined ? this.toGrant(row) : this.toGrant(full);
  }
}