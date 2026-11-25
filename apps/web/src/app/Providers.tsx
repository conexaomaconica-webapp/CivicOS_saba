'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import type { BootData } from '../runtime/types';
import { SystemFeedbackProvider } from '@/components/system/SystemFeedback';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface ClientBrandInfo {
  appName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  launchVideoMobileUrl: string | null;
  launchVideoDesktopUrl: string | null;
  launchAnimationEnabled: boolean;
}

const DEFAULT_CLIENT_BRAND: ClientBrandInfo = {
  appName: null,
  logoUrl: null,
  faviconUrl: null,
  primaryColor: null,
  accentColor: null,
  launchVideoMobileUrl: null,
  launchVideoDesktopUrl: null,
  launchAnimationEnabled: true,
};

const BrandContext = createContext<ClientBrandInfo>(DEFAULT_CLIENT_BRAND);

export function useTenantBrand(): ClientBrandInfo {
  return useContext(BrandContext);
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

const BootContext = createContext<BootData | null>(null);

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Exposes the serialized CivicOS boot data (kernel is booted on the server).
 * Returns null until the provider is mounted.
 */
export function useBoot(): BootData | null {
  return useContext(BootContext);
}

export function Providers({
  children,
  bootData,
  brand = DEFAULT_CLIENT_BRAND,
}: {
  children: ReactNode;
  bootData: BootData;
  brand?: ClientBrandInfo;
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('civicos-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('civicos-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrandContext.Provider value={brand}>
        <BootContext.Provider value={bootData}>
          <SystemFeedbackProvider>{children}</SystemFeedbackProvider>
        </BootContext.Provider>
      </BrandContext.Provider>
    </ThemeContext.Provider>
  );
}
