'use client';

import { useEffect } from 'react';
import { captureVisitOrigin } from '@/lib/analytics/visit-origin';

/** Guarda a origem da visita (Google, QR, compartilhamento...) assim que a pessoa chega a qualquer página pública. */
export function VisitOriginCapture() {
  useEffect(() => {
    captureVisitOrigin();
  }, []);
  return null;
}
