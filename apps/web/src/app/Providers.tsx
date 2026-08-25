'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import type { BootData } from '../runtime/types';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
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
}: {
  children: ReactNode;
  bootData: BootData;
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
      <BootContext.Provider value={bootData}>{children}</BootContext.Provider>
    </ThemeContext.Provider>
  );
}