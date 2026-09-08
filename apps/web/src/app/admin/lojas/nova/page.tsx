'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createAdminLodgeAction, updateAdminLodgeAction } from '@/lib/admin/admin-lodges-service';
import { Landmark, ArrowLeft, Save, Loader2, Upload, Image as ImageIcon } from 'lucide-react';

export default function AdminNovaLojaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Media Files e Preview URLs
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  // Location
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');

  // Flags de Visibilidade
  const [isPublished, setIsPublished] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [showWorshipfulMaster, setShowWorshipfulMaster] = useState(true);
  const [showAddress, setShowAddress] = useState(true);

  // Reuniões
  const [meetingDay, setMeetingDay] = useState('quarta');
  const [meetingTime, setMeetingTime] = useState('20:00');

  // Contatos
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    async function loadAux() {
      try {
        const supabase = createClient();
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

  // Handler para Selecionar Logo (Preview Local)
  const handleSelectLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  // Handler para Selecionar Capa (Preview Local)
  const handleSelectCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const num = codeNumber ? parseInt(codeNumber, 10) : null;
      const selectedPotency = potencies.find((p) => p.id === potencyId);
      const selectedRite = rites.find((r) => r.id === riteId);

      // Passo 1: Criar o registro da Loja no banco e obter o ID REAL
      const res = await createAdminLodgeAction({
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
        slug: slug || undefined,
        is_published: isPublished,
        is_active: isActive,
        is_featured: isFeatured,
        show_worshipful_master: showWorshipfulMaster,
        show_address: showAddress,
        meeting_day: meetingDay,
        meeting_time: meetingTime,
        phone,
        whatsapp,
        email,
        website,
      });

      if (!res.success || !res.data?.id) {
        setErrorMessage(res.error || 'Erro ao cadastrar Loja Maçônica.');
        setSaving(false);
        return;
      }

      const orgId = res.data.id;
      const supabase = createClient();
      const { data: profileData } = await (supabase as any).from('profiles').select('tenant_id').maybeSingle();
      const tenantId = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';

      let uploadedLogoUrl: string | null = null;
      let uploadedCoverUrl: string | null = null;

      // Passo 2: Upload das mídias com o organization_id REAL
      if (logoFile) {
        try {
          const fileExt = logoFile.name.split('.').pop();
          const fileName = `logo-${Date.now()}.${fileExt}`;
          const filePath = `${tenantId}/lodges/${orgId}/logo/${fileName}`;

          const { error: logoErr } = await supabase.storage
            .from('business-assets')
            .upload(filePath, logoFile, { upsert: true });

          if (!logoErr) {
            const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath);
            uploadedLogoUrl = urlData.publicUrl;
          }
        } catch (err) {
          console.error('Erro no upload da logo:', err);
        }
      }

      if (coverFile) {
        try {
          const fileExt = coverFile.name.split('.').pop();
          const fileName = `cover-${Date.now()}.${fileExt}`;
          const filePath = `${tenantId}/lodges/${orgId}/cover/${fileName}`;

          const { error: coverErr } = await supabase.storage
            .from('business-assets')
            .upload(filePath, coverFile, { upsert: true });

          if (!coverErr) {
            const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath);
            uploadedCoverUrl = urlData.publicUrl;
          }
        } catch (err) {
          console.error('Erro no upload da foto da sede:', err);
        }
      }

      // Passo 3: Atualizar as URLs de mídia se houver uploads bem sucedidos
      if (uploadedLogoUrl || uploadedCoverUrl) {
        await updateAdminLodgeAction(orgId, {
          name,
          logo_url: uploadedLogoUrl || undefined,
          cover_url: uploadedCoverUrl || undefined,
        });
      }

      alert('Loja Maçônica cadastrada com sucesso!');
      router.push('/admin/lojas');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao salvar loja.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-stone-500 font-semibold text-xs">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-amber-900" /> Carregando formulário de cadastro...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-16 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/lojas" className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lojas Maçônicas</span>
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-[#3b0b14] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#5d1523] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Salvar Loja Maçônica</span>
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-bold">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-6">
        <h2 className="font-serif font-bold text-xl text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-amber-900" />
          <span>Cadastro de Nova Loja Maçônica</span>
        </h2>

        {/* 1. Mídias da Loja (Logo e Capa da Sede) */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">1. Brasão & Imagem da Sede</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo / Brasão */}
            <div className="p-4 border border-stone-200 rounded-xl bg-stone-50 space-y-3">
              <label className="block text-xs font-bold text-stone-800">Logomarca / Brasão da Loja</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-stone-200 border border-stone-300 flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreviewUrl ? (
                    <img src={logoPreviewUrl} alt="Brasão da Loja" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoPreviewUrl ? 'Alterar Brasão' : 'Selecionar Brasão'}</span>
                    <input type="file" accept="image/*" onChange={handleSelectLogo} className="hidden" />
                  </label>
                  <p className="text-[11px] text-stone-500">PNG ou JPG (recomendado 400x400px)</p>
                </div>
              </div>
            </div>

            {/* Foto da Sede / Fachada */}
            <div className="p-4 border border-stone-200 rounded-xl bg-stone-50 space-y-3">
              <label className="block text-xs font-bold text-stone-800">Foto da Sede / Fachada (Capa)</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-16 rounded-xl bg-stone-200 border border-stone-300 flex items-center justify-center overflow-hidden shrink-0">
                  {coverPreviewUrl ? (
                    <img src={coverPreviewUrl} alt="Sede da Loja" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{coverPreviewUrl ? 'Alterar Foto Sede' : 'Selecionar Foto Sede'}</span>
                    <input type="file" accept="image/*" onChange={handleSelectCover} className="hidden" />
                  </label>
                  <p className="text-[11px] text-stone-500">Foto da fachada ou templo (1200x600px)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Identificação Institucional */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">2. Identificação da Oficina</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-800 mb-1">Nome da Loja *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: União e Progresso"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 font-semibold"
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
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Potência / Obediência</label>
              <select
                value={potencyId}
                onChange={(e) => setPotencyId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
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
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
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
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">Slug Personalizado (Opcional)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Ex: uniao-e-progresso-123"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
            />
            <p className="text-[11px] text-stone-500 mt-1">Se deixado em branco, será gerado automaticamente a partir do nome e número.</p>
          </div>
        </div>

        {/* 3. Administração & Reuniões */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">3. Administração & Reuniões</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Venerável Mestre</label>
              <input
                type="text"
                value={worshipfulMaster}
                onChange={(e) => setWorshipfulMaster(e.target.value)}
                placeholder="Nome do Venerável Mestre"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Dia da Reunião</label>
                <select
                  value={meetingDay}
                  onChange={(e) => setMeetingDay(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
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
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Localização & Endereço */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">4. Localização & Endereço</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Cidade / Oriente</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Estado (UF)</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Ex: SP"
                maxLength={2}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="00000-000"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">Endereço Completo do Templo</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro..."
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
            />
          </div>
        </div>

        {/* 5. Contatos Institucionais */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">5. Contatos Institucionais</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Telefone da Loja</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 3333-4444"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">WhatsApp da Secretaria</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 98888-7777"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">E-mail Oficial</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@loja.org.br"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Website Oficial</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://loja.org.br"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>
        </div>

        {/* 6. Governança de Exposição & Publicação */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">6. Governança de Exposição no Guia</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <div>
                <span className="text-xs font-bold text-stone-900 block">Registro Ativo (`is_active`)</span>
                <span className="text-[11px] text-stone-500">Mantém a Loja ativa administrativamente no sistema.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <div>
                <span className="text-xs font-bold text-stone-900 block">Publicar no Guia Maçônico (`is_published`)</span>
                <span className="text-[11px] text-stone-500">Exibe o card e a página detalhada da Loja nas buscas públicas.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showWorshipfulMaster}
                onChange={(e) => setShowWorshipfulMaster(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <div>
                <span className="text-xs font-bold text-stone-900 block">Exibir Nome do Venerável Mestre</span>
                <span className="text-[11px] text-stone-500">Permite a visualização pública do responsável da gestão.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showAddress}
                onChange={(e) => setShowAddress(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <div>
                <span className="text-xs font-bold text-stone-900 block">Exibir Endereço do Templo</span>
                <span className="text-[11px] text-stone-500">Exibe rua, número e mapa para visitantes.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-amber-900 rounded"
              />
              <div>
                <span className="text-xs font-bold text-stone-900 block">Loja em Destaque (`is_featured`)</span>
                <span className="text-[11px] text-stone-500">Destaca a Loja nos resultados das buscas no Guia.</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
