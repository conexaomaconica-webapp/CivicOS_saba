'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DesignLabContextType,
  DesignLabPreferences,
  ThemePreset,
  ColorMode,
  LayoutDensity,
  ViewportPreset
} from '../_types/design-lab';

const STORAGE_KEY = 'civicos_design_lab_prefs_v1';

const DEFAULT_PREFERENCES: DesignLabPreferences = {
  theme: 'conexao-maconica',
  colorMode: 'dark',
  density: 'comfortable',
  reducedMotion: false,
  activeViewport: 'desktop'
};

const DesignLabContext = createContext<DesignLabContextType | undefined>(undefined);

export function DesignLabProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<DesignLabPreferences>(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);

  // Load preferences from localStorage (non-sensitive visual preferences only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences((prev) => ({
          ...prev,
          ...parsed
        }));
      }
    } catch {
      // Fallback to default preferences if localStorage fails
    } finally {
      setMounted(true);
    }
  }, []);

  // Sync dataset theme attributes on <html> / <body> tag
  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore quota errors
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', preferences.theme);
    root.setAttribute('data-color-mode', preferences.colorMode);
    root.setAttribute('data-density', preferences.density);

    if (preferences.colorMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [preferences, mounted]);

  const setTheme = (theme: ThemePreset) => {
    setPreferences((prev) => ({ ...prev, theme }));
  };

  const setColorMode = (colorMode: ColorMode) => {
    setPreferences((prev) => ({ ...prev, colorMode }));
  };

  const setDensity = (density: LayoutDensity) => {
    setPreferences((prev) => ({ ...prev, density }));
  };

  const setReducedMotion = (reducedMotion: boolean) => {
    setPreferences((prev) => ({ ...prev, reducedMotion }));
  };

  const setActiveViewport = (activeViewport: ViewportPreset) => {
    setPreferences((prev) => ({ ...prev, activeViewport }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return (
    <DesignLabContext.Provider
      value={{
        preferences,
        setTheme,
        setColorMode,
        setDensity,
        setReducedMotion,
        setActiveViewport,
        resetPreferences
      }}
    >
      <div
        className={`design-lab-root theme-${preferences.theme} ${preferences.colorMode} density-${preferences.density}`}
      >
        {children}
      </div>
    </DesignLabContext.Provider>
  );
}

export function useDesignLab() {
  const context = useContext(DesignLabContext);
  if (!context) {
    throw new Error('useDesignLab must be used within a DesignLabProvider');
  }
  return context;
}
