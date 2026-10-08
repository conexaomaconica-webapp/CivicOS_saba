'use client';

import React from 'react';
import { openCookiePreferences } from '@/components/analytics/GoogleAnalytics';

interface CookiePreferencesButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function CookiePreferencesButton({
  className = 'text-slate-300 hover:text-[#C9A227] transition-colors duration-200 cursor-pointer',
  children = 'Preferências de cookies',
}: CookiePreferencesButtonProps) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className={className}
    >
      {children}
    </button>
  );
}
