import { NextRuntime } from './next-runtime';
import { webPlugins } from './plugins';
import { HostRuntime } from '@saas/core';

export function createWebRuntime(): HostRuntime {
  // Pass the static plugins to the NextRuntime. 
  // In a real scenario, NextRuntime would use these plugins to register them in the Kernel on boot.
  const runtime = new NextRuntime();
  
  // Expose a method or patch it for this slice to inject plugins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (runtime as any)._staticPlugins = webPlugins;
  
  return runtime;
}
