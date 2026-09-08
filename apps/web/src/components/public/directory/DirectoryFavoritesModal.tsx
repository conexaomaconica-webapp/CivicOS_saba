'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Heart, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import { createClient } from '@/lib/supabase/client';
import type { BusinessCardData } from './BusinessCard';

export function DirectoryFavoritesModal() {
  const { isModalOpen, setIsModalOpen, favoriteSlugs, toggleFavorite, clearFavorites } = useFavorites();
  const [items, setItems] = useState<BusinessCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch details for favorited slugs when modal opens or favoriteSlugs changes
  useEffect(() => {
    if (!isModalOpen || favoriteSlugs.length === 0) {
      setItems([]);
      return;
    }

    async function fetchFavoritedBusinesses() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
        
        // Single batch RPC query using p_slugs array
        let fetchedItems: BusinessCardData[] = [];
        try {
          const { data, error } = await (supabase as any).rpc('public_businesses_search', {
            p_host: host,
            p_slugs: favoriteSlugs,
            p_page: 1,
            p_page_size: Math.max(favoriteSlugs.length, 50),
          });

          if (!error && data?.items) {
            fetchedItems = data.items as BusinessCardData[];
          }
        } catch (_rpcErr) {}

        // Resilient fallback query on businesses table if RPC fails or returns 0 items
        if (fetchedItems.length === 0 && favoriteSlugs.length > 0) {
          try {
            const { data: directBiz } = await (supabase as any)
              .from('businesses')
              .select('id, slug, name, description, logo_url, plan_tier, publication_status, is_active, category')
              .in('slug', favoriteSlugs)
              .eq('publication_status', 'published')
              .eq('is_active', true);

            if (directBiz && directBiz.length > 0) {
              fetchedItems = directBiz.map((b: any) => ({
                id: b.id,
                slug: b.slug,
                name: b.name,
                short_description: b.description ? b.description.slice(0, 200) : '',
                logo_url: b.logo_url,
                cover_url: null,
                category_slug: b.category,
                category_name: b.category,
                is_verified: true,
                is_founder: false,
                effective_plan_code: b.plan_tier || 'prata',
              }));
            }
          } catch (_fallbackErr) {}
        }
        const itemMap = new Map<string, BusinessCardData>();
        fetchedItems.forEach((biz) => {
          if (biz.slug) itemMap.set(biz.slug.toLowerCase(), biz);
        });

        // Preserve order of favoriteSlugs and flag unavailable items cleanly
        const orderedResults: (BusinessCardData & { isUnavailable?: boolean })[] = favoriteSlugs.map((slug) => {
          const found = itemMap.get(slug.toLowerCase());
          if (found) return found;

          // Item not returned by RPC (unpublished, deactivated, or deleted)
          const title = slug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          return {
            id: slug,
            slug: slug,
            name: title,
            category_name: 'Empresa indisponível',
            city: null,
            isUnavailable: true,
          };
        });

        setItems(orderedResults);
      } catch (err) {
        console.error('Error fetching favorited businesses:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavoritedBusinesses();
  }, [isModalOpen, favoriteSlugs]);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end transition-opacity">
      {/* Overlay Backdrop Click */}
      <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 bg-[#3b0b14] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            <h3 className="font-serif font-bold text-base">Minha Lista de Favoritos</h3>
            <span className="bg-amber-500/20 text-amber-300 font-bold text-xs px-2 py-0.5 rounded-full border border-amber-500/30">
              {favoriteSlugs.length}
            </span>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-900" />
              <span>Carregando seus favoritos...</span>
            </div>
          ) : favoriteSlugs.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 space-y-3">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-900 border border-amber-200">
                <Heart className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm">Nenhum favorito salvo</h4>
              <p className="text-gray-500 max-w-xs mx-auto">
                Navegue pelo Guia e clique no ícone de coração nos cards para salvar suas empresas e serviços favoritos aqui.
              </p>
            </div>
          ) : (
            items.map((biz: BusinessCardData & { isUnavailable?: boolean }) => (
              <div
                key={biz.id}
                className={`border rounded-xl p-3.5 flex items-center justify-between gap-3 transition-shadow group ${
                  biz.isUnavailable ? 'bg-stone-50 border-stone-200 opacity-75' : 'bg-white border-stone-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg border font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs ${
                    biz.isUnavailable ? 'bg-stone-200 text-stone-500 border-stone-300' : 'bg-amber-950 text-amber-400 border-amber-900'
                  }`}>
                    {biz.logo_url && !biz.isUnavailable ? (
                      <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" />
                    ) : (
                      biz.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div>
                    <h5 className={`font-serif font-bold text-sm line-clamp-1 ${
                      biz.isUnavailable ? 'text-stone-500 line-through' : 'text-gray-900 group-hover:text-amber-900 transition-colors'
                    }`}>
                      {biz.name}
                    </h5>
                    <p className="text-xs text-stone-400 line-clamp-1 flex items-center gap-1.5">
                      {biz.isUnavailable ? (
                        <span className="inline-block bg-stone-200 text-stone-600 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                          Empresa indisponível
                        </span>
                      ) : (
                        `${biz.category_name || 'Serviços'}${biz.city ? ` · ${biz.city}` : ''}`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!biz.isUnavailable && (
                    <Link
                      href={`/guia/${biz.slug}`}
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Ver página da empresa"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}

                  <button
                    onClick={() => toggleFavorite(biz.slug)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover dos favoritos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {favoriteSlugs.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2">
            <button
              onClick={clearFavorites}
              className="text-xs font-semibold text-stone-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar lista
            </button>

            <button
              onClick={() => setIsModalOpen(false)}
              className="text-xs font-bold bg-[#3b0b14] text-white px-4 py-2 rounded-xl hover:bg-[#5d1523] transition-colors"
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
