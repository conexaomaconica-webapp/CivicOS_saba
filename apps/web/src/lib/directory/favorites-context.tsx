'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type FavoritesContextType = {
  favoriteSlugs: string[];
  favoritesCount: number;
  toggleFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
  clearFavorites: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
};

const LOCAL_STORAGE_KEY = 'cm_directory_favorites';

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setFavoriteSlugs(JSON.parse(stored));
      }
    } catch {
      // Ignore
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(favoriteSlugs));
    } catch {
      // Ignore
    }
  }, [favoriteSlugs, isLoaded]);

  const toggleFavorite = (slug: string) => {
    if (!slug) return;
    setFavoriteSlugs((prev) => {
      const exists = prev.includes(slug);
      if (exists) {
        return prev.filter((item) => item !== slug);
      } else {
        return [...prev, slug];
      }
    });
  };

  const isFavorite = (slug: string) => {
    return favoriteSlugs.includes(slug);
  };

  const clearFavorites = () => {
    setFavoriteSlugs([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteSlugs,
        favoritesCount: favoriteSlugs.length,
        toggleFavorite,
        isFavorite,
        clearFavorites,
        isModalOpen,
        setIsModalOpen,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
