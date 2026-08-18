'use client';

import React, { useState } from 'react';
import {
  updateBusinessProfileInfoAction,
  updateBusinessAdminDataAction,
  updateBusinessContactsAction,
  updateBusinessLocationAction,
} from '@/app/actions/business-profile-actions';
import { MediaUploadZone } from './MediaUploadZone';
import { GalleryMediaGrid, GalleryMediaItem } from './GalleryMediaGrid';

interface BusinessProfileTabsProps {
  businessId: string;
  initialData: {
    name: string;
    tagline?: string | null;
    category?: string | null;
    description?: string | null;
    legalName?: string | null;
    documentNumber?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    street?: string | null;
    number?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
  };
  galleryItems: GalleryMediaItem[];
  galleryLimit: number;
}

export function BusinessProfileTabs({
  businessId,
  initialData,
  galleryItems,
  galleryLimit,
}: BusinessProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'media' | 'contacts' | 'address' | 'admin'>('profile');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState(initialData.name || '');
  const [tagline, setTagline] = useState(initialData.tagline || '');
  const [category, setCategory] = useState(initialData.category || '');
  const [description, setDescription] = useState(initialData.description || '');

  const [legalName, setLegalName] = useState(initialData.legalName || '');
  const [documentNumber, setDocumentNumber] = useState(initialData.documentNumber || '');

  const [phone, setPhone] = useState(initialData.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [website, setWebsite] = useState(initialData.website || '');

  const [street, setStreet] = useState(initialData.street || '');
  const [number, setNumber] = useState(initialData.number || '');
  const [neighborhood, setNeighborhood] = useState(initialData.neighborhood || '');
  const [city, setCity] = useState(initialData.city || '');
  const [state, setState] = useState(initialData.state || '');
  const [zipCode, _setZipCode] = useState(initialData.zipCode || '');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await updateBusinessProfileInfoAction(businessId, { name, tagline, category, description });
      setSaveStatus('Perfil público atualizado com sucesso!');
    } catch (err: any) {
      setSaveStatus(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdminData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await updateBusinessAdminDataAction(businessId, { legalName, documentNumber });
      setSaveStatus('Dados administrativos salvos com sucesso!');
    } catch (err: any) {
      setSaveStatus(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await updateBusinessContactsAction(businessId, { phone, whatsapp, email, website });
      setSaveStatus('Contatos atualizados com sucesso!');
    } catch (err: any) {
      setSaveStatus(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await updateBusinessLocationAction(businessId, { street, number, neighborhood, city, state, zipCode });
      setSaveStatus('Localização atualizada com sucesso!');
    } catch (err: any) {
      setSaveStatus(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Perfil Comercial
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'media'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Mídias & Galeria
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'contacts'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Contatos & Redes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('address')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'address'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Endereço & Localização
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'admin'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Dados Privados (CNPJ/CPF)
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className="p-6">
        {saveStatus && (
          <div className={`mb-4 p-3 rounded-lg text-xs font-medium ${
            saveStatus.startsWith('Erro')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {saveStatus}
          </div>
        )}

        {/* ABA 1: PERFIL COMERCIAL */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Comercial / Fantasia *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Slogan / Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Excelência em Serviços Automotivos"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria Principal</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Tecnologia, Alimentação, Saúde..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Comercial da Empresa</label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Apresente sua empresa aos membros da comunidade..."
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        )}

        {/* ABA 2: MÍDIAS & GALERIA */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MediaUploadZone
                businessId={businessId}
                assetType="logo"
                currentUrl={initialData.logoUrl}
                label="Logotipo da Empresa (Quadrado 1:1)"
                aspectRatioClass="aspect-square max-w-[200px]"
              />
              <MediaUploadZone
                businessId={businessId}
                assetType="cover"
                currentUrl={initialData.coverUrl}
                label="Imagem de Capa (Panorâmica 16:9)"
                aspectRatioClass="aspect-video"
              />
            </div>
            <hr className="border-slate-200" />
            <GalleryMediaGrid
              businessId={businessId}
              initialItems={galleryItems}
              maxPhotosLimit={galleryLimit}
            />
          </div>
        )}

        {/* ABA 3: CONTATOS */}
        {activeTab === 'contacts' && (
          <form onSubmit={handleSaveContacts} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Comercial</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Fixo / Atendimento</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="(11) 3333-4444"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Comercial Público</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="contato@empresa.com.br"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website Oficial</label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://www.empresa.com.br"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar Contatos'}
            </button>
          </form>
        )}

        {/* ABA 4: ENDEREÇO */}
        {activeTab === 'address' && (
          <form onSubmit={handleSaveLocation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logradouro / Rua</label>
                <input
                  type="text"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Av. Paulista"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="1000"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="SP"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar Endereço'}
            </button>
          </form>
        )}

        {/* ABA 5: DADOS ADMINISTRATIVOS PRIVADOS */}
        {activeTab === 'admin' && (
          <form onSubmit={handleSaveAdminData} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              🔒 <strong>Privacidade Garantida:</strong> Os dados abaixo (Razão Social e CNPJ/CPF) são armazenados estritamente para fins de faturamento, compliance e administração. <strong>Eles NUNCA serão expostos publicamente na RPC de apresentação do Guia Comercial.</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Razão Social (Empresa) / Nome Legal</label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Documento de Identificação (CNPJ ou CPF)</label>
              <input
                type="text"
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="00.000.000/0001-00 ou 000.000.000-00"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar Dados Privados'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
