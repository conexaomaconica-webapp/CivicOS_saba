// ============================================================================
// Node Manifest Reader — Core Kernel
// ============================================================================
// Implementation of ManifestReader using Node.js fs/promises.
// Allows discovery and loading of plugin manifests from the local filesystem.
// ============================================================================

import fs from 'node:fs/promises';
import type { ManifestReader } from './manifest-loader';

export class NodeManifestReader implements ManifestReader {
  async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  async readJson<T>(targetPath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async listDirectories(targetPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  }
}
