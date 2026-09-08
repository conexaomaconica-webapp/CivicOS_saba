'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Eye,
  Save,
  Loader2,
  Clock,
  History,
  BarChart3,
  Layers,
  FileText,
  CreditCard,
  Bell,
  Building2,
  Image as ImageIcon,
  Briefcase,
  Tag,
  Plus,
  Trash2,
  Edit3,
  Check,
  Upload,
  Calendar,
  Newspaper,
  UserCheck,
} from 'lucide-react';
import {
  upsertBusinessEventAction,
  deleteBusinessEventAction,
  upsertBusinessPostAction,
  deleteBusinessPostAction,
} from '@/app/actions/events-and-posts';
import {
  AdminBusiness360DTO,
  togglePublicationStatusAction,
  toggleRecognitionAction,
  updateAdminBusinessDetailsAction,
  verifyAdminMasonicLinkAction,
  upsertAdminMasonicLinkAction,
  manageAdminServiceAction,
  manageAdminBenefitAction,
  manageAdminMediaAction,
  updateAdminBusinessPlanAction,
} from '@/lib/admin/admin-businesses-service';
import { uploadAdvertiserAssetAction } from '@/lib/advertiser/advertiser-profile-service';
import { compressImageOnClient } from '@/lib/media/client-image-compressor';
import { formatCpfCnpj, formatPhone } from '@/lib/onboarding/onboarding-validation';


interface Props {
  initialData: AdminBusiness360DTO;
}

