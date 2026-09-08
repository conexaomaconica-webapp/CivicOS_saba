import React from 'react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { GoldBusinessProfile } from './layouts/GoldBusinessProfile';

/**
 * @deprecated Use GoldBusinessProfile directly from ./layouts/GoldBusinessProfile
 */
export function BusinessOuroTemplate({ business }: { business: PublicBusinessPresentation }) {
  return <GoldBusinessProfile profile={business} />;
}
