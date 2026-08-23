'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Landmark, ArrowLeft, Save, Loader2, Eye, Archive } from 'lucide-react';

type Props = {
  params: Promise<{ id: string }>;
};

export default function AdminEditarLojaPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [potencies, setPotencies] = useState<{ id: string; slug: string; name: string; abbreviation: string }[]>([]);
  const [rites, setRites] = useState<{ id: string; slug: string; name: string }[]>([]);

  // Form States
  const [name, setName] = useState('');
  const [codeNumber, setCodeNumber] = useState<string>('');
  const [potencyId, setPotencyId] = useState('');
  const [riteId, setRiteId] = useState('');
  const [foundationDate, setFoundationDate] = useState('');
  const [worshipfulMaster, setWorshipfulMaster] = useState('');
  const [slug, setSlug] = useState('');

  // Location
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Status & Flags de Visibilidade
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showWorshipfulMaster, setShowWorshipfulMaster] = useState(true);
  const [showAddress, setShowAddress] = useState(true);

  // Reuniões
  const [meetingDay, setMeetingDay] = useState('quarta');
  const [meetingTime, setMeetingTime] = useState('20:00');

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: profileData } = await (supabase as any).from('user_profiles').select('tenant_id').maybeSingle();
        const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';
        setTenantId(tid);

        const [{ data: potData }, { data: riteData }, { data: lodgeData }] = await Promise.all([
          (supabase as any).from('masonic_potencies').select('id, slug, name, abbreviation').eq('is_active', true),
          (supabase as any).from('masonic_rites').select('id, slug, name').eq('is_active', true),
          (supabase as any).from('organizations').select('*').eq('id', id).single(),
        ]);

        if (potData) setPotencies(potData);
        if (riteData) setRites(riteData);

        if (lodgeData) {
          setName(lodgeData.name || '');
          setCodeNumber(lodgeData.code_number != null ? String(lodgeData.code_number) : '');
          setPotencyId(lodgeData.potency_id || '');
          setRiteId(lodgeData.rite_id || '');
          setFoundationDate(lodgeData.foundation_date || '');
          setWorshipfulMaster(lodgeData.worshipful_master_name || '');
          setSlug(lodgeData.slug || '');
          setCity(lodgeData.city || '');
          setState(lodgeData.state || '');
          setCep(lodgeData.cep || '');
          setAddress(lodgeData.address || '');
          setLatitude(lodgeData.latitude != null ? String(lodgeData.latitude) : '');
          setLongitude(lodgeData.longitude != null ? String(lodgeData.longitude) : '');
          setIsPublished(lodgeData.is_published ?? true);
          setIsFeatured(lodgeData.is_featured ?? false);
          setIsActive(lodgeData.is_active ?? true);
          setShowWorshipfulMaster(lodgeData.show_worshipful_master ?? true);
          setShowAddress(lodgeData.show_address ?? true);

          // Carregar reunião principal
          const [{ data: meetingData }] = await Promise.all([
            (supabase as any).from('organization_meetings').select('*').eq('organization_id', id).limit(1),
          ]);

          if (meetingData && meetingData[0]) {
            setMeetingDay(meetingData[0].meeting_day || 'quarta');
            setMeetingTime(meetingData[0].meeting_time || '20:00');
          }
        }
      } catch (err) {
        console.error('Erro ao carregar loja:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const num = codeNumber ? parseInt(codeNumber, 10) : null;
      const selectedPotency = potencies.find((p) => p.id === potencyId);
      const selectedRite = rites.find((r) => r.id === riteId);

      const lodgeSlug = slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${num || Math.floor(Math.random() * 1000)}`;

      const payload = {
        name,
        code_number: num,
        potency_id: potencyId || null,
        potency: selectedPotency?.abbreviation || 'GOB',
        rite_id: riteId || null,
        rite: selectedRite?.name || 'REAA',
        foundation_date: foundationDate || null,
        worshipful_master_name: worshipfulMaster || null,
        city: city || null,
        state: state || null,
        cep: cep || null,
        address: address || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        slug: lodgeSlug,
        is_published: isPublished,
        is_featured: isFeatured,
        is_active: isActive,
        show_worshipful_master: showWorshipfulMaster,
        show_address: showAddress,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('organizations')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      // Upsert Reunião
      if (meetingDay) {
        const { data: existingMeeting } = await (supabase as any)
          .from('organization_meetings')
          .select('id')
          .eq('organization_id', id)
          .maybeSingle();

        if (existingMeeting) {
          await (supabase as any).from('organization_meetings').update({
            meeting_day: meetingDay,
            meeting_time: meetingTime,
          }).eq('id', existingMeeting.id);
        } else {
          await (supabase as any).from('organization_meetings').insert({
            tenant_id: tenantId,
            organization_id: id,
            meeting_day: meetingDay,
            meeting_time: meetingTime,
            is_public: true,
          });
        }
      }

      alert('Loja Maçônica atualizada com sucesso!');
      router.push('/admin/lojas');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar loja';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Deseja arquivar esta loja? Ela será ocultada publicamente mantendo o histórico.')) return;
    try {
      const supabase = createClient();
      await (supabase as any).from('organizations').update({ is_active: false, is_published: false }).eq('id', id);
      alert('Loja arquivada com sucesso!');
      router.push('/admin/lojas');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando dados da loja...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/lojas" className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lojas Maçônicas</span>
        </Link>
        
        <div className="flex items-center gap-2">
          {slug && (
            <Link
              href={`/guia/lojas/${slug}?preview=true`}
              target="_blank"
              className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Pré-visualizar Página</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleArchive}
            className="flex items-center gap-1.5 bg-stone-100 text-stone-700 border border-stone-200 px-3.5 py-2.5 rounded-xl font-bold text-xs hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <Archive className="w-4 h-4" />
            <span>Arquivar</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#3b0b14] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#5d1523] transition-colors shadow-2xs disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-2xs space-y-6">
        <h2 className="font-serif font-bold text-xl text-gray-900 border-b pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-900" />
            <span>Editar Loja: {name} {codeNumber ? `nº ${codeNumber}` : ''}</span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${isPublished && isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
            {isActive ? (isPublished ? 'Publicada' : 'Inativa (Oculta)') : 'Arquivada'}
          </span>
        </h2>

        {/* 1. Identificação Institucional */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">1. Identificação da Oficina</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-800 mb-1">Nome da Loja *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Número da Loja</label>
              <input
                type="number"
                value={codeNumber}
                onChange={(e) => setCodeNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Potência / Obediência</label>
              <select
                value={potencyId}
                onChange={(e) => setPotencyId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              >
                {potencies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.abbreviation} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Rito Maçônico</label>
              <select
                value={riteId}
                onChange={(e) => setRiteId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              >
                {rites.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Data de Fundação</label>
              <input
                type="date"
                value={foundationDate}
                onChange={(e) => setFoundationDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>
        </div>

        {/* 2. Administração & Reuniões */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">2. Administração & Reuniões</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Venerável Mestre</label>
              <input
                type="text"
                value={worshipfulMaster}
                onChange={(e) => setWorshipfulMaster(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Dia da Reunião</label>
                <select
                  value={meetingDay}
                  onChange={(e) => setMeetingDay(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
                >
                  <option value="segunda">Segunda-feira</option>
                  <option value="terca">Terça-feira</option>
                  <option value="quarta">Quarta-feira</option>
                  <option value="quinta">Quinta-feira</option>
                  <option value="sexta">Sexta-feira</option>
                  <option value="sabado">Sábado</option>
                  <option value="domingo">Domingo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Horário</label>
                <input
                  type="text"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Localização */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">3. Localização & Endereço</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Cidade / Oriente</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Estado (UF)</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">Endereço Completo</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
            />
          </div>
        </div>

        {/* 4. Publicação & Visibilidade */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">4. Publicação & Controles de Privacidade</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <span>Publicar loja no diretório público (/guia/lojas)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <span>Exibir loja como Destaque</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={showWorshipfulMaster}
                onChange={(e) => setShowWorshipfulMaster(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <span>Exibir nome do Venerável Mestre publicamente</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={showAddress}
                onChange={(e) => setShowAddress(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <span>Exibir endereço completo publicamente</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
