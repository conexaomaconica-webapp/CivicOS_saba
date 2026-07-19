import { BaseRegistry } from '../base-registry';

/**
 * Capability Definition
 * 
 * @version 1.0.0 (Platform Freeze)
 * @stable
 */
export interface CapabilityDefinition {
  readonly id: string;
  readonly type: 'service' | 'slot' | 'api';
  readonly provider: string;
  readonly requires?: readonly string[];
  readonly version: string;
}

export interface CapabilityRegistryState {
  readonly provided: Map<string, CapabilityDefinition[]>;
  readonly required: Map<string, string[]>;
}

export class CapabilityRegistry extends BaseRegistry<CapabilityRegistryState> {
  private readonly provided = new Map<string, CapabilityDefinition[]>(); // capability -> definitions
  private readonly required = new Map<string, string[]>(); // pluginId -> capabilities[]

  registerProvides(definition: CapabilityDefinition): void {
    this.assertNotFrozen();
    const existing = this.provided.get(definition.id) || [];
    this.provided.set(definition.id, [...existing, definition]);
    this.incrementVersion();
  }

  registerRequires(pluginId: string, capabilities: readonly string[]): void {
    this.assertNotFrozen();
    this.required.set(pluginId, [...capabilities]);
    this.incrementVersion();
  }

  hasCapability(capabilityId: string): boolean {
    return this.provided.has(capabilityId);
  }

  getDefinition(capabilityId: string): CapabilityDefinition | undefined {
    const caps = this.provided.get(capabilityId);
    return caps ? caps[0] : undefined; // Return the first one, graph will warn about duplicates
  }

  getAllProvided(): ReadonlyMap<string, CapabilityDefinition[]> {
    return this.provided;
  }

  snapshot(): CapabilityRegistryState {
    return {
      provided: structuredClone(this.provided),
      required: structuredClone(this.required),
    };
  }
}
