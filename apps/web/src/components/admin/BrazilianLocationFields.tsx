'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type StateOption = { ibge_code: number; uf: string; name: string };
type CityOption = { ibge_code: number; name: string };
type Props = { state: string; city: string; onStateChange: (value: string) => void; onCityChange: (value: string) => void };

export function BrazilianLocationFields({ state, city, onStateChange, onCityChange }: Props) {
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: queryError } = await (createClient() as any).from('brazilian_states').select('ibge_code, uf, name').order('name');
      if (!active) return;
      if (queryError) setError('Não foi possível carregar os estados.'); else setStates(data || []);
      setLoadingStates(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const selectedState = states.find((item) => item.uf === state);
    if (!selectedState) { setCities([]); return; }
    let active = true;
    setLoadingCities(true);
    setError(null);
    void (async () => {
      const { data, error: queryError } = await (createClient() as any).from('brazilian_cities').select('ibge_code, name').eq('state_ibge_code', selectedState.ibge_code).order('name');
      if (!active) return;
      if (queryError) setError('Não foi possível carregar as cidades.'); else setCities(data || []);
      setLoadingCities(false);
    })();
    return () => { active = false; };
  }, [state, states]);

  return <>
    <div>
      <label className="block text-xs font-bold text-stone-800 mb-1">Estado (UF)</label>
      <div className="relative">
        <select value={state} disabled={loadingStates} onChange={(event) => { onStateChange(event.target.value); onCityChange(''); }} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 disabled:opacity-60">
          <option value="">Selecione o estado</option>
          {states.map((item) => <option key={item.ibge_code} value={item.uf}>{item.uf} — {item.name}</option>)}
        </select>
        {loadingStates && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-stone-500" />}
      </div>
    </div>
    <div>
      <label className="block text-xs font-bold text-stone-800 mb-1">Cidade / Oriente</label>
      <div className="relative">
        <select value={city} disabled={!state || loadingCities} onChange={(event) => onCityChange(event.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 disabled:opacity-60">
          <option value="">{state ? 'Selecione a cidade' : 'Selecione primeiro o estado'}</option>
          {city && !cities.some((item) => item.name === city) && <option value={city}>{city}</option>}
          {cities.map((item) => <option key={item.ibge_code} value={item.name}>{item.name}</option>)}
        </select>
        {loadingCities && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-stone-500" />}
      </div>
    </div>
    {error && <p className="md:col-span-3 text-xs font-semibold text-red-700">{error}</p>}
  </>;
}
