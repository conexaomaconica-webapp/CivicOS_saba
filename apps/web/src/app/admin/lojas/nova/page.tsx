'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Landmark, ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function AdminNovaLojaPage() {
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

  // Location
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, _setLatitude] = useState('');
  const [longitude, _setLongitude] = useState('');

  // Flags de Visibilidade
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [showWorshipfulMaster, setShowWorshipfulMaster] = useState(true);
  const [showAddress, setShowAddress] = useState(true);

  // Reuniões
  const [meetingDay, setMeetingDay] = useState('quarta');
  const [meetingTime, setMeetingTime] = useState('20:00');
  const [meetingLabel, _setMeetingLabel] = useState('Sessão Ordinária');

  // Contatos
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    async function loadAux() {
      try {
        const supabase = createClient();
        const { data: profileData } = await (supabase as any).from('user_profiles').select('tenant_id').maybeSingle();
        const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';
        setTenantId(tid);

        const [{ data: potData }, { data: riteData }] = await Promise.all([
          (supabase as any).from('masonic_potencies').select('id, slug, name, abbreviation').eq('is_active', true),
          (supabase as any).from('masonic_rites').select('id, slug, name').eq('is_active', true),
        ]);

        if (potData) {
          setPotencies(potData as any);
          if (potData[0]) setPotencyId((potData[0] as any).id);
        }
        if (riteData) {
          setRites(riteData as any);
          if (riteData[0]) setRiteId((riteData[0] as any).id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAux();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const num = codeNumber ? parseInt(codeNumber, 10) : null;
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${num || Math.floor(Math.random() * 1000)}`;

      const selectedPotency = potencies.find((p) => p.id === potencyId);
      const selectedRite = rites.find((r) => r.id === riteId);

      const payload = {
        tenant_id: tenantId,
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
        slug,
        is_published: isPublished,
        is_featured: isFeatured,
        show_worshipful_master: showWorshipfulMaster,
        show_address: showAddress,
        updated_at: new Date().toISOString(),
      };

      const { data: orgData, error } = await (supabase as any)
        .from('organizations')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Inserir reunião se configurada
      if (meetingDay) {
        await (supabase as any).from('organization_meetings').insert({
          tenant_id: tenantId,
          organization_id: orgData.id,
          meeting_day: meetingDay,
          meeting_time: meetingTime,
          label: meetingLabel,
          is_public: true,
        });
      }

      // Inserir contatos informados
      if (phone) {
        await (supabase as any).from('organization_contacts').insert({
          tenant_id: tenantId,
          organization_id: orgData.id,
          type: 'phone',
          value: phone,
          label: 'Telefone Institucional',
          is_public: true,
        });
      }
      if (whatsapp) {
        await (supabase as any).from('organization_contacts').insert({
          tenant_id: tenantId,
          organization_id: orgData.id,
          type: 'whatsapp',
          value: whatsapp,
          label: 'WhatsApp Secretaria',
          is_public: true,
        });
      }
      if (email) {
        await (supabase as any).from('organization_contacts').insert({
          tenant_id: tenantId,
          organization_id: orgData.id,
          type: 'email',
          value: email,
          label: 'E-mail Oficial',
          is_public: true,
        });
      }
      if (website) {
        await (supabase as any).from('organization_contacts').insert({
          tenant_id: tenantId,
          organization_id: orgData.id,
          type: 'website',
          value: website,
          label: 'Website Oficial',
          is_public: true,
        });
      }

      alert('Loja Maçônica salva com sucesso!');
      router.push('/admin/lojas');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar loja';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando formulário...
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
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-[#3b0b14] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#5d1523] transition-colors shadow-2xs disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Salvar Loja</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-2xs space-y-6">
        <h2 className="font-serif font-bold text-xl text-gray-900 border-b pb-3 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-amber-900" />
          <span>Cadastro de Nova Loja Maçônica</span>
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
                placeholder="Ex: União e Progresso"
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
                placeholder="Ex: 123"
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
                placeholder="Nome do Venerável Mestre"
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
                  placeholder="20:00"
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
                placeholder="Ex: Feira de Santana"
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Estado (UF)</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Ex: BA"
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="44000-000"
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
              placeholder="Rua, número, bairro..."
              className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
            />
          </div>
        </div>

        {/* 4. Contatos */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">4. Contatos Institucionais</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Telefone Institucional</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(75) 99999-9999"
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">WhatsApp Secretaria</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(75) 99999-9999"
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">E-mail Oficial</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@loja.org.br"
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Website Oficial</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://loja.org.br"
                className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>
        </div>

        {/* 5. Publicação & Privacidade */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">5. Publicação & Visibilidade</h3>

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
