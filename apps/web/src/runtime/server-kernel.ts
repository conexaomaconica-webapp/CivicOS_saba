import 'server-only';
import { Kernel, NodeManifestReader } from '@saas/core';
import type { PresentationContext } from '@saas/core';
import type { BootData } from './types';

const DEFAULT_CONTEXT: PresentationContext = {
  tenantId: 'default',
  userId: 'anonymous',
  locale: 'pt-BR',
  capabilities: [],
  permissions: [],
  versions: {
    registryVersion: 1,
    capabilityVersion: 1,
    licenseVersion: 1,
    permissionVersion: 1,
    policyVersion: 1,
    layoutVersion: 1,
  },
};

let cached: BootData | null = null;

/**
 * Boots the CivicOS kernel once per server process and serializes the data the
 * client UI needs (diagnostics + default presentation snapshot). Failures are
 * captured in the payload so a broken plugin directory never crashes SSR.
 */
export async function getBootData(): Promise<BootData> {
  if (cached) {
    return cached;
  }

  try {
    const kernel = await Kernel.boot({
      pluginsDir: './plugins',
      reader: new NodeManifestReader(),
      coreVersion: '1.0.0',
    });

    const diagnostics = await kernel.diagnostics();
    const defaultSnapshot = kernel.presentation().snapshot(DEFAULT_CONTEXT);

    cached = { diagnostics, defaultSnapshot, error: null };
  } catch (err) {
    cached = {
      diagnostics: null,
      defaultSnapshot: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return cached;
}