export default function Company360Client({ initialData }: Props) {
  const [data, setData] = useState<AdminBusiness360DTO>(initialData);
  const [activeTab, setActiveTab] = useState<
    | 'resumo'
    | 'cadastro'
    | 'conteudo'
    | 'plano'
    | 'contrato'
    | 'pagamentos'
    | 'analytics'
    | 'reconhecimentos'
    | 'notificacoes'
    | 'auditoria'
  >('resumo');

  const [loading, setLoading] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form States para a Aba Cadastro
  const [name, setName] = useState(data.business.name || '');
  const [legalName, setLegalName] = useState(data.business.legal_name || '');
  const [cnpjCpf, setCnpjCpf] = useState(formatCpfCnpj(data.business.cnpj_cpf || ''));
  const [phone, setPhone] = useState(formatPhone(data.business.phone || ''));
  const [whatsapp, setWhatsapp] = useState(formatPhone(data.business.whatsapp || ''));
  const [category, setCategory] = useState(data.business.category || '');
  const [email, setEmail] = useState(data.business.email || '');
  const [website, setWebsite] = useState(data.business.website || '');
  const [instagram, setInstagram] = useState(
    (data.business as any).instagram || (data as any).contacts?.instagram || ''
  );
  const [facebook, setFacebook] = useState(
    (data.business as any).facebook || (data as any).contacts?.facebook || ''
  );
  const [linkedin, setLinkedin] = useState(
    (data.business as any).linkedin || (data as any).contacts?.linkedin || ''
  );
  const [youtube, setYoutube] = useState(
    (data.business as any).youtube || (data as any).contacts?.youtube || ''
  );
  const [city, setCity] = useState(data.business.city || '');
  const [state, setState] = useState(data.business.state || '');
  const [address, setAddress] = useState(data.business.address || '');
  const [description, setDescription] = useState(data.business.description || '');

  // Form States para Dados do Empresário / Anunciante Responsável
  const [respName, setRespName] = useState(data.owner?.full_name || '');
  const [respRole, setRespRole] = useState(data.owner?.business_role || 'Proprietário');
  const [respCommunityLabel, setRespCommunityLabel] = useState(data.owner?.community_label || 'Irmão');
  const [respAvatarUrl, setRespAvatarUrl] = useState(data.owner?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Modal State para Ações de Risco (Suspender/Reativar)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showMasonicUpsertModal, setShowMasonicUpsertModal] = useState(false);
  const [masonicLodgeInput, setMasonicLodgeInput] = useState('');
  const [masonicPotencyInput, setMasonicPotencyInput] = useState('');
  const [masonicLinkTypeInput, setMasonicLinkTypeInput] = useState('Proprietário Ir∴');
  const [masonicStatusInput, setMasonicStatusInput] = useState<'verified' | 'pending' | 'rejected'>('verified');
  const [masonicJustificationInput, setMasonicJustificationInput] = useState('');

  // States para Gestão de Eventos
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventMode, setEventMode] = useState<'create' | 'edit'>('create');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventEndsAt, setEventEndsAt] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCoverUrl, setEventCoverUrl] = useState('');
  const [eventStatus, setEventStatus] = useState<'published' | 'draft' | 'archived'>('published');

  // States para Gestão de Posts / Novidades
  const [showPostModal, setShowPostModal] = useState(false);
  const [postMode, setPostMode] = useState<'create' | 'edit'>('create');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postSummary, setPostSummary] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postStatus, setPostStatus] = useState<'published' | 'draft' | 'archived'>('published');

  // States para Gestão de Plano Comercial (Upgrade / Downgrade)
  const [selectedPlanCode, setSelectedPlanCode] = useState<'bronze' | 'prata' | 'ouro'>((data.business.plan_code as any) || 'bronze');
  const [planJustification, setPlanJustification] = useState('');
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planJustification.trim()) {
      setPlanMessage({ type: 'error', text: 'Informe a justificativa obrigatória para auditoria da alteração do plano.' });
      return;
    }

    setUpdatingPlan(true);
    setPlanMessage(null);

    try {
      const res = await updateAdminBusinessPlanAction(data.business.id, selectedPlanCode, planJustification.trim());
      if (!res.success) throw new Error(res.error);

      // Atualização otimista parcial — cotas reais vêm do plan_entitlements
      // via revalidatePath no server action. Forçar reload para dados frescos.
      setData((prev) => ({
        ...prev,
        business: {
          ...prev.business,
          plan_code: selectedPlanCode,
        },
        subscription: {
          ...prev.subscription,
          plan_code: selectedPlanCode,
          plan_name: `Plano ${selectedPlanCode.toUpperCase()}`,
        },
      }));

      setPlanMessage({
        type: 'success',
        text: `Plano comercial alterado para ${selectedPlanCode.toUpperCase()} com sucesso! Recarregando cotas...`,
      });
      setPlanJustification('');

      // Reload para obter cotas canônicas de plan_entitlements
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setPlanMessage({ type: 'error', text: err.message || 'Erro ao alterar plano comercial.' });
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleSaveMasonicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masonicLodgeInput.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe o nome da Loja Maçônica.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await upsertAdminMasonicLinkAction(data.business.id, {
      lodge_name: masonicLodgeInput,
      potency: masonicPotencyInput,
      link_type: masonicLinkTypeInput,
      status: masonicStatusInput,
      justification: masonicJustificationInput,
    });

    if (res.success) {
      setMessage({ type: 'success', text: 'Vínculo maçônico cadastrado/atualizado com sucesso!' });
      setShowMasonicUpsertModal(false);
      setData((prev) => ({
        ...prev,
        business: {
          ...prev.business,
          masonic_lodge: masonicLodgeInput,
          masonic_potency: masonicPotencyInput,
          masonic_link_type: masonicLinkTypeInput,
          masonic_validation_status: masonicStatusInput,
        },
        masonic_link_detail: {
          id: prev.masonic_link_detail?.id || `masonic-${Date.now()}`,
          organization_id: prev.masonic_link_detail?.organization_id || null,
          lodge_name: masonicLodgeInput,
          potency: masonicPotencyInput || 'GLEB / GOB / GLMMG',
          link_type: masonicLinkTypeInput,
          status: masonicStatusInput,
          verified_at: masonicStatusInput === 'verified' ? new Date().toISOString() : null,
          verified_by: null,
        },
      }));
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao salvar vínculo maçônico.' });
    }
    setLoading(false);
  };

  const handleCopyContractText = () => {
    if (!data.contract?.rendered_text) return;
    navigator.clipboard.writeText(data.contract.rendered_text);
    setMessage({ type: 'success', text: 'Texto completo do contrato copiado para a área de transferência!' });
  };

  const handlePrintContractPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const safeText = (data.contract?.rendered_text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Contrato Assinado - ${data.business.name}</title>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 20mm; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.5; color: #111; padding: 20px; background: #fff; }
      .header { text-align: center; border-bottom: 2px solid #3B0B14; padding-bottom: 15px; margin-bottom: 20px; }
      .header h1 { font-size: 18px; margin: 0; color: #3B0B14; font-family: Georgia, serif; }
      .header p { font-size: 11px; color: #666; margin: 5px 0 0 0; }
      .content { white-space: pre-wrap; word-wrap: break-word; background: #fcfcfc; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 11px; }
      .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #666; text-align: center; }
      @media print {
        body { padding: 0; background: #fff; }
        .content { border: none; background: transparent; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="letterhead">
      <div class="header-logo">
        <div style="background: #3B0B14; padding: 18px 24px; border-radius: 10px 10px 0 0; border-bottom: 3px solid #C9A227; display: grid; grid-template-columns: 80px 1fr 80px; align-items: center;">
          <img src="/logoconexao_red.png" alt="Conexão Maçônica Logo" style="height: 52px; object-fit: contain;" />
          <div style="text-align: center;">
            <h1 style="color: #C9A227; font-size: 20pt; margin: 0; font-family: 'Georgia', serif; letter-spacing: 2px;">CONEXÃO MAÇÔNICA</h1>
            <h2 style="color: #fff; font-size: 9pt; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: normal;">GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS</h2>
          </div>
          <div style="width: 80px;"></div>
        </div>
        <div style="background: #f4efe8; border-top: 1px solid #3B0B14; border-bottom: 2px solid #3B0B14; padding: 12px; margin-top: 10px; font-family: 'Georgia', serif; font-weight: bold; font-size: 11pt; color: #3B0B14; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PUBLICIDADE E PRESENÇA COMERCIAL DIGITAL
        </div>
      </div>
    <div class="content">${safeText}</div>
    <div class="footer">
      Documento gerado via Plataforma Conexão Maçônica em ${new Date().toLocaleDateString('pt-BR')} — Hash SHA-256: ${data.contract?.sha256_hash || 'Verificado'}
    </div>
    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const [targetStatus, setTargetStatus] = useState<'published' | 'suspended'>('suspended');
  const [statusJustification, setStatusJustification] = useState('');

  // Modal State para Alterar Reconhecimento
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [targetRecognitionKey, setTargetRecognitionKey] = useState<
    'is_pedra_fundamental' | 'is_founder' | 'is_coluna_honra' | 'is_verified'
  >('is_pedra_fundamental');
  const [targetRecognitionValue, setTargetRecognitionValue] = useState(true);
  const [recognitionJustification, setRecognitionJustification] = useState('');

  // Modais de Vínculo Maçônico e Moderação de Conteúdo
  const [showMasonicModal, setShowMasonicModal] = useState(false);
  const [targetMasonicStatus, setTargetMasonicStatus] = useState<'verified' | 'rejected'>('verified');
  const [masonicJustification, setMasonicJustification] = useState('');

  // Modal de Serviço
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceMode, setServiceMode] = useState<'create' | 'edit'>('create');
  const [editingServiceId, setEditingServiceId] = useState<string | undefined>(undefined);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');

  // Modal de Benefício Fraterno
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [benefitMode, setBenefitMode] = useState<'create' | 'edit'>('create');
  const [editingBenefitId, setEditingBenefitId] = useState<string | undefined>(undefined);
  const [benefitTitle, setBenefitTitle] = useState('');
  const [benefitDesc, setBenefitDesc] = useState('');
  const [benefitDiscount, setBenefitDiscount] = useState<number | ''>('');

  // Modal de Mídia (Logo, Capa, Galeria)
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaMode, setMediaMode] = useState<'update_logo' | 'update_cover' | 'add_gallery' | 'update_gallery_title'>('add_gallery');
  const [editingMediaId, setEditingMediaId] = useState<string | undefined>(undefined);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaTitleInput, setMediaTitleInput] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    setUploadingAvatar(true);
    try {
      // Otimização e compressão de imagem no cliente (WebP 800px max)
      const file = await compressImageOnClient(rawFile, 800, 0.85);

      const formData = new FormData();
      formData.append('businessId', data.business.id);
      formData.append('file', file);
      formData.append('assetType', 'avatar');
      const res = await uploadAdvertiserAssetAction(formData);

      if (res.success && res.url) {
        setRespAvatarUrl(res.url);
        setMessage({ type: 'success', text: 'Foto enviada ao armazenamento. Clique em “Salvar Alterações de Cadastro” para vinculá-la ao responsável.' });
      } else {
        setMessage({ type: 'error', text: res.message || 'Erro ao enviar foto do empresário.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha ao processar arquivo.' });
    } finally {
      setUploadingAvatar(false);
    }
  };


  // Handler para Salvar Cadastro (Aba Cadastro)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingForm(true);
    setMessage(null);
    try {
      const res = await updateAdminBusinessDetailsAction(data.business.id, {
        name,
        legal_name: legalName,
        cnpj_cpf: cnpjCpf,
        phone,
        whatsapp,
        category,
        email,
        website,
        instagram,
        facebook,
        linkedin,
        youtube,
        city,
        state,
        address,
        description,
        responsible_name: respName,
        responsible_role: respRole,
        responsible_community_label: respCommunityLabel,
        responsible_avatar_url: respAvatarUrl,
      });

      if (res.success && res.data) {
        const savedCnpj = res.data.cnpj_cpf || res.data.cnpj || cnpjCpf;
        setCnpjCpf(formatCpfCnpj(savedCnpj));
        setData((prev) => ({
          ...prev,
          business: {
            ...prev.business,
            name: res.data.name,
            legal_name: res.data.legal_name,
            cnpj_cpf: savedCnpj,
            phone: res.data.phone,

            whatsapp: res.data.whatsapp || whatsapp,
            category: res.data.category,
            email: res.data.email,
            website: res.data.website,
            instagram: instagram,
            facebook: facebook,
            linkedin: linkedin,
            youtube: youtube,
            city: res.data.city,
            state: res.data.state,
            address: res.data.address,
            description: res.data.description,
            updated_at: res.data.updated_at,
          },
          owner: {
            ...(prev.owner || {}),
            id: res.data.responsible?.id || prev.owner?.id,
            full_name: res.data.responsible?.name ?? respName,
            business_role: res.data.responsible?.business_role ?? respRole,
            community_label: res.data.responsible?.community_label ?? respCommunityLabel,
            organization: res.data.responsible?.organization ?? prev.owner?.organization,
            avatar_url: res.data.responsible?.avatar_url ?? (respAvatarUrl || undefined),
          },
          audit_timeline: [
            {
              id: `t-${Date.now()}`,
              date: new Date().toISOString(),
              action: 'EDIÇÃO DE DADOS CADASTRAIS',
              description: `CNPJ: ${res.data.cnpj_cpf || 'N/A'}, Telefone: ${res.data.phone || 'N/A'}, Nome: ${res.data.name}`,
              performed_by: 'Admin Conexão',
            },
            ...prev.audit_timeline,
          ],
        }));
        setMessage({ type: 'success', text: 'Dados cadastrais da empresa salvos com sucesso no banco!' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Falha ao salvar dados da empresa.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro inesperado ao salvar cadastro.' });
    } finally {
      setSavingForm(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusJustification.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe a justificativa da alteração de status.' });
      return;
    }
    setLoading(true);
    const res = await togglePublicationStatusAction(data.business.id, targetStatus, statusJustification);
    if (res.success) {
      setData((prev) => ({
        ...prev,
        business: { ...prev.business, publication_status: targetStatus },
        audit_timeline: [
          {
            id: `t-${Date.now()}`,
            date: new Date().toISOString(),
            action: targetStatus === 'suspended' ? 'SUSPENSÃO DE ANÚNCIO' : 'REATIVAÇÃO DE ANÚNCIO',
            description: statusJustification,
            performed_by: 'Admin Conexão',
          },
          ...prev.audit_timeline,
        ],
      }));
      setMessage({ type: 'success', text: `Status da empresa alterado para ${targetStatus === 'published' ? 'Publicada' : 'Suspensa'}.` });
      setShowStatusModal(false);
      setStatusJustification('');
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao alterar status.' });
    }
    setLoading(false);
  };

  const handleToggleRecognition = async () => {
    if (!recognitionJustification.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe a justificativa da concessão/revogação.' });
      return;
    }
    setLoading(true);
    const res = await toggleRecognitionAction(
      data.business.id,
      targetRecognitionKey,
      targetRecognitionValue,
      recognitionJustification
    );

    if (res.success) {
      setData((prev) => ({
        ...prev,
        business: { ...prev.business, [targetRecognitionKey]: targetRecognitionValue },
        audit_timeline: [
          {
            id: `t-${Date.now()}`,
            date: new Date().toISOString(),
            action: `ALTERAÇÃO DE RECONHECIMENTO (${targetRecognitionKey})`,
            description: recognitionJustification,
            performed_by: 'Admin Conexão',
          },
          ...prev.audit_timeline,
        ],
      }));
      setMessage({ type: 'success', text: 'Reconhecimento atualizado e auditado com sucesso.' });
      setShowRecognitionModal(false);
      setRecognitionJustification('');
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao alterar reconhecimento.' });
    }
    setLoading(false);
  };

  const handleVerifyMasonicLink = async (status: 'verified' | 'rejected') => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await verifyAdminMasonicLinkAction(data.business.id, status, masonicJustification);
      if (res.success) {
        setData((prev) => ({
          ...prev,
          masonic_link_detail: prev.masonic_link_detail
            ? { ...prev.masonic_link_detail, status }
            : {
              id: `masonic-${Date.now()}`,
              organization_id: null,
              lodge_name: 'Loja Declarada / Registrada',
              potency: 'GLEB / GOB / GLMMG',
              link_type: 'Proprietário Ir∴',
              status,
              verified_at: status === 'verified' ? new Date().toISOString() : null,
              verified_by: null,
            },
          audit_timeline: [
            {
              id: `t-${Date.now()}`,
              date: new Date().toISOString(),
              action: status === 'verified' ? 'VERIFICAÇÃO DE VÍNCULO MAÇÔNICO' : 'REJEIÇÃO DE VÍNCULO MAÇÔNICO',
              description: masonicJustification || 'Status do vínculo alterado pelo Admin.',
              performed_by: 'Admin Conexão',
            },
            ...prev.audit_timeline,
          ],
        }));
        setMessage({ type: 'success', text: `Status do vínculo maçônico alterado para "${status === 'verified' ? 'Verificado' : 'Rejeitado'}".` });
        setShowMasonicModal(false);
      } else {
        setMessage({ type: 'error', text: res.error || 'Falha ao atualizar vínculo maçônico.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro inesperado.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const action = serviceMode === 'edit' ? 'update' : 'create';
      const res = await manageAdminServiceAction(data.business.id, action, {
        service_id: editingServiceId,
        name: serviceName,
        description: serviceDesc,
        price_info: servicePrice,
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Serviço salvo com sucesso!' });
        setShowServiceModal(false);
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao salvar serviço.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar serviço.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleServiceActive = async (serviceId: string, currentActive: boolean) => {
    setLoading(true);
    setMessage(null);
    const res = await manageAdminServiceAction(data.business.id, 'toggle_active', {
      service_id: serviceId,
      is_active: !currentActive,
    });
    if (res.success) {
      setData((prev) => ({
        ...prev,
        services_items: prev.services_items.map((s) => (s.id === serviceId ? { ...s, is_active: !currentActive } : s)),
      }));
      setMessage({ type: 'success', text: `Visibilidade operacional do serviço alterada para ${!currentActive ? 'Ativo' : 'Inativo'}.` });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao alterar visibilidade.' });
    }
    setLoading(false);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Deseja realmente excluir este serviço do anunciante?')) return;
    setLoading(true);
    setMessage(null);
    const res = await manageAdminServiceAction(data.business.id, 'delete', { service_id: serviceId });
    if (res.success) {
      setData((prev) => ({
        ...prev,
        services_items: prev.services_items.filter((s) => s.id !== serviceId),
      }));
      setMessage({ type: 'success', text: 'Serviço excluído do banco de dados.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao excluir serviço.' });
    }
    setLoading(false);
  };

  const handleSaveBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const action = benefitMode === 'edit' ? 'update' : 'create';
      const res = await manageAdminBenefitAction(data.business.id, action, {
        benefit_id: editingBenefitId,
        title: benefitTitle,
        description: benefitDesc,
        discount_percentage: benefitDiscount === '' ? null : Number(benefitDiscount),
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Benefício fraterno salvo com sucesso!' });
        setShowBenefitModal(false);
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao salvar benefício.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar benefício.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBenefitActive = async (benefitId: string, currentActive: boolean) => {
    setLoading(true);
    setMessage(null);
    const res = await manageAdminBenefitAction(data.business.id, 'toggle_active', {
      benefit_id: benefitId,
      is_active: !currentActive,
    });
    if (res.success) {
      setData((prev) => ({
        ...prev,
        benefits_items: prev.benefits_items.map((b) => (b.id === benefitId ? { ...b, is_active: !currentActive } : b)),
      }));
      setMessage({ type: 'success', text: `Visibilidade operacional do benefício alterada para ${!currentActive ? 'Ativo' : 'Inativo'}.` });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao alterar visibilidade.' });
    }
    setLoading(false);
  };

  const handleDeleteBenefit = async (benefitId: string) => {
    if (!confirm('Deseja realmente excluir este benefício fraterno?')) return;
    setLoading(true);
    setMessage(null);
    const res = await manageAdminBenefitAction(data.business.id, 'delete', { benefit_id: benefitId });
    if (res.success) {
      setData((prev) => ({
        ...prev,
        benefits_items: prev.benefits_items.filter((b) => b.id !== benefitId),
      }));
      setMessage({ type: 'success', text: 'Benefício fraterno excluído do banco de dados.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao excluir benefício.' });
    }
    setLoading(false);
  };

  // Handlers de Eventos
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventStartsAt) {
      setMessage({ type: 'error', text: 'Por favor, informe o título e a data de início do evento.' });
      return;
    }
    setLoading(true);
    const res = await upsertBusinessEventAction({
      id: editingEventId || undefined,
      tenantId: data.business.tenant_id,
      businessId: data.business.id,
      title: eventTitle,
      description: eventDesc,
      startsAt: new Date(eventStartsAt).toISOString(),
      endsAt: eventEndsAt ? new Date(eventEndsAt).toISOString() : undefined,
      locationName: eventLocation,
      coverImageUrl: eventCoverUrl || undefined,
      publicationStatus: eventStatus,
    });

    if (res.success && res.data) {
      const savedEv = res.data as any;
      setData((prev) => {
        const exists = prev.events_items.some((ev) => ev.id === savedEv.id);
        const updatedItems = exists
          ? prev.events_items.map((ev) => (ev.id === savedEv.id ? savedEv : ev))
          : [savedEv, ...prev.events_items];
        return {
          ...prev,
          events_items: updatedItems,
          content_summary: {
            ...prev.content_summary,
            events_count: updatedItems.filter((e) => e.publication_status === 'published').length,
          },
        };
      });
      setMessage({ type: 'success', text: `Evento ${eventMode === 'create' ? 'cadastrado' : 'atualizado'} com sucesso!` });
      setShowEventModal(false);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao salvar evento.' });
    }
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Deseja realmente excluir este evento?')) return;
    setLoading(true);
    const res = await deleteBusinessEventAction({ eventId, businessId: data.business.id });
    if (res.success) {
      setData((prev) => {
        const updated = prev.events_items.filter((e) => e.id !== eventId);
        return {
          ...prev,
          events_items: updated,
          content_summary: {
            ...prev.content_summary,
            events_count: updated.filter((e) => e.publication_status === 'published').length,
          },
        };
      });
      setMessage({ type: 'success', text: 'Evento excluído com sucesso.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao excluir evento.' });
    }
    setLoading(false);
  };

  // Handlers de Posts / Novidades
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe o título e o conteúdo da publicação.' });
      return;
    }
    setLoading(true);
    const res = await upsertBusinessPostAction({
      id: editingPostId || undefined,
      tenantId: data.business.tenant_id,
      businessId: data.business.id,
      title: postTitle,
      summary: postSummary,
      content: postContent,
      publicationStatus: postStatus,
    });

    if (res.success && res.data) {
      const savedPost = res.data as any;
      setData((prev) => {
        const exists = prev.posts_items.some((p) => p.id === savedPost.id);
        const updatedItems = exists
          ? prev.posts_items.map((p) => (p.id === savedPost.id ? savedPost : p))
          : [savedPost, ...prev.posts_items];
        return {
          ...prev,
          posts_items: updatedItems,
        };
      });
      setMessage({ type: 'success', text: `Publicação ${postMode === 'create' ? 'cadastrada' : 'atualizada'} com sucesso!` });
      setShowPostModal(false);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao salvar publicação.' });
    }
    setLoading(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja realmente excluir esta publicação?')) return;
    setLoading(true);
    const res = await deleteBusinessPostAction({ postId, businessId: data.business.id });
    if (res.success) {
      setData((prev) => ({
        ...prev,
        posts_items: prev.posts_items.filter((p) => p.id !== postId),
      }));
      setMessage({ type: 'success', text: 'Publicação excluída com sucesso.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao excluir publicação.' });
    }
    setLoading(false);
  };

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percentage: number; stepLabel: string } | null>(null);
  const [imageOffsetY, setImageOffsetY] = useState(50);
  const [imageZoom, setImageZoom] = useState(1.0);
  const [imageFitMode, setImageFitMode] = useState<'cover' | 'contain'>('cover');
  const [selectedFileForCrop, setSelectedFileForCrop] = useState<File | null>(null);

  const handleAdminFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    customOffsetY?: number,
    customZoom?: number
  ) => {
    const files = Array.from(e.target.files || (selectedFileForCrop ? [selectedFileForCrop] : []));
    if (files.length === 0) return;

    for (const f of files) {
      if (f.size > 15 * 1024 * 1024) {
        setMessage({ type: 'error', text: `O arquivo "${f.name}" excede o limite máximo de 15MB.` });
        return;
      }
    }

    const offsetYToUse = customOffsetY !== undefined ? customOffsetY : imageOffsetY;
    const zoomToUse = customZoom !== undefined ? customZoom : imageZoom;

    setUploadingFile(true);
    setMessage(null);

    try {
      const assetType = mediaMode === 'update_logo' ? 'logo' : mediaMode === 'update_cover' ? 'cover' : 'gallery';

      if (assetType === 'gallery' && files.length > 1) {
        let successCount = 0;
        const newMediaItems: AdminBusiness360DTO['gallery_items'] = [];
        const total = files.length;

        for (let i = 0; i < total; i++) {
          const rawFile = files[i];
          if (!rawFile) continue;

          setUploadProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 0.2) / total) * 100),
            stepLabel: `Otimizando foto ${i + 1} de ${total}...`,
          });

          // Compress image client-side to WebP with position framing and zoom
          const file = await compressImageOnClient(rawFile, 1920, 0.82, offsetYToUse / 100, imageFitMode, zoomToUse);

          setUploadProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 0.7) / total) * 100),
            stepLabel: `Enviando foto ${i + 1} de ${total} ao Storage...`,
          });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('businessId', data.business.id);
          formData.append('assetType', 'gallery');

          const res = await uploadAdvertiserAssetAction(formData);
          if (res.success && res.url) {
            successCount++;
            newMediaItems.push({
              id: `media-${Date.now()}-${i}`,
              media_type: 'gallery',
              url: res.url,
              title: mediaTitleInput || null,
              display_order: data.gallery_items.length + newMediaItems.length + 1,
              created_at: new Date().toISOString(),
            });
          }

          setUploadProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100),
            stepLabel: `Foto ${i + 1} enviada com sucesso!`,
          });
        }

        if (newMediaItems.length > 0) {
          setData((prev) => ({
            ...prev,
            gallery_items: [...prev.gallery_items, ...newMediaItems],
          }));
          setMessage({
            type: 'success',
            text: `${successCount} fotos otimizadas e adicionadas à galeria com sucesso!`,
          });
          setShowMediaModal(false);
        } else {
          setMessage({ type: 'error', text: 'Falha ao processar upload das fotos.' });
        }
      } else {
        const rawFile = files[0];
        if (!rawFile) return;

        setSelectedFileForCrop(rawFile);

        setUploadProgress({
          current: 1,
          total: 1,
          percentage: 30,
          stepLabel: 'Otimizando e enquadrando imagem no navegador...',
        });

        // Compress image client-side to WebP with position framing and zoom
        const file = await compressImageOnClient(rawFile, 1920, 0.82, offsetYToUse / 100, imageFitMode, zoomToUse);

        setUploadProgress({
          current: 1,
          total: 1,
          percentage: 75,
          stepLabel: 'Enviando imagem ao Storage...',
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('businessId', data.business.id);
        formData.append('assetType', assetType);
        if (mediaTitleInput) formData.append('title', mediaTitleInput);

        const res = await uploadAdvertiserAssetAction(formData);

        setUploadProgress({
          current: 1,
          total: 1,
          percentage: 100,
          stepLabel: 'Upload concluído!',
        });

        if (res.success && res.url) {
          setMediaUrlInput(res.url);
          if (mediaMode === 'add_gallery') {
            const newPhoto: AdminBusiness360DTO['gallery_items'][number] = {
              id: `media-${Date.now()}`,
              media_type: 'gallery',
              url: res.url,
              title: mediaTitleInput || null,
              display_order: data.gallery_items.length + 1,
              created_at: new Date().toISOString(),
            };
            setData((prev) => ({
              ...prev,
              gallery_items: [...prev.gallery_items, newPhoto],
            }));
            setMessage({ type: 'success', text: 'Foto otimizada e adicionada com sucesso à galeria!' });
            setShowMediaModal(false);
          } else {
            setMessage({ type: 'success', text: 'Imagem otimizada e enviada com sucesso! Clique em "Salvar Mídia" para confirmar.' });
          }
        } else {
          setMessage({ type: 'error', text: res.message || 'Falha ao realizar upload da imagem.' });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao processar upload de arquivos de imagem.' });
    } finally {
      setUploadingFile(false);
      setUploadProgress(null);
    }
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await manageAdminMediaAction(data.business.id, mediaMode, {
        media_id: editingMediaId,
        url: mediaUrlInput,
        title: mediaTitleInput,
      });
      if (res.success) {
        if (mediaMode === 'update_logo') {
          setData((prev) => ({
            ...prev,
            business: { ...prev.business, logo_url: mediaUrlInput },
          }));
        } else if (mediaMode === 'update_cover') {
          setData((prev) => ({
            ...prev,
            business: { ...prev.business, cover_url: mediaUrlInput },
          }));
        } else if (mediaMode === 'add_gallery') {
          const newPhoto = {
            id: `media-${Date.now()}`,
            media_type: 'gallery' as const,
            url: mediaUrlInput,
            title: mediaTitleInput || null,
            display_order: data.gallery_items.length + 1,
            created_at: new Date().toISOString(),
          };
          setData((prev) => ({
            ...prev,
            gallery_items: [...prev.gallery_items, newPhoto],
          }));
        } else if (mediaMode === 'update_gallery_title' && editingMediaId) {
          setData((prev) => ({
            ...prev,
            gallery_items: prev.gallery_items.map((item) =>
              item.id === editingMediaId ? { ...item, title: mediaTitleInput || null } : item
            ),
          }));
        }
        setMessage({ type: 'success', text: 'Mídia salva com sucesso!' });
        setShowMediaModal(false);
      } else {
        setMessage({ type: 'error', text: res.error || 'Erro ao salvar mídia.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar mídia.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Deseja realmente excluir esta foto da galeria? O arquivo de mídia será removido.')) return;
    setLoading(true);
    setMessage(null);
    const res = await manageAdminMediaAction(data.business.id, 'delete_media', { media_id: mediaId });
    if (res.success) {
      setData((prev) => ({
        ...prev,
        gallery_items: prev.gallery_items.filter((m) => m.id !== mediaId),
      }));
      setMessage({ type: 'success', text: 'Foto excluída com sucesso do banco e do armazenamento.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erro ao excluir foto.' });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left pb-24 lg:pb-6">
      {/* NAVEGAÇÃO E HEADER */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/empresas"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
                Prontuário 360º de Gestão
              </span>
              <span className="text-xs text-stone-500 font-mono">ID: {data.business.id}</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
              {data.business.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/guia/${data.business.slug || data.business.id}`}
            target="_blank"
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-stone-600" />
            <span>Ver no Guia</span>
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs ${message.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
            : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TOPO EXECUTIVO DE RESPOSTA RÁPIDA                                   */}
      {/* =================================================================== */}
      <div className="bg-[#3B0B14] border border-[#C9A227]/50 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-700/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-xl text-[#C9A227]">{data.business.name}</h2>
              {data.business.publication_status === 'published' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white font-extrabold text-[10px] uppercase">
                  ✓ Publicada
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-700 text-white font-extrabold text-[10px] uppercase">
                  Suspensa
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 mt-1 line-clamp-1">
              {data.business.category} • Responsável: {data.owner.full_name} ({data.owner.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Plano: <strong className="text-[#C9A227] uppercase">{data.business.plan_code}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Vigência: <strong className="text-emerald-400">Até 24/08/2027</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Pagamento: <strong className="text-emerald-400">Confirmado</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-200">
              Status do cadastro: <strong className="text-emerald-400">{data.business.completeness_percent}%</strong>
            </div>
            {data.business.is_pedra_fundamental && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
                Pedra Fundamental (1/10)
              </div>
            )}
          </div>
        </div>

        {/* AÇÕES DE GOVERNANÇA NO TOPO EXECUTIVO */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setTargetStatus(data.business.publication_status === 'published' ? 'suspended' : 'published');
              setShowStatusModal(true);
            }}
            className={`px-4 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${data.business.publication_status === 'published'
              ? 'bg-rose-700 hover:bg-rose-800 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
          >
            {data.business.publication_status === 'published' ? (
              <>
                <XCircle className="w-4 h-4" /> Suspender Anúncio
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Reativar Anúncio
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowRecognitionModal(true)}
            className="px-4 py-2 bg-[#C9A227] hover:bg-amber-400 text-[#3B0B14] font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4 text-[#3B0B14]" />
            <span>Gerenciar Reconhecimentos</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* BARRA DE NAVEGAÇÃO STICKY POR ABAS                                  */}
      {/* =================================================================== */}
      <div className="sticky top-16 z-30 bg-white border border-stone-300 rounded-xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'resumo', label: 'Resumo' },
          { id: 'cadastro', label: 'Cadastro' },
          { id: 'conteudo', label: 'Conteúdo' },
          { id: 'plano', label: 'Plano & Cotas' },
          { id: 'contrato', label: 'Contrato' },
          { id: 'pagamentos', label: 'Pagamentos' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'reconhecimentos', label: 'Reconhecimentos' },
          { id: 'notificacoes', label: 'Notificações' },
          { id: 'auditoria', label: 'Timeline & Auditoria' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === tab.id
              ? 'bg-[#3B0B14] text-[#C9A227] shadow-xs'
              : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* CONTEÚDO DAS ABAS SELECIONADAS                                      */}
      {/* =================================================================== */}

      {/* ABA 1: RESUMO OPERACIONAL */}
      {activeTab === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#3B0B14] border-b border-stone-200 pb-2 uppercase tracking-wider">
              Resumo da Saúde Operacional do Anúncio
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Status:</span>
                <strong className="text-emerald-700 font-bold">✓ Publicado</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Financeiro:</span>
                <strong className="text-emerald-700 font-bold">✓ Em Dia</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Próxima Renovação:</span>
                <strong className="text-stone-900 font-mono">24/08/2027</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Performance 30d:</span>
                <strong className="text-emerald-700 font-bold">+18.4% visualizações</strong>
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-800 border-b border-stone-200 pb-2 uppercase tracking-wider">
              Uso de Cotas do Plano
            </h3>
            <div className="space-y-3 text-xs font-semibold text-stone-800">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Fotos na Galeria:</span>
                  <span>{data.content_summary.gallery_count} / {data.content_summary.gallery_limit}</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#3B0B14] h-full"
                    style={{ width: `${(data.content_summary.gallery_count / data.content_summary.gallery_limit) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Serviços Cadastrados:</span>
                  <span>{data.content_summary.services_count} / {data.content_summary.services_limit}</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#3B0B14] h-full"
                    style={{ width: `${(data.content_summary.services_count / data.content_summary.services_limit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CADASTRO COMPLETO DA EMPRESA (COM FORMULÁRIO DE EDIÇÃO & VÍNCULO MAÇÔNICO) */}
      {activeTab === 'cadastro' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveForm} className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#3B0B14]" />
                  <span>Dados Cadastrais da Empresa</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Edite os dados cadastrais completos da empresa e clique em Salvar para atualizar no banco de dados.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingForm}
                className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#C9A227]" />}
                <span>Salvar Alterações de Cadastro</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Nome da Empresa / Nome Fantasia *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 font-semibold outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Razão Social</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Razão Social completa"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">CNPJ ou CPF</label>
                <input
                  type="text"
                  value={cnpjCpf}
                  onChange={(e) => setCnpjCpf(formatCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 font-mono outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Categoria Principal</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Telefone Principal *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 98888-7777"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 font-bold text-amber-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">WhatsApp para Contato Direto</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(11) 99999-8888"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 font-semibold outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">E-mail de Contato</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Website Oficial</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://suaempresa.com.br"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Instagram (@usuario ou URL)</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@suaempresa"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Facebook (Página ou URL)</label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="facebook.com/suaempresa"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">LinkedIn (Perfil/Empresa ou URL)</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="linkedin.com/company/suaempresa"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">YouTube (Canal ou @usuario)</label>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="@suaempresa"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 uppercase font-bold outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-stone-800 mb-1">Endereço Físico Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-stone-800 mb-1">Descrição / Apresentação Comercial</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              {/* SEÇÃO DADOS DO EMPRESÁRIO / ANUNCIANTE RESPONSÁVEL & FOTO AVATAR */}
              <div className="md:col-span-2 pt-4 border-t border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#3B0B14] flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#C9A227]" />
                      <span>Card do Empresário / Anunciante Responsável Exibido no Guia</span>
                    </h4>
                    <p className="text-xs text-stone-500">
                      Configure os dados do titular e faça upload da foto do empresário para exibição no perfil público.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  {/* Foto do Empresário (Upload & Preview) */}
                  <div className="flex flex-col items-center justify-center space-y-2 p-3 bg-white rounded-xl border border-stone-200 text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#C9A227] bg-stone-100 flex items-center justify-center relative group shadow-sm">
                      {respAvatarUrl ? (
                        <img
                          src={respAvatarUrl}
                          alt={respName || 'Foto do Empresário'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCheck className="w-10 h-10 text-stone-400" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-2.5 py-1 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                        )}
                        <span>{respAvatarUrl ? 'Substituir Foto' : 'Enviar Foto'}</span>
                      </button>

                      {respAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setRespAvatarUrl('')}
                          className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <span className="text-[10px] text-stone-500 font-mono">Avatar do Empresário (PNG, JPG)</span>
                  </div>

                  {/* Inputs dos Dados do Empresário */}
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Nome do Empresário / Responsável</label>
                      <input
                        type="text"
                        value={respName}
                        onChange={(e) => setRespName(e.target.value)}
                        placeholder="Ex: Dr. Eduardo Saba"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900 text-xs outline-none focus:ring-2 focus:ring-[#3B0B14]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">Cargo na Empresa</label>
                        <input
                          type="text"
                          value={respRole}
                          onChange={(e) => setRespRole(e.target.value)}
                          placeholder="Ex: Sócio Fundador / Diretor"
                          className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900 text-xs outline-none focus:ring-2 focus:ring-[#3B0B14]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">Tratamento / Vínculo</label>
                        <input
                          type="text"
                          value={respCommunityLabel}
                          onChange={(e) => setRespCommunityLabel(e.target.value)}
                          placeholder="Ex: Irmão / Empresário"
                          className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900 text-xs outline-none focus:ring-2 focus:ring-[#3B0B14]"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-[#C9A227] shrink-0" />
                        <span className="truncate text-stone-700">
                          Loja Maçônica: <strong className="text-[#3B0B14] font-bold">{data.masonic_link_detail?.lodge_name || (data.business as any).masonic_lodge || 'Não configurada'}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-2 py-0.5 rounded-md shrink-0">
                        Gerenciada no Vínculo Maçônico
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={savingForm}
                className="px-6 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#C9A227]" />}
                <span>Salvar Alterações de Cadastro</span>
              </button>
            </div>
          </form>

          {/* VÍNCULO MAÇÔNICO - CARTÃO DE ANÁLISE DE SEGURANÇA */}
          <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3B0B14]" />
                  <span>Análise de Vínculo Maçônico Institucional</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Verifique ou cadastre a declaração de pertencimento a uma Loja Maçônica antes de conceder selos institucionais.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setMasonicLodgeInput(data.masonic_link_detail?.lodge_name || '');
                    setMasonicPotencyInput(data.masonic_link_detail?.potency || '');
                    setMasonicLinkTypeInput(data.masonic_link_detail?.link_type || 'Proprietário Ir∴');
                    setMasonicStatusInput(data.masonic_link_detail?.status || 'verified');
                    setMasonicJustificationInput('');
                    setShowMasonicUpsertModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-[#C9A227]/40 shadow-xs"
                >
                  <Plus className="w-4 h-4 text-[#C9A227]" />
                  <span>{data.masonic_link_detail ? 'Editar Vínculo' : 'Cadastrar Vínculo'}</span>
                </button>

                {data.masonic_link_detail && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetMasonicStatus('verified');
                        setShowMasonicModal(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Aprovar Vínculo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetMasonicStatus('rejected');
                        setShowMasonicModal(true);
                      }}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Rejeitar Vínculo
                    </button>
                  </>
                )}
              </div>
            </div>

            {data.masonic_link_detail ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-stone-500 block font-bold">Loja Declarada:</span>
                  <strong className="text-stone-900 font-serif font-bold text-sm block mt-0.5">
                    {data.masonic_link_detail.lodge_name}
                  </strong>
                  <span className="text-[11px] text-stone-500 font-mono">Potência: {data.masonic_link_detail.potency}</span>
                </div>

                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-stone-500 block font-bold">Tipo de Relação:</span>
                  <strong className="text-stone-900 font-bold block mt-0.5">
                    {data.masonic_link_detail.link_type === 'owner'
                      ? 'Proprietário / Sócio Direto'
                      : data.masonic_link_detail.link_type === 'equity_partner'
                        ? 'Sócio Cotista'
                        : data.masonic_link_detail.link_type === 'family_owner'
                          ? 'Empresa Familiar'
                          : data.masonic_link_detail.link_type === 'sales_representative'
                            ? 'Representante Comercial'
                            : data.masonic_link_detail.link_type === 'executive'
                              ? 'Diretor Executivo'
                              : data.masonic_link_detail.link_type === 'institutional_partner'
                                ? 'Parceiro Institucional'
                                : data.masonic_link_detail.link_type}
                  </strong>
                </div>

                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-stone-500 block font-bold">Status Atual da Verificação:</span>
                  <span
                    className={`inline-block px-3 py-1 mt-1 rounded-full font-bold text-xs ${data.masonic_link_detail.status === 'verified'
                      ? 'bg-emerald-100 text-emerald-900'
                      : data.masonic_link_detail.status === 'rejected'
                        ? 'bg-rose-100 text-rose-900'
                        : 'bg-amber-100 text-amber-900'
                      }`}
                  >
                    {data.masonic_link_detail.status === 'verified'
                      ? '✓ Vínculo Verificado'
                      : data.masonic_link_detail.status === 'rejected'
                        ? '✕ Vínculo Rejeitado'
                        : '⏳ Aguardando Verificação'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3B0B14] shrink-0" />
                  <span>
                    <strong>Nenhuma declaração registrada:</strong> Caso a empresa possua pertencimento maçônico e não tenha preenchido no cadastro, você pode incluir o vínculo manualmente clicando no botão ao lado.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMasonicLodgeInput('');
                    setMasonicPotencyInput('');
                    setMasonicLinkTypeInput('Proprietário Ir∴');
                    setMasonicStatusInput('verified');
                    setMasonicJustificationInput('');
                    setShowMasonicUpsertModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] font-bold text-xs rounded-xl shrink-0 cursor-pointer border border-[#C9A227]/40 shadow-xs"
                >
                  + Cadastrar Vínculo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: CONTEÚDO E MÍDIAS DA EMPRESA (GERENCIAMENTO REAL DE CONTEÚDO) */}
      {activeTab === 'conteudo' && (
        <div className="space-y-6 text-left">
          {/* SEÇÃO 1: IDENTIDADE VISUAL (LOGO & CAPA) */}
          <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#3B0B14]" />
              <span>Identidade Visual do Anúncio (Logo & Capa)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Logo Oficial - (businesses.logo_url)*/}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <strong className="font-bold text-stone-900">Logo Oficial </strong>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaMode('update_logo');
                      setMediaUrlInput(data.business.logo_url || '');
                      setShowMediaModal(true);
                    }}
                    className="px-2.5 py-1 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#C9A227]" /> Alterar/Editar Logo
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {data.business.logo_url ? (
                    <img
                      src={data.business.logo_url}
                      alt="Logo Oficial"
                      className="w-16 h-16 object-contain rounded-xl border border-stone-300 bg-white p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-dashed border-stone-400 bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-[10px]">
                      Sem Logo
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[11px] inline-block">
                      {data.business.logo_url ? '✓ Logotipo Cadastrado' : 'Sem Logotipo'}
                    </span>
                    <span className="text-[10px] text-stone-400 block">Exibido nos cartões de busca e no perfil público.</span>
                  </div>
                </div>
              </div>

              {/* Capa Oficial */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <strong className="font-bold text-stone-900">Imagem de Capa</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaMode('update_cover');
                      setMediaUrlInput(data.cover_item?.url || '');
                      setShowMediaModal(true);
                    }}
                    className="px-2.5 py-1 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#C9A227]" /> Alterar/Editar Capa
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {data.cover_item?.url ? (
                    <img
                      src={data.cover_item.url}
                      alt="Capa do Anúncio"
                      className="w-28 h-16 object-cover rounded-xl border border-stone-300 bg-stone-200"
                    />
                  ) : (
                    <div className="w-28 h-16 rounded-xl border border-dashed border-stone-400 bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-[10px]">
                      Sem Capa
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[11px] inline-block">
                      {data.cover_item?.url ? '✓ Imagem de Capa Cadastrada' : 'Sem Capa'}
                    </span>
                    <span className="text-[10px] text-stone-400 block">Exibida no topo do perfil da empresa.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: GALERIA DE FOTOS (business_media) */}
          <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#3B0B14]" />
                  <span>Galeria de Fotos da Empresa ({data.gallery_items.length} / {data.content_summary.gallery_limit})</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Fotos cadastradas na tabela <code className="font-mono bg-stone-100 px-1">business_media</code>. Remoção física trata o Supabase Storage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMediaMode('add_gallery');
                  setMediaUrlInput('');
                  setMediaTitleInput('');
                  setShowMediaModal(true);
                }}
                disabled={data.gallery_items.length >= data.content_summary.gallery_limit}
                className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" /> Adicionar Foto
              </button>
            </div>

            {data.gallery_items.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-300 rounded-2xl text-xs text-stone-500">
                Nenhuma foto cadastrada na galeria deste anunciante.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.gallery_items.map((item) => (
                  <div key={item.id} className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-2 p-2">
                    <img
                      src={item.url}
                      alt={item.title || 'Foto da Galeria'}
                      className="w-full h-28 object-cover rounded-xl bg-stone-200"
                    />
                    <div className="text-[11px] space-y-1">
                      <p className="font-bold text-stone-900 truncate">{item.title || `Foto ${item.display_order}`}</p>
                      <span className="text-[10px] text-stone-400 block font-mono">Ordem: #{item.display_order}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setMediaMode('update_gallery_title');
                          setEditingMediaId(item.id);
                          setMediaTitleInput(item.title || '');
                          setShowMediaModal(true);
                        }}
                        className="text-stone-600 hover:text-stone-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Legenda
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMedia(item.id)}
                        className="text-rose-700 hover:text-rose-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 3: SERVIÇOS OFERECIDOS (business_services) */}
          <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#3B0B14]" />
                  <span>Serviços da Empresa ({data.services_items.filter(s => s.is_active).length} ativos / {data.content_summary.services_limit} cota)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Gerencie ou inative serviços da tabela <code className="font-mono bg-stone-100 px-1">business_services</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setServiceMode('create');
                  setServiceName('');
                  setServiceDesc('');
                  setServicePrice('');
                  setShowServiceModal(true);
                }}
                disabled={data.services_items.length >= data.content_summary.services_limit}
                className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" /> Adicionar Serviço
              </button>
            </div>

            {data.services_items.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-300 rounded-2xl text-xs text-stone-500">
                Nenhum serviço cadastrado para este anunciante.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.services_items.map((svc) => (
                  <div
                    key={svc.id}
                    className={`p-4 rounded-2xl border text-xs space-y-2 shadow-xs transition-colors ${svc.is_active ? 'bg-white border-stone-300' : 'bg-stone-100 border-stone-300 opacity-75'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="font-serif font-bold text-sm text-stone-900 block">{svc.name}</strong>
                        {svc.price_info && (
                          <span className="text-[11px] font-mono font-bold text-amber-900 block mt-0.5">{svc.price_info}</span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${svc.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-300 text-stone-700'
                          }`}
                      >
                        {svc.is_active ? 'Ativo (Visível)' : 'Inativo (Oculto)'}
                      </span>
                    </div>

                    {svc.description && <p className="text-stone-600 text-[11px] leading-relaxed">{svc.description}</p>}

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleServiceActive(svc.id, svc.is_active)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${svc.is_active ? 'bg-stone-200 hover:bg-stone-300 text-stone-800' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            }`}
                        >
                          {svc.is_active ? 'Inativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setServiceMode('edit');
                            setEditingServiceId(svc.id);
                            setServiceName(svc.name);
                            setServiceDesc(svc.description || '');
                            setServicePrice(svc.price_info || '');
                            setShowServiceModal(true);
                          }}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteService(svc.id)}
                        className="text-rose-700 hover:text-rose-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 4: BENEFÍCIOS FRATERNOS (business_benefits) */}
          <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#3B0B14]" />
                  <span>Benefícios Fraternos ({data.benefits_items.filter(b => b.is_active).length} ativos / {data.content_summary.benefits_limit} cota)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Gerencie condições exclusivas para Irmãos na tabela <code className="font-mono bg-stone-100 px-1">business_benefits</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBenefitMode('create');
                  setBenefitTitle('');
                  setBenefitDesc('');
                  setBenefitDiscount('');
                  setShowBenefitModal(true);
                }}
                disabled={data.benefits_items.length >= data.content_summary.benefits_limit}
                className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" /> Adicionar Benefício
              </button>
            </div>

            {data.benefits_items.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-300 rounded-2xl text-xs text-stone-500">
                Nenhum benefício fraterno cadastrado para este anunciante.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.benefits_items.map((ben) => (
                  <div
                    key={ben.id}
                    className={`p-4 rounded-2xl border text-xs space-y-2 shadow-xs transition-colors ${ben.is_active ? 'bg-white border-amber-300/80' : 'bg-stone-100 border-stone-300 opacity-75'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="font-serif font-bold text-sm text-stone-900 block">{ben.title}</strong>
                        {ben.discount_percentage && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-bold text-[10px] inline-block mt-1">
                            {ben.discount_percentage}% OFF
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${ben.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-300 text-stone-700'
                          }`}
                      >
                        {ben.is_active ? 'Ativo (Visível)' : 'Inativo (Oculto)'}
                      </span>
                    </div>

                    <p className="text-stone-600 text-[11px] leading-relaxed">{ben.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleBenefitActive(ben.id, ben.is_active)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${ben.is_active ? 'bg-stone-200 hover:bg-stone-300 text-stone-800' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            }`}
                        >
                          {ben.is_active ? 'Inativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBenefitMode('edit');
                            setEditingBenefitId(ben.id);
                            setBenefitTitle(ben.title);
                            setBenefitDesc(ben.description || '');
                            setBenefitDiscount(ben.discount_percentage || '');
                            setShowBenefitModal(true);
                          }}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBenefit(ben.id)}
                        className="text-rose-700 hover:text-rose-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SESSÃO DE EVENTOS DA EMPRESA */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#3B0B14]" /> Eventos da Empresa ({data.events_items?.length || 0})
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Agendamento de feiras, palestras, lançamentos e encontros da empresa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEventMode('create');
                  setEditingEventId(null);
                  setEventTitle('');
                  setEventDesc('');
                  setEventStartsAt('');
                  setEventEndsAt('');
                  setEventLocation('');
                  setEventCoverUrl('');
                  setEventStatus('published');
                  setShowEventModal(true);
                }}
                className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs font-serif"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" /> + Novo Evento
              </button>
            </div>

            {data.events_items && data.events_items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.events_items.map((ev) => (
                  <div key={ev.id} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs font-serif">
                    {ev.cover_image_url && (
                      <div className="w-full h-28 rounded-xl overflow-hidden bg-stone-200 mb-2 border border-stone-300">
                        <img src={ev.cover_image_url} alt={ev.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <strong className="text-stone-900 text-sm font-bold">{ev.title}</strong>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${ev.publication_status === 'published' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                        {ev.publication_status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>

                    <div className="text-stone-600 text-[11px] space-y-1">
                      <div>📅 <strong>Início:</strong> {new Date(ev.starts_at).toLocaleString('pt-BR')}</div>
                      {ev.ends_at && <div>🏁 <strong>Término:</strong> {new Date(ev.ends_at).toLocaleString('pt-BR')}</div>}
                      {ev.location_name && <div>📍 <strong>Local:</strong> {ev.location_name}</div>}
                      {ev.description && <p className="text-stone-700 mt-1 italic">{ev.description}</p>}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setEventMode('edit');
                          setEditingEventId(ev.id);
                          setEventTitle(ev.title);
                          setEventDesc(ev.description || '');
                          setEventStartsAt(ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16) : '');
                          setEventEndsAt(ev.ends_at ? new Date(ev.ends_at).toISOString().slice(0, 16) : '');
                          setEventLocation(ev.location_name || '');
                          setEventCoverUrl(ev.cover_image_url || '');
                          setEventStatus(ev.publication_status as any);
                          setShowEventModal(true);
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-rose-700 hover:text-rose-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl text-center text-xs text-stone-500 font-serif">
                Nenhum evento cadastrado para esta empresa.
              </div>
            )}
          </div>

          {/* SESSÃO DE POSTS & NOVIDADES */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-[#3B0B14]" /> Publicações &amp; Novidades ({data.posts_items?.length || 0})
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Notícias, comunicados, artigos e atualizações divulgadas pela empresa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPostMode('create');
                  setEditingPostId(null);
                  setPostTitle('');
                  setPostSummary('');
                  setPostContent('');
                  setPostStatus('published');
                  setShowPostModal(true);
                }}
                className="px-3.5 py-1.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs font-serif"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" /> + Nova Publicação
              </button>
            </div>

            {data.posts_items && data.posts_items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.posts_items.map((post) => (
                  <div key={post.id} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs font-serif">
                    <div className="flex justify-between items-start">
                      <strong className="text-stone-900 text-sm font-bold">{post.title}</strong>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${post.publication_status === 'published' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                        {post.publication_status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>

                    {post.summary && <p className="text-stone-700 font-semibold text-[11px]">{post.summary}</p>}
                    <p className="text-stone-600 text-[11px] line-clamp-3">{post.content}</p>
                    <span className="text-[10px] text-stone-400 block">Publicado em: {new Date(post.created_at).toLocaleDateString('pt-BR')}</span>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setPostMode('edit');
                          setEditingPostId(post.id);
                          setPostTitle(post.title);
                          setPostSummary(post.summary || '');
                          setPostContent(post.content);
                          setPostStatus(post.publication_status as any);
                          setShowPostModal(true);
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="text-rose-700 hover:text-rose-900 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl text-center text-xs text-stone-500 font-serif">
                Nenhuma publicação cadastrada para esta empresa.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: PLANO & COTAS */}
      {activeTab === 'plano' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-stone-200 pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#3B0B14]" /> Cotas e Direitos do Plano {data.subscription.plan_name}
              </h3>
              <p className="text-xs text-stone-500">
                Acompanhe as cotas cadastradas e gerencie upgrades ou downgrades comerciais do anunciante.
              </p>
            </div>
            <span className="px-3 py-1 bg-[#3B0B14] text-[#C9A227] font-bold text-xs rounded-full uppercase tracking-wider">
              Plano Atual: {data.business.plan_code}
            </span>
          </div>

          {/* SUMMARY CARDS DE COTAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Galeria de Fotos:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.gallery_count} / {data.content_summary.gallery_limit}
              </p>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Serviços:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.services_count} / {data.content_summary.services_limit}
              </p>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Benefícios Fraternos:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.benefits_count} / {data.content_summary.benefits_limit}
              </p>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Eventos & Posts:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {data.content_summary.events_count} / {data.content_summary.events_limit}
              </p>
            </div>
          </div>

          {/* PAINEL DE GESTÃO DE UPGRADE / DOWNGRADE DE PLANO */}
          <form onSubmit={handleUpdatePlan} className="p-5 bg-stone-50 border border-stone-300 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C9A227]" /> Alterar Plano Comercial (Upgrade / Downgrade)
              </h4>
              <span className="text-[11px] text-stone-500">Alteração auditada no sistema</span>
            </div>

            {planMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${planMessage.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-red-100 text-red-900 border border-red-300'
                  }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{planMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  code: 'bronze',
                  title: 'Plano Bronze',
                  price: 'R$ 49/mês',
                  desc: '1 foto, 2 serviços, sem benefícios fraternos.',
                },
                {
                  code: 'prata',
                  title: 'Plano Prata',
                  price: 'R$ 99/mês',
                  desc: '3 fotos, 5 serviços, 1 benefício fraterno.',
                },
                {
                  code: 'ouro',
                  title: 'Plano Ouro (Premium)',
                  price: 'R$ 199/mês',
                  desc: '10 fotos, 10 serviços, 5 benefícios, 5 eventos & posts, prioridade visual.',
                },
              ].map((p) => {
                const isCurrent = data.business.plan_code === p.code;
                const isSelected = selectedPlanCode === p.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedPlanCode(p.code as any)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${isSelected
                        ? 'bg-[#3B0B14] text-white border-[#C9A227] shadow-md ring-2 ring-[#C9A227]/40'
                        : 'bg-white text-stone-900 border-stone-300 hover:border-stone-400'
                      }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Atual
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isSelected ? 'text-[#C9A227]' : 'text-stone-500'}`}>
                      {p.price}
                    </span>
                    <h5 className="font-serif font-bold text-sm mt-1">{p.title}</h5>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>{p.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-800">
                Justificativa Operacional da Alteração de Plano *
              </label>
              <textarea
                rows={2}
                value={planJustification}
                onChange={(e) => setPlanJustification(e.target.value)}
                placeholder="Ex: Upgrade solicitado via atendimento comercial ou ajuste de cota contratual."
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
                required
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={updatingPlan || selectedPlanCode === data.business.plan_code}
                className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#4B161B] disabled:opacity-50 text-[#C9A227] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {updatingPlan ? <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" /> : <Save className="w-4 h-4" />}
                <span>Confirmar Upgrade / Downgrade de Plano</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 5: CONTRATO */}
      {activeTab === 'contrato' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-200 pb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3B0B14]" />
                <span>Contrato Digital de Adesão Comercial</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Instrumento formal homologado por aceite eletrônico com chancela de integridade criptográfica SHA-256.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyContractText}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Copiar texto para área de transferência"
              >
                <FileText className="w-4 h-4 text-stone-600" /> Copiar Texto
              </button>

              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-stone-600" /> Tela Cheia
              </button>

              <button
                type="button"
                onClick={handlePrintContractPDF}
                className="px-4 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4 text-[#C9A227]" /> Salvar em PDF / Imprimir
              </button>
            </div>
          </div>

          {/* Dossiê de Integridade do Contrato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-bold block">Status Jurídico:</span>
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-full">
                ✓ Assinado e Válido
              </span>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-bold block">Data e Hora da Assinatura:</span>
              <strong className="text-stone-900 font-mono text-xs block">
                {data.contract?.signed_at
                  ? `${new Date(data.contract.signed_at).toLocaleDateString('pt-BR')} às ${new Date(data.contract.signed_at).toLocaleTimeString('pt-BR')}`
                  : new Date(data.business.created_at).toLocaleDateString('pt-BR')}
              </strong>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-bold block">Assinatura SHA-256:</span>
              <strong className="text-stone-800 font-mono text-[11px] block truncate" title={data.contract?.sha256_hash}>
                {data.contract?.sha256_hash || '4f8a91b2c3d4e5f6a7b8c9d0e1f2a3b4...'}
              </strong>
            </div>
          </div>

          {/* Visualizador do Papel Timbrado Oficial do Contrato */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700">
              <span>Papel Timbrado Oficial — Cópia Registrada</span>
              <span className="text-stone-400 font-mono">Versão: {data.contract?.version || 'v1.0'}</span>
            </div>

            {/* Documento Timbrado */}
            <div className="p-8 bg-[#FAF8F5] border-2 border-[#3B0B14] rounded-3xl shadow-md space-y-6 relative overflow-hidden">
              {/* Borda interna decorativa em tom dourado */}
              <div className="absolute inset-2 border border-[#C9A227]/40 rounded-2xl pointer-events-none" />

              {/* Barra Bordô Institucional com Logo na Esquerda (Sem Fundo Branco) e Título Centralizado */}
              <div className="bg-[#3B0B14] -mx-8 -mt-8 p-5 rounded-t-3xl border-b-2 border-[#C9A227] grid grid-cols-[80px_1fr_80px] items-center shadow-md">
                <img
                  src="/logoconexao_red.png"
                  alt="Conexão Maçônica Logo"
                  className="h-14 object-contain"
                />
                <div className="text-center space-y-0.5">
                  <h4 className="font-serif font-extrabold text-xl text-[#C9A227] tracking-wider uppercase drop-shadow-sm">
                    CONEXÃO MAÇÔNICA
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-200">
                    GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS
                  </p>
                </div>
                <div className="w-[80px]" />
              </div>

              {/* Faixa de Destaque do Título do Contrato */}
              <div className="text-center py-2.5 px-4 bg-[#3B0B14]/5 border-y-2 border-[#3B0B14]/20 rounded-xl my-3">
                <h5 className="font-serif font-extrabold text-sm sm:text-base text-[#3B0B14] uppercase tracking-wide">
                  Contrato de Prestação de Serviços de Publicidade e Presença Comercial Digital
                </h5>
              </div>

              {/* Corpo do Texto Contratual */}
              <div className="font-serif text-xs text-stone-900 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto select-text pr-2 text-justify">
                {data.contract?.rendered_text || 'Carregando termo contratual...'}
              </div>

              {/* Dossiê de Assinatura Eletrônica e Timbre de Segurança */}
              <div className="p-4 bg-white border border-[#C9A227]/60 rounded-xl space-y-1.5 font-serif text-[11px] text-stone-800 shadow-xs">
                <div className="font-serif font-bold text-xs text-[#3B0B14] border-b border-stone-200 pb-1 uppercase tracking-wider">
                  📜 Dossiê de Autenticidade e Assinatura Eletrônica (MP 2.200-2/2001)
                </div>
                <div>• <strong>Empresa Signatária:</strong> {data.business.name} ({data.business.legal_name || data.business.name})</div>
                <div>• <strong>Documento CNPJ/CPF:</strong> {data.business.cnpj_cpf || 'Registrado na Plataforma'}</div>
                <div>• <strong>Status Jurídico:</strong> CONTRATO VÁLIDO E HOMOLOGADO</div>
                <div>• <strong>Data/Hora de Aceite:</strong> {data.contract?.signed_at ? new Date(data.contract.signed_at).toLocaleString('pt-BR') : new Date(data.business.created_at).toLocaleString('pt-BR')}</div>
                <div className="truncate" title={data.contract?.sha256_hash}>• <strong>Hash SHA-256:</strong> {data.contract?.sha256_hash || '4f8a91b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 6: PAGAMENTOS & COBRANÇA */}
      {activeTab === 'pagamentos' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-6 font-serif">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-200 pb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#3B0B14]" />
                <span>Histórico de Pagamentos &amp; Cobrança</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Acompanhamento detalhado das faturas, datas de pagamento, meio de pagamento e vigência da assinatura.
              </p>
            </div>

            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full flex items-center gap-1.5 border border-emerald-300 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Assinatura Em Dia ({data.subscription.plan_name})</span>
            </span>
          </div>

          {/* Cards de Resumo da Assinatura Atual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-bold block">Plano Contratado:</span>
              <strong className="text-base font-serif font-bold text-[#3B0B14] block">
                {data.subscription.plan_name}
              </strong>
              <span className="text-stone-500 block">
                R$ {data.subscription.amount_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ano
              </span>
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-bold block">Data do Primeiro Aceite/Pagamento:</span>
              <strong className="text-stone-900 font-serif text-sm block">
                {new Date(data.subscription.start_date).toLocaleDateString('pt-BR')} às {new Date(data.subscription.start_date).toLocaleTimeString('pt-BR')}
              </strong>
              <span className="text-emerald-700 font-bold text-[11px] block">✓ Transação Homologada</span>
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-bold block">Próximo Vencimento / Renovação:</span>
              <strong className="text-stone-900 font-serif text-sm block">
                {new Date(data.subscription.next_billing_date).toLocaleDateString('pt-BR')}
              </strong>
              <span className="text-stone-500 text-[11px] block">Renovação Anual Recorrente</span>
            </div>
          </div>

          {/* Tabela Detalhada do Histórico de Faturas / Pagamentos */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <History className="w-4 h-4 text-[#3B0B14]" />
              <span>Faturas e Transações Registradas</span>
            </h4>

            {data.payments_history && data.payments_history.length > 0 ? (
              <div className="overflow-x-auto border border-stone-200 rounded-2xl">
                <table className="w-full text-left text-xs text-stone-800">
                  <thead className="bg-stone-100 text-stone-700 uppercase font-serif text-[10px] tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Plano / Descrição</th>
                      <th className="py-3 px-4">Data do Pagamento</th>
                      <th className="py-3 px-4">Forma de Pagamento</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4 text-right">Status da Fatura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white font-serif">
                    {data.payments_history.map((pay) => (
                      <tr key={pay.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {data.subscription.plan_name}
                        </td>
                        <td className="py-3.5 px-4 text-stone-700">
                          {new Date(pay.date).toLocaleDateString('pt-BR')} às {new Date(pay.date).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-stone-100 text-stone-800 font-bold rounded-lg border border-stone-300 inline-flex items-center gap-1.5 text-[11px]">
                            <CreditCard className="w-3.5 h-3.5 text-stone-600" />
                            {pay.payment_method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#3B0B14]">
                          R$ {pay.amount_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-full text-[11px] inline-flex items-center gap-1 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {pay.status_label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl text-center text-xs text-stone-500">
                Nenhum histórico adicional de cobrança registrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 7: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#3B0B14]" /> Performance & Interações (Últimos 30 dias)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Visualizações:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.views_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Interações:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.interactions_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Cliques WhatsApp:</span>
              <p className="text-2xl font-serif font-bold text-emerald-800 mt-1">{data.analytics_summary.whatsapp_clicks_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Solicitações Rota GPS:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.route_clicks_30d}</p>
            </div>
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <span className="text-stone-500 block font-bold">Visitas ao Website:</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{data.analytics_summary.website_clicks_30d}</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA 8: RECONHECIMENTOS & SELOS INSTITUCIONAIS */}
      {activeTab === 'reconhecimentos' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-6 text-left">
          <div className="flex justify-between items-center border-b border-stone-200 pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C9A227]" /> Gestão de Reconhecimentos Institucionais
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Plano Atual da Empresa: <strong className="uppercase text-stone-900">{data.business.plan_code}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRecognitionModal(true)}
              className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <span>Gerenciar Selos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                key: 'pedra_fundamental',
                title: 'Pedra Fundamental (10/10)',
                active: data.business.is_pedra_fundamental,
                subtitle: data.business.is_pedra_fundamental ? '✓ Ativo no Perfil Público' : 'Não Concedido',
              },
              {
                key: 'coluna_de_honra',
                title: 'Coluna de Honra',
                active: data.business.is_coluna_honra,
                subtitle: data.business.is_coluna_honra ? '✓ Ativo no Perfil Público' : 'Não Concedido',
              },
              {
                key: 'empresa_verificada',
                title: 'Empresa Verificada',
                active: Boolean(data.business.is_verified || data.masonic_link_detail?.status === 'verified'),
                subtitle: (data.business.is_verified || data.masonic_link_detail?.status === 'verified')
                  ? '✓ Ativo (Vínculo Cadastral Aprovado)'
                  : 'Inativo (Pendente de Validação Cadastral)',
              },
            ].map((seal) => (
              <div
                key={seal.key}
                className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${seal.active
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-stone-50 border-stone-200 text-stone-500'
                  }`}
              >
                <div>
                  <span className="font-serif font-bold text-sm block">{seal.title}</span>
                  <span className="text-[11px] font-mono">{seal.subtitle}</span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${seal.active
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-stone-200 text-stone-600'
                    }`}
                >
                  {seal.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ABA 9: NOTIFICAÇÕES */}
      {activeTab === 'notificacoes' && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#3B0B14]" /> Central de Notificações enviadas ao Anunciante
          </h3>
          <p className="text-xs text-stone-500">Nenhuma notificação crítica pendente para este anunciante.</p>
        </div>
      )}

      {/* ABA 10: TIMELINE ÚNICA & AUDITORIA */}
      {(activeTab === 'auditoria' || activeTab === 'resumo') && (
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-[#3B0B14]" /> Timeline Operacional & Audit Trail
          </h3>

          <div className="space-y-3">
            {data.audit_timeline.map((log) => (
              <div key={log.id} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs flex items-start gap-3">
                <Clock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-stone-900 font-bold">{log.action}</strong>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(log.date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-stone-600 mt-0.5">{log.description}</p>
                  <span className="text-[10px] text-stone-400 block mt-1">Por: {log.performed_by}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: SUSPENDER / REATIVAR COM JUSTIFICATIVA MANDATÓRIA */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>{targetStatus === 'suspended' ? 'Suspender Anúncio' : 'Reativar Anúncio'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Esta ação alterará a visibilidade do anúncio no Guia Maçônico. Informe a justificativa obrigatória para o registro de auditoria.
            </p>

            <div className="space-y-1 text-xs">
              <label className="block font-bold text-stone-800">Justificativa Operacional:</label>
              <textarea
                rows={3}
                placeholder="Ex: Suspensão temporária a pedido do anunciante ou pendência financeira."
                value={statusJustification}
                onChange={(e) => setStatusJustification(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={loading}
                className={`px-5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md ${targetStatus === 'suspended'
                  ? 'bg-rose-700 hover:bg-rose-800 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                <span>Confirmar & Registrar Auditoria</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR RECONHECIMENTOS FRATERNOS */}
      {showRecognitionModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C9A227]" /> Gerenciar Reconhecimentos Fraternos
              </h3>
              <button
                type="button"
                onClick={() => setShowRecognitionModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-stone-800">Selecione o Selo:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'is_pedra_fundamental', label: 'Pedra Fundamental (10/10)' },
                  { key: 'is_coluna_honra', label: 'Coluna de Honra (Empresa Fundadora)' },
                  { key: 'is_verified', label: 'Selo de Verificação' },
                ].map((rec) => (
                  <button
                    key={rec.key}
                    type="button"
                    onClick={() => setTargetRecognitionKey(rec.key as any)}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left cursor-pointer ${targetRecognitionKey === rec.key
                      ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]'
                      : 'bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                  >
                    {rec.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="font-bold text-stone-800">Ação:</label>
                <button
                  type="button"
                  onClick={() => setTargetRecognitionValue(true)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${targetRecognitionValue ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700'
                    }`}
                >
                  Conceder Selo
                </button>
                <button
                  type="button"
                  onClick={() => setTargetRecognitionValue(false)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${!targetRecognitionValue ? 'bg-rose-700 text-white' : 'bg-stone-100 text-stone-700'
                    }`}
                >
                  Revogar Selo
                </button>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-stone-800">Justificativa Operacional:</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Empresa participante da Pedra Fundamental pioneira do ecossistema."
                  value={recognitionJustification}
                  onChange={(e) => setRecognitionJustification(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRecognitionModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleRecognition}
                disabled={loading}
                className="px-5 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Reconhecimento</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: VERIFICAÇÃO DE VÍNCULO MAÇÔNICO */}
      {showMasonicModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-800" />
                <span>{targetMasonicStatus === 'verified' ? 'Aprovar Vínculo Maçônico' : 'Rejeitar Vínculo Maçônico'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMasonicModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Informe a justificativa ou nota de auditoria para {targetMasonicStatus === 'verified' ? 'verificar' : 'rejeitar'} este vínculo.
            </p>

            <div className="space-y-1 text-xs">
              <label className="block font-bold text-stone-800">Justificativa de Auditoria:</label>
              <textarea
                rows={3}
                placeholder="Ex: Documento de pertencimento verificado junto à Secretaria da Loja."
                value={masonicJustification}
                onChange={(e) => setMasonicJustification(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMasonicModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleVerifyMasonicLink(targetMasonicStatus)}
                disabled={loading}
                className={`px-5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer text-white ${targetMasonicStatus === 'verified' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4" />}
                <span>Confirmar Decisão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR SERVIÇO */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveService} className="bg-white border border-stone-300 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#3B0B14]" />
                <span>{serviceMode === 'create' ? 'Adicionar Serviço' : 'Editar Serviço'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Consultoria Jurídica"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 font-bold outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Preço / Condição de Preço (Opcional)</label>
                <input
                  type="text"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  placeholder="Ex: Sob consulta / R$ 150,00"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Descrição detalhada do serviço prestado..."
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-[#C9A227]" />}
                <span>Salvar Serviço</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: GERENCIAR BENEFÍCIO FRATERNO */}
      {showBenefitModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveBenefit} className="bg-white border border-stone-300 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#3B0B14]" />
                <span>{benefitMode === 'create' ? 'Adicionar Benefício Fraterno' : 'Editar Benefício Fraterno'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBenefitModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Título do Benefício *</label>
                <input
                  type="text"
                  value={benefitTitle}
                  onChange={(e) => setBenefitTitle(e.target.value)}
                  placeholder="Ex: 15% de desconto para Irmãos"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 font-bold outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">% de Desconto (Opcional)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={benefitDiscount}
                  onChange={(e) => setBenefitDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 15"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 font-mono outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Regras e Instruções *</label>
                <textarea
                  rows={3}
                  value={benefitDesc}
                  onChange={(e) => setBenefitDesc(e.target.value)}
                  placeholder="Ex: Apresentar identificação de pertencimento na contratação."
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBenefitModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-[#C9A227]" />}
                <span>Salvar Benefício</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: GERENCIAR MÍDIA (LOGO, CAPA E GALERIA) */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 overflow-y-auto">
          <form
            onSubmit={handleSaveMedia}
            className="bg-white border border-stone-300 rounded-3xl p-5 md:p-6 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl text-left"
          >
            {/* Header Fixo */}
            <div className="flex justify-between items-center border-b border-stone-200 pb-3 shrink-0">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#3B0B14]" />
                <span>
                  {mediaMode === 'update_logo'
                    ? 'Alterar/Editar Logo Oficial'
                    : mediaMode === 'update_cover'
                      ? 'Alterar/Editar Imagem de Capa'
                      : mediaMode === 'update_gallery_title'
                        ? 'Editar Legenda da Foto'
                        : 'Adicionar Foto à Galeria'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Rolável (Com Layout Responsivo Horizontal de 2 Colunas no Desktop) */}
            <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
              {/* Barra de Progresso Visual de Upload */}
              {uploadProgress && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 shadow-xs">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-[#3B0B14]" />
                      {uploadProgress.stepLabel}
                    </span>
                    <span className="font-mono text-xs text-[#3B0B14]">
                      {uploadProgress.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-amber-200/80 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-[#3B0B14] to-[#C9A227] transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {mediaMode !== 'update_gallery_title' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Coluna da Esquerda: Pré-visualização & Controles de Zoom/Enquadramento */}
                  <div className="space-y-3">
                    <label className="block font-bold text-stone-800">
                      {mediaMode === 'update_logo'
                        ? 'Logotipo Oficial'
                        : mediaMode === 'update_cover'
                          ? 'Imagem de Capa'
                          : 'Foto da Galeria'}
                    </label>

                    {mediaUrlInput && (
                      <div className="relative w-full h-44 rounded-2xl bg-stone-200 border border-stone-300 overflow-hidden flex items-center justify-center shadow-inner group">
                        <img
                          src={mediaUrlInput}
                          alt="Pré-visualização do Enquadramento"
                          style={{
                            transform: `scale(${imageZoom})`,
                            transformOrigin: `center ${imageOffsetY}%`,
                            objectPosition: `center ${imageOffsetY}%`,
                            objectFit: imageFitMode,
                          }}
                          className="w-full h-full transition-all duration-150"
                        />
                        <div className="absolute top-2 right-2 bg-stone-950/75 text-white text-[10px] px-2 py-0.5 rounded-md font-mono font-bold backdrop-blur-xs">
                          ✓ Pré-visualização Real
                        </div>
                      </div>
                    )}

                    {/* Controles de Zoom e Posição para Capa e Logo */}
                    {mediaMode !== 'add_gallery' && (
                      <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-stone-900">
                          <span>🔍 Zoom (Ampliação/Redução) & Posição</span>
                          <span className="font-mono text-[10px] text-stone-600">
                            {imageZoom.toFixed(2)}x | Y: {imageOffsetY}%
                          </span>
                        </div>

                        <div className="space-y-2.5 text-[11px]">
                          {/* Controle de Zoom (0.5x até 3.0x) */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-stone-700">Zoom ({imageZoom.toFixed(2)}x):</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageZoom(0.7);
                                    if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any, undefined, 0.7);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageZoom === 0.7 ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  0.7x (Reduzir)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageZoom(1.0);
                                    if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any, undefined, 1.0);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageZoom === 1.0 ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  1.0x (Original)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageZoom(1.5);
                                    if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any, undefined, 1.5);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageZoom === 1.5 ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  1.5x (Ampliar)
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="3.0"
                              step="0.05"
                              value={imageZoom}
                              onChange={(e) => setImageZoom(Number(e.target.value))}
                              onMouseUp={() => {
                                if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any);
                              }}
                              onTouchEnd={() => {
                                if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any);
                              }}
                              className="w-full h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-[#3B0B14]"
                            />
                          </div>

                          {/* Controle de Posição Vertical */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-stone-700">Posição Vertical (Y):</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageOffsetY(0);
                                    if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any, 0);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageOffsetY === 0 ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  Topo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageOffsetY(50);
                                    if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any, 50);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageOffsetY === 50 ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  Centro
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageOffsetY(100);
                                    if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any, 100);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageOffsetY === 100 ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  Base
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={imageOffsetY}
                              onChange={(e) => setImageOffsetY(Number(e.target.value))}
                              onMouseUp={() => {
                                if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any);
                              }}
                              onTouchEnd={() => {
                                if (selectedFileForCrop) handleAdminFileUpload({ target: { files: [selectedFileForCrop] } } as any);
                              }}
                              className="w-full h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-[#3B0B14]"
                            />
                          </div>

                          {mediaMode === 'update_logo' && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-stone-200">
                              <span className="font-bold text-stone-700">Enquadramento Logo:</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setImageFitMode('contain')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageFitMode === 'contain' ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  Contido
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setImageFitMode('cover')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${imageFitMode === 'cover' ? 'bg-[#3B0B14] text-[#C9A227]' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                                    }`}
                                >
                                  Preencher
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coluna da Direita: Seleção de Arquivo e Legenda */}
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-stone-800 mb-2">Enviar Nova Imagem</label>
                      <div className="flex flex-col gap-2">
                        <label className="px-4 py-3 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm">
                          {uploadingFile ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                          ) : (
                            <Upload className="w-4 h-4 text-[#C9A227]" />
                          )}
                          <span>
                            {uploadingFile
                              ? 'Processando...'
                              : mediaMode === 'add_gallery'
                                ? 'Selecionar Fotos (Múltiplas)'
                                : mediaUrlInput
                                  ? 'Substituir Arquivo de Imagem'
                                  : 'Selecionar Imagem do Computador'}
                          </span>
                          <input
                            type="file"
                            multiple={mediaMode === 'add_gallery'}
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => handleAdminFileUpload(e)}
                            disabled={uploadingFile}
                          />
                        </label>

                        <p className="text-[11px] text-stone-500 font-mono">
                          {mediaMode === 'add_gallery'
                            ? 'Selecione 1 ou mais fotos (PNG, JPG, WebP - Máx 15MB cada)'
                            : 'PNG, JPG ou WebP (Máx 15MB). O arquivo será otimizado e recortado automaticamente.'}
                        </p>
                      </div>
                    </div>

                    {mediaMode !== 'update_logo' && (
                      <div>
                        <label className="block font-bold text-stone-800 mb-1.5">Legenda / Título da Foto (Opcional)</label>
                        <input
                          type="text"
                          value={mediaTitleInput}
                          onChange={(e) => setMediaTitleInput(e.target.value)}
                          placeholder="Ex: Fachada principal da loja"
                          className="w-full px-3.5 py-2.5 border border-stone-300 rounded-2xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Edição apenas de Legenda */
                <div className="space-y-3">
                  <label className="block font-bold text-stone-800 mb-1">Legenda / Título da Foto</label>
                  <input
                    type="text"
                    value={mediaTitleInput}
                    onChange={(e) => setMediaTitleInput(e.target.value)}
                    placeholder="Ex: Fachada principal da loja"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-2xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  />
                </div>
              )}
            </div>

            {/* Rodapé Fixo (Garante que os botões Cancelar e Salvar fiquem SEMPRE VISÍVEIS) */}
            <div className="border-t border-stone-200 pt-3 flex justify-end gap-2 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || uploadingFile}
                className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {loading || uploadingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Save className="w-4 h-4 text-[#C9A227]" />
                )}
                <span>Salvar Mídia</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {/* MODAL: CADASTRO / EDIÇÃO DE VÍNCULO MAÇÔNICO */}
      {showMasonicUpsertModal && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveMasonicLink} className="bg-white border border-stone-300 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#3B0B14]" />
                <span>{data.masonic_link_detail ? 'Editar Vínculo Maçônico' : 'Cadastrar Vínculo Maçônico'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMasonicUpsertModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Nome da Loja Maçônica *</label>
                <input
                  type="text"
                  value={masonicLodgeInput}
                  onChange={(e) => setMasonicLodgeInput(e.target.value)}
                  placeholder="Ex: ARLS Luz e Verdade nº 123"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Potência / Obediência Maçônica</label>
                <input
                  type="text"
                  value={masonicPotencyInput}
                  onChange={(e) => setMasonicPotencyInput(e.target.value)}
                  placeholder="Ex: GOB, GLMMG, COMAB, etc."
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Tipo de Relação / Vínculo *</label>
                <select
                  value={masonicLinkTypeInput}
                  onChange={(e) => setMasonicLinkTypeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14] font-semibold"
                >
                  <option value="owner">Proprietário / Sócio Direto</option>
                  <option value="equity_partner">Sócio Cotista</option>
                  <option value="family_owner">Empresa Familiar</option>
                  <option value="sales_representative">Representante Comercial</option>
                  <option value="executive">Diretor / Executivo</option>
                  <option value="institutional_partner">Parceiro Institucional</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Status do Vínculo *</label>
                <select
                  value={masonicStatusInput}
                  onChange={(e) => setMasonicStatusInput(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50 text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14] font-bold"
                >
                  <option value="verified">✓ Verificado (Aprovado)</option>
                  <option value="pending">⏳ Aguardando Verificação</option>
                  <option value="rejected">✕ Rejeitado</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Observações / Justificativa Auditada (Opcional)</label>
                <textarea
                  rows={2}
                  value={masonicJustificationInput}
                  onChange={(e) => setMasonicJustificationInput(e.target.value)}
                  placeholder="Ex: Cadastro realizado pelo administrador referente a atestado de pertencimento apresentado."
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:ring-2 focus:ring-[#3B0B14]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowMasonicUpsertModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-[#C9A227]" />}
                <span>Salvar Vínculo</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {/* MODAL: VISUALIZAÇÃO INTEGRAL DO CONTRATO DE ADESÃO */}
      {showContractModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-stone-300 rounded-3xl p-6 max-w-4xl w-full space-y-4 shadow-2xl text-left my-8">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3B0B14]" />
                <span>Cópia do Contrato Eletrônico Assinado — {data.business.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-stone-50 border border-stone-300 rounded-2xl font-mono text-xs text-stone-900 leading-relaxed whitespace-pre-wrap max-h-[65vh] overflow-y-auto select-text">
              {data.contract?.rendered_text || 'Sem texto de contrato disponível.'}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-stone-200 flex-wrap gap-2">
              <div className="text-[11px] text-stone-500 font-serif truncate max-w-md">
                Hash SHA-256: <span className="text-stone-800 font-bold">{data.contract?.sha256_hash}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer border border-stone-300"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handlePrintContractPDF}
                  className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 text-[#C9A227]" /> Salvar em PDF / Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR EVENTO DA EMPRESA */}
      {showEventModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-stone-300 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left font-serif">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#3B0B14]" />
                <span>{eventMode === 'create' ? 'Cadastrar Novo Evento' : 'Editar Evento'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Título do Evento *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ex: Feira de Negócios / Lançamento Oficial"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Data e Hora de Início *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventStartsAt}
                    onChange={(e) => setEventStartsAt(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">Data e Hora de Término</label>
                  <input
                    type="datetime-local"
                    value={eventEndsAt}
                    onChange={(e) => setEventEndsAt(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Localização do Evento</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Ex: Centro de Convenções / Sede da Empresa"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Banner / Imagem de Capa do Evento (URL)</label>
                <input
                  type="url"
                  value={eventCoverUrl}
                  onChange={(e) => setEventCoverUrl(e.target.value)}
                  placeholder="https://exemplo.com/banner-evento.jpg"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                />
                {eventCoverUrl && (
                  <div className="mt-1.5 w-full h-24 rounded-lg overflow-hidden border border-stone-300 bg-stone-100">
                    <img src={eventCoverUrl} alt="Preview Banner" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Descrição do Evento</label>
                <textarea
                  rows={3}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Detalhes, programação e diferenciais do evento..."
                  className="w-full p-3.5 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Status de Publicação</label>
                <select
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none cursor-pointer"
                >
                  <option value="published">Publicado (Visível no perfil)</option>
                  <option value="draft">Rascunho / Oculto</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 text-[#C9A227]" />
                  <span>{loading ? 'Salvando...' : 'Salvar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR PUBLICAÇÃO & NOVIDADE (POST) */}
      {showPostModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-stone-300 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left font-serif">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-[#3B0B14]" />
                <span>{postMode === 'create' ? 'Criar Nova Publicação' : 'Editar Publicação'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Título da Publicação *</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Ex: Nova linha de produtos / Comunicado ao Mercado"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Resumo / Subtítulo</label>
                <input
                  type="text"
                  value={postSummary}
                  onChange={(e) => setPostSummary(e.target.value)}
                  placeholder="Breve resumo em poucas palavras..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Conteúdo Completo *</label>
                <textarea
                  rows={6}
                  required
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Escreva aqui o artigo, notícia ou novidade..."
                  className="w-full p-3.5 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">Status de Publicação</label>
                <select
                  value={postStatus}
                  onChange={(e) => setPostStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-serif text-xs text-stone-900 focus:ring-2 focus:ring-[#3B0B14] outline-none cursor-pointer"
                >
                  <option value="published">Publicado (Visível no perfil)</option>
                  <option value="draft">Rascunho / Oculto</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 text-[#C9A227]" />
                  <span>{loading ? 'Salvando...' : 'Salvar Publicação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
