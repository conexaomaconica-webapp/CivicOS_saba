// ============================================================================
// Schema Registry Contract — Core SaaS Framework
// ============================================================================
// Enables plugins to declare their schemas (entities, validation, forms, permissions).
// Core uses this to generate dynamic forms, validator rules, and CRUD interfaces.
// ============================================================================

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json';

export interface EntityField {
  readonly name: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly validationRegex?: string;
  readonly min?: number;
  readonly max?: number;
  readonly permissions?: {
    readonly read?: readonly string[];
    readonly write?: readonly string[];
  };
}

export interface EntitySchema {
  readonly name: string; // e.g. "listing", "loja"
  readonly fields: readonly EntityField[];
  readonly pluginId: string;
}

export interface SchemaRegistryService {
  /** Register an entity schema. */
  registerSchema(schema: EntitySchema): void;

  /** Get a schema by name. */
  getSchema(name: string): EntitySchema | undefined;

  /** List all registered schemas. */
  listSchemas(): EntitySchema[];

  /** Validate a record data object against a registered schema. */
  validateRecord(
    schemaName: string,
    data: Record<string, unknown>,
  ): { valid: boolean; errors: string[] };
}
