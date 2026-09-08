import React from 'react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { BronzeBusinessProfile } from './layouts/BronzeBusinessProfile';

/**
 * @deprecated Use BronzeBusinessProfile directly from ./layouts/BronzeBusinessProfile
 */
export function BusinessBronzeTemplate({ business }: { business: PublicBusinessPresentation }) {
  return <BronzeBusinessProfile profile={business} />;
}
