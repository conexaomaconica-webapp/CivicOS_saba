import { defineCapability } from '@saas/sdk';

export const echoCapability = defineCapability({
  provides: ['reference.echo'],
});
