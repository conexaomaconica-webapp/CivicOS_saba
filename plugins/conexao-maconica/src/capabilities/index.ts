import { defineCapability, type CapabilityDefinition } from '@saas/sdk';

export const masonicOrganizationCapability: CapabilityDefinition = defineCapability({
  provides: ['masonic-organization'],
  requires: ['business-directory']
});

export const masonicVerificationCapability: CapabilityDefinition = defineCapability({
  provides: ['masonic-verification'],
  requires: ['business-directory']
});

export const founderProgramCapability: CapabilityDefinition = defineCapability({
  provides: ['founder-program'],
  requires: ['business-directory', 'billing-subscriptions']
});

export const masonicBadgesCapability: CapabilityDefinition = defineCapability({
  provides: ['masonic-badges'],
  requires: ['masonic-verification', 'business-directory']
});

export const masonicSearchCapability: CapabilityDefinition = defineCapability({
  provides: ['masonic-search'],
  requires: ['business-directory']
});

export const masonicContentTaxonomyCapability: CapabilityDefinition = defineCapability({
  provides: ['masonic-content-taxonomy'],
  requires: ['business-directory']
});