import React from 'react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { SilverBusinessProfile } from './layouts/SilverBusinessProfile';

/**
 * @deprecated Use SilverBusinessProfile directly from ./layouts/SilverBusinessProfile
 */
export function BusinessPrataTemplate({ business }: { business: PublicBusinessPresentation }) {
  return <SilverBusinessProfile profile={business} />;
}
