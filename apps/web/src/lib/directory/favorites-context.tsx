'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { trackGa } from '@/lib/analytics/ga';

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
  // Logado: os favoritos também são gravados na conta (business_favorites). Anônimo: só no navegador.
  const signedInRef = useRef(false);

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

  // Ao carregar, se houver sessão: envia os favoritos locais e passa a usar a lista da conta.
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user || cancelled) return;
        signedInRef.current = true;
        let local: string[] = [];
        try {
          local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        } catch {
          local = [];
        }
        const { data: merged } = await (supabase as any).rpc('sync_my_favorites', {
          p_host: window.location.host,
          p_slugs: Array.isArray(local) ? local : [],
        });
        if (!cancelled && Array.isArray(merged)) setFavoriteSlugs(merged);
      } catch {
        // Sem sessão ou sem rede: segue só com o navegador.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded]);

  // O builder do Supabase só envia a requisição quando é aguardado (await/then); não tem .catch próprio.
  const pushToAccount = (fn: (supabase: any) => PromiseLike<unknown>) => {
    if (!signedInRef.current) return;
    void (async () => {
      try {
        await fn(createClient());
      } catch {
        // Falha ao gravar na conta não bloqueia o favorito local; a próxima sincronização reenvia.
      }
    })();
  };

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
    const exists = favoriteSlugs.includes(slug);
    if (!exists) trackGa('favorite_business', { business_slug: slug, source_page: 'favorites' });
    setFavoriteSlugs(exists ? favoriteSlugs.filter((item) => item !== slug) : [...favoriteSlugs, slug]);
    pushToAccount((supabase) =>
      supabase.rpc('set_my_favorite', { p_host: window.location.host, p_slug: slug, p_favorite: !exists })
    );
  };

  const isFavorite = (slug: string) => {
    return favoriteSlugs.includes(slug);
  };

  const clearFavorites = () => {
    setFavoriteSlugs([]);
    pushToAccount((supabase) => supabase.rpc('clear_my_favorites', { p_host: window.location.host }));
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
