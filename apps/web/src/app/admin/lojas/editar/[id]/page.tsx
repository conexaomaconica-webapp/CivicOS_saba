'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { geocodeAdminLodgeAddressAction, updateAdminLodgeAction } from '@/lib/admin/admin-lodges-service';
import { getLodgeFormOptionsAction, type LodgeFormOption } from '@/lib/admin/admin-lodges-list-service';
import { canonicalPotencyCode } from '@/lib/lodges/potency';
import { compressImageOnClient } from '@/lib/media/client-image-compressor';
import {
  LODGE_GALLERY_MAX_DIMENSION,
  LODGE_GALLERY_MAX_PHOTOS,
  LODGE_GALLERY_WEBP_QUALITY,
  LODGE_IMAGE_MAX_OPTIMIZED_BYTES,
  validateLodgeGalleryCount,
  validateLodgeSourceImage,
} from '@/lib/media/lodge-media-policy';
import { systemConfirm, systemNotify } from '@/components/system/SystemFeedback';
import { BrazilianLocationFields } from '@/components/admin/BrazilianLocationFields';
import { Landmark, ArrowLeft, Save, Loader2, Eye, Upload, Image as ImageIcon, Trash2, MapPin } from 'lucide-react';

type Props = {
  params: Promise<{ id: string }>;
};

export default function AdminEditarLojaPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [potencies, setPotencies] = useState<LodgeFormOption[]>([]);
  const [rites, setRites] = useState<LodgeFormOption[]>([]);
  // Valor gravado na loja: mantido se a potência não for trocada (a chave única ainda pode depender do texto original).
  const [originalPotency, setOriginalPotency] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Form States
  const [name, setName] = useState('');
  const [codeNumber, setCodeNumber] = useState<string>('');
  const [potencyId, setPotencyId] = useState('');
  const [riteId, setRiteId] = useState('');
  const [foundationDate, setFoundationDate] = useState('');
  const [worshipfulMaster, setWorshipfulMaster] = useState('');
  const [slug, setSlug] = useState('');

  // Media (Logo e Capa/Sede)
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [gallery, setGallery] = useState<Array<{ url: string; alt: string }>>([]);

  // Location
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  // Status & Flags de Visibilidade
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
  const [instagram, setInstagram] = useState('');
  const [fraternityInstagram, setFraternityInstagram] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const [options, { data: lodgeData }] = await Promise.all([
          getLodgeFormOptionsAction(),
          (supabase as any).from('organizations').select('*').eq('id', id).single(),
        ]);

        // Mesmas potências e ritos que as demais lojas já usam; se a da loja não estiver na lista, ela é incluída.
        const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
        const potencyOptions = [...options.potencies];
        const riteOptions = [...options.rites];
        const currentPotency = canonicalPotencyCode(lodgeData?.potency);
        const currentRite = String(lodgeData?.rite || '').replace(/\s+/g, ' ').trim();
        const potencyMatch = potencyOptions.find((o) => fold(o.value) === fold(currentPotency));
        const riteMatch = riteOptions.find((o) => fold(o.value) === fold(currentRite));
        if (currentPotency && !potencyMatch) potencyOptions.push({ value: currentPotency, label: currentPotency, id: lodgeData?.potency_id || null });
        if (currentRite && !riteMatch) riteOptions.push({ value: currentRite, label: currentRite, id: lodgeData?.rite_id || null });
        setPotencies(potencyOptions);
        setRites(riteOptions);

        if (lodgeData) {
          setTenantId(lodgeData.tenant_id || '');
          setName(lodgeData.name || '');
          setCodeNumber(lodgeData.code_number != null ? String(lodgeData.code_number) : '');
          setOriginalPotency(lodgeData.potency || '');
          setPotencyId(potencyMatch?.value || currentPotency);
          setRiteId(riteMatch?.value || currentRite);
          setFoundationDate(lodgeData.foundation_date || '');
          setWorshipfulMaster(lodgeData.worshipful_master_name || '');
          setSlug(lodgeData.slug || '');
          setLogoUrl(lodgeData.logo_url || '');
          setCoverUrl(lodgeData.cover_url || '');
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
          const [{ data: meetingData }, { data: contactData }, { data: mediaData }] = await Promise.all([
            (supabase as any).from('organization_meetings').select('*').eq('organization_id', id).limit(1),
            (supabase as any).from('organization_contacts').select('*').eq('organization_id', id),
            (supabase as any).from('organization_media').select('url, alt').eq('organization_id', id).eq('type', 'photo').order('sort_order'),
          ]);

          if (meetingData && meetingData[0]) {
            setMeetingDay(meetingData[0].meeting_day || 'quarta');
            setMeetingTime(meetingData[0].meeting_time || '20:00');
          }

          if (contactData) {
            contactData.forEach((c: any) => {
              if (c.type === 'phone') setPhone(c.value);
              if (c.type === 'whatsapp') setWhatsapp(c.value);
              if (c.type === 'email') setEmail(c.value);
              if (c.type === 'website') setWebsite(c.value);
              if (c.type === 'instagram') setInstagram(c.value);
              if (c.type === 'fraternity_instagram') setFraternityInstagram(c.value);
            });
          }
          if (mediaData) setGallery(mediaData.map((item: any) => ({ url: item.url, alt: item.alt || '' })));
        }
      } catch (err) {
        console.error('Erro ao carregar loja:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Handler de Upload de Logo/Brasão
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploadingLogo(true);
    setErrorMessage(null);
    try {
      const validationError = validateLodgeSourceImage(rawFile);
      if (validationError) throw new Error(validationError);
      const file = await compressImageOnClient(rawFile, 800, 0.85, 0.5, 'contain');
      if (file.size > LODGE_IMAGE_MAX_OPTIMIZED_BYTES) throw new Error('O brasão permaneceu muito grande apó a otimização. Escolha outra imagem.');
      const supabase = createClient();
      if (!tenantId) throw new Error('Tenant da Loja não identificado. Recarregue a página.');
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/lodges/${id}/logo/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrlData.publicUrl);
      systemNotify({ type: 'success', title: 'Brasão otimizado', message: 'Imagem preparada em WebP. Clique em Salvar Alterações para concluir.' });
    } catch (err: any) {
      console.error('Erro no upload da logo:', err);
      setErrorMessage(err.message || 'Falha ao enviar logomarca/brasão.');
      systemNotify({ type: 'danger', title: 'Falha no envio', message: err.message || 'Falha ao enviar logomarca/brasão.' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const countError = validateLodgeGalleryCount(gallery.length, files.length);
    const fileError = files.map(validateLodgeSourceImage).find(Boolean);
    if (countError || fileError) {
      const message = countError || fileError || 'Não foi possível validar as imagens.';
      setErrorMessage(message);
      systemNotify({ type: 'danger', title: 'Galeria não atualizada', message });
      e.target.value = '';
      return;
    }
    const confirmed = await systemConfirm({
      title: 'Adicionar fotos à galeria',
      message: `${files.length} foto(s) serão otimizadas em WebP antes do envio. A galeria permite até ${LODGE_GALLERY_MAX_PHOTOS} fotos.`,
      confirmLabel: 'Otimizar e enviar',
    });
    if (!confirmed) { e.target.value = ''; return; }

    setUploadingGallery(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const uploaded = await Promise.all(files.map(async (rawFile, index) => {
        const file = await compressImageOnClient(rawFile, LODGE_GALLERY_MAX_DIMENSION, LODGE_GALLERY_WEBP_QUALITY);
        if (file.size > LODGE_IMAGE_MAX_OPTIMIZED_BYTES) throw new Error(`A imagem "${rawFile.name}" permaneceu muito grande apó a otimização.`);
        const fileExt = file.name.split('.').pop();
        if (!tenantId) throw new Error('Tenant da Loja não identificado. Recarregue a página.');
        const filePath = `${tenantId}/lodges/${id}/gallery/${Date.now()}-${index}.${fileExt}`;
        const { error } = await supabase.storage.from('business-assets').upload(filePath, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath);
        return { url: data.publicUrl, alt: file.name.replace(/\.[^.]+$/, '') };
      }));
      setGallery((current) => [...current, ...uploaded]);
      systemNotify({ type: 'success', title: 'Fotos otimizadas', message: `${uploaded.length} foto(s) preparada(s). Clique em Salvar Alterações para concluir.` });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao enviar fotos para a galeria.');
      systemNotify({ type: 'danger', title: 'Falha no envio', message: err instanceof Error ? err.message : 'Falha ao enviar fotos para a galeria.' });
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  // Handler de Upload da Foto da Sede/Fachada
  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploadingCover(true);
    setErrorMessage(null);
    try {
      const validationError = validateLodgeSourceImage(rawFile);
      if (validationError) throw new Error(validationError);
      const file = await compressImageOnClient(rawFile, 1920, 0.82);
      if (file.size > LODGE_IMAGE_MAX_OPTIMIZED_BYTES) throw new Error('A foto de capa permaneceu muito grande apó a otimização. Escolha outra imagem.');
      const supabase = createClient();
      if (!tenantId) throw new Error('Tenant da Loja não identificado. Recarregue a página.');
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/lodges/${id}/cover/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setCoverUrl(publicUrlData.publicUrl);
      systemNotify({ type: 'success', title: 'Capa otimizada', message: 'Imagem preparada em WebP. Clique em Salvar Alterações para concluir.' });
    } catch (err: any) {
      console.error('Erro no upload da foto da sede:', err);
      setErrorMessage(err.message || 'Falha ao enviar foto da sede.');
      systemNotify({ type: 'danger', title: 'Falha no envio', message: err.message || 'Falha ao enviar foto da sede.' });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const confirmed = await systemConfirm({
      title: 'Salvar alterações da Loja',
      message: 'Confirma a atualização dos dados, imagens, contatos e reuniões desta Loja Maçônica?',
      confirmLabel: 'Confirmar e salvar',
    });
    if (!confirmed) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const num = codeNumber ? parseInt(codeNumber, 10) : null;
      const selectedPotency = potencies.find((p) => p.value === potencyId);
      const selectedRite = rites.find((r) => r.value === riteId);
      // Potência não trocada: mantém o texto gravado (ex.: com /UF) em vez de reescrever a chave da loja.
      const keepOriginalPotency = canonicalPotencyCode(originalPotency).toLowerCase() === potencyId.toLowerCase();

      const res = await updateAdminLodgeAction(id, {
        name,
        code_number: num,
        potency_id: selectedPotency?.id || null,
        potency: keepOriginalPotency ? originalPotency : potencyId,
        rite_id: selectedRite?.id || null,
        rite: riteId || null,
        foundation_date: foundationDate || null,
        worshipful_master_name: worshipfulMaster || null,
        city: city || null,
        state: state || null,
        cep: cep || null,
        address: address || null,
        latitude: latitude.trim() ? Number(latitude) : null,
        longitude: longitude.trim() ? Number(longitude) : null,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
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
        instagram,
        fraternity_instagram: fraternityInstagram,
        gallery,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao atualizar Loja Maçônica.');
        systemNotify({ type: 'danger', title: 'Alterações não salvas', message: res.error || 'Erro ao atualizar Loja Maçônica.' });
      } else {
        systemNotify({ type: 'success', title: 'Loja atualizada', message: 'As informações e imagens foram salvas com sucesso.' });
        router.push(`/admin/lojas/${id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar loja';
      setErrorMessage(msg);
      systemNotify({ type: 'danger', title: 'Alterações não salvas', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleGeocodeAddress = async () => {
    setGeocoding(true);
    setErrorMessage(null);
    try {
      const result = await geocodeAdminLodgeAddressAction({ address, city, state, cep });
      if (!result.success || !result.data) {
        systemNotify({ type: 'danger', title: 'Endereço não localizado', message: result.error || 'Confira os dados informados.' });
        return;
      }
      setLatitude(String(result.data.latitude));
      setLongitude(String(result.data.longitude));
      systemNotify({ type: 'success', title: 'Coordenadas encontradas', message: result.data.displayName });
    } finally {
      setGeocoding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-stone-500 font-semibold text-xs">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-amber-900" /> Carregando dados da Loja Maçônica...
      </div>
    );
  }

  const isPubliclyAccessible = isPublished && isActive && slug;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-16 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href={`/admin/lojas/${id}`} className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Prontuário 360º</span>
        </Link>
        <div className="flex items-center gap-3">
          {isPubliclyAccessible ? (
            <Link
              href={`/guia/lojas/${slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs border border-stone-300 transition-colors"
            >
              <Eye className="w-4 h-4 text-stone-600" />
              <span>Ver no Guia</span>
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
              Loja Rascunho (Não Publicada)
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#3b0b14] text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-[#5d1523] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-bold">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-6">
        <h2 className="font-serif font-bold text-xl text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-amber-900" />
          <span>Edição de Loja Maçônica</span>
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
                  {logoUrl ? (
                    <img src={logoUrl} alt="Brasão da Loja" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{logoUrl ? 'Substituir Brasão' : 'Upload Brasão'}</span>
                    <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
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
                  {coverUrl ? (
                    <img src={coverUrl} alt="Sede da Loja" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                    {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{coverUrl ? 'Substituir Foto' : 'Upload Foto Sede'}</span>
                    <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                  </label>
                  <p className="text-[11px] text-stone-500">Foto da fachada ou templo (1200x600px)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-stone-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">2. Galeria de fotos</h3>
              <p className="text-[11px] text-stone-500 mt-1">Fotos salvas aqui aparecem na página pública da Loja. Limite: {gallery.length}/{LODGE_GALLERY_MAX_PHOTOS}.</p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
              {uploadingGallery ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{uploadingGallery ? 'Enviando...' : 'Adicionar fotos'}</span>
              <input type="file" accept="image/*" multiple onChange={handleUploadGallery} disabled={uploadingGallery} className="hidden" />
            </label>
          </div>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gallery.map((item, index) => (
                <div key={`${item.url}-${index}`} className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 aspect-square group">
                  <img src={item.url} alt={item.alt || `Foto ${index + 1} da Loja`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGallery((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="absolute right-2 top-2 rounded-lg bg-red-700 p-2 text-white opacity-90 hover:bg-red-600"
                    aria-label={`Remover foto ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs text-stone-500">
              Nenhuma foto cadastrada na galeria.
            </div>
          )}
        </div>

        {/* 3. Identificação Institucional */}
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">2. Identificação da Oficina</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-800 mb-1">Nome da Loja *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              >
                <option value="">Selecione a potência</option>
                {potencies.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
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
                <option value="">Não informado</option>
                {rites.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
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
            <label className="block text-xs font-bold text-stone-800 mb-1">Slug URL</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Ex: -12.2664"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Ex: -38.9663"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGeocodeAddress()}
            disabled={geocoding || !address.trim() || !city.trim() || !state.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-900 px-4 py-2 text-xs font-bold text-amber-950 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Buscar coordenadas pelo endereço
          </button>
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
            <BrazilianLocationFields state={state} city={city} onStateChange={setState} onCityChange={setCity} />

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
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
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">WhatsApp da Secretaria</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">E-mail Oficial</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Website Oficial</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Instagram da Loja</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@nomedaloja ou URL completa"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Instagram da Fraternidade Feminina</label>
              <input
                type="text"
                value={fraternityInstagram}
                onChange={(e) => setFraternityInstagram(e.target.value)}
                placeholder="Opcional: @fraternidade ou URL completa"
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
          </div>
        </div>
      </div>
    </form>
  );
}
