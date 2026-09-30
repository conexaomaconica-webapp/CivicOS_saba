'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Key,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  X,
  Building2,
} from 'lucide-react';
import {
  ALL_ADMIN_MODULES,
  ROLE_PRESET_MODULES,
  type AdminUserListItem,
} from '@/types/admin-users';
import {
  createAdminUserAction,
  updateAdminUserPermissionsAction,
  toggleAdminUserStatusAction,
} from '@/lib/admin/admin-users-service';

interface SettingsUsersClientProps {
  initialUsers: AdminUserListItem[];
  currentUserId: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  master: { label: 'Administrador Master', color: 'bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40', description: 'Acesso total e irrestrito' },
  admin: { label: 'Administrador Geral', color: 'bg-[#3B0B14] text-white border border-stone-700', description: 'Acesso administrativo completo' },
  socio_admin: { label: 'Sócio / Co-Administrador', color: 'bg-amber-900/20 text-amber-900 border border-amber-300', description: 'Gestão de negócios e aprovações' },
  finance: { label: 'Gestor Financeiro', color: 'bg-emerald-100 text-emerald-900 border border-emerald-300', description: 'Finanças, faturas e assinaturas' },
  moderator: { label: 'Moderador de Conteúdo', color: 'bg-blue-100 text-blue-900 border border-blue-300', description: 'Dossiê, aprovações e empresas' },
  editor: { label: 'Operador de Conteúdo / Guia', color: 'bg-stone-100 text-stone-800 border border-stone-300', description: 'Lojas, categorias e eventos' },
};

export default function SettingsUsersClient({ initialUsers, currentUserId }: SettingsUsersClientProps) {
  const [users, setUsers] = useState<AdminUserListItem[]>(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('admin');
  const [selectedModules, setSelectedModules] = useState<string[]>(ROLE_PRESET_MODULES.admin || []);
  const [submitting, setSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('admin');
    setSelectedModules(ROLE_PRESET_MODULES.admin || ALL_ADMIN_MODULES.map((m) => m.id));
    setActionMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (u: AdminUserListItem) => {
    setModalMode('edit');
    setSelectedUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setSelectedModules(u.allowed_modules || ROLE_PRESET_MODULES[u.role] || ['dashboard']);
    setActionMsg(null);
    setModalOpen(true);
  };

  const handleRolePresetChange = (newRole: string) => {
    setRole(newRole);
    const preset = ROLE_PRESET_MODULES[newRole];
    if (preset) {
      setSelectedModules(preset);
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const selectAllModules = () => {
    setSelectedModules(ALL_ADMIN_MODULES.map((m) => m.id));
  };

  const clearAllModules = () => {
    setSelectedModules(['dashboard']);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionMsg(null);

    try {
      if (modalMode === 'create') {
        const res = await createAdminUserAction({
          name,
          email,
          password,
          role,
          allowedModules: selectedModules,
        });

        if (!res.success) {
          setActionMsg({ type: 'error', text: res.error || 'Falha ao criar usuário.' });
          setSubmitting(false);
          return;
        }

        const newUser: AdminUserListItem = {
          id: res.userId || Math.random().toString(),
          name,
          email,
          role,
          status: 'active',
          tenant_id: '',
          allowed_modules: selectedModules,
          created_at: new Date().toISOString(),
        };
        setUsers([newUser, ...users]);
        setModalOpen(false);
        setActionMsg({ type: 'success', text: `Usuário ${name} criado com sucesso!` });
      } else if (modalMode === 'edit' && selectedUser) {
        const res = await updateAdminUserPermissionsAction({
          userId: selectedUser.id,
          name,
          role,
          allowedModules: selectedModules,
        });

        if (!res.success) {
          setActionMsg({ type: 'error', text: res.error || 'Falha ao atualizar permissões.' });
          setSubmitting(false);
          return;
        }

        setUsers(
          users.map((u) =>
            u.id === selectedUser.id
              ? { ...u, name, role, allowed_modules: selectedModules }
              : u
          )
        );
        setModalOpen(false);
        setActionMsg({ type: 'success', text: `Permissões de ${name} atualizadas!` });
      }
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erro na operação.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userToToggle: AdminUserListItem) => {
    const nextStatus = userToToggle.status === 'active' ? 'suspended' : 'active';
    const confirmText = nextStatus === 'suspended'
      ? `Deseja desativar o acesso de ${userToToggle.name}?`
      : `Deseja reativar o acesso de ${userToToggle.name}?`;

    if (!window.confirm(confirmText)) return;

    const res = await toggleAdminUserStatusAction(userToToggle.id, nextStatus);
    if (res.success) {
      setUsers(
        users.map((u) => (u.id === userToToggle.id ? { ...u, status: nextStatus } : u))
      );
      setActionMsg({
        type: 'success',
        text: `Status de ${userToToggle.name} alterado para ${nextStatus === 'active' ? 'Ativo' : 'Inativo'}.`,
      });
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Erro ao alterar status.' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* NAVEGAÇÃO DE RETORNO À DASHBOARD */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#3B0B14] transition-colors bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-2xs hover:border-[#3B0B14]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#3B0B14]" />
          <span>Voltar para a Dashboard Principal (/admin)</span>
        </Link>
      </div>

      {/* 1. TOPO: TÍTULO & AÇÃO PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#C9A227]" />
              Conexão Maçônica • Tenant Ativo
            </span>
            <span className="text-xs text-stone-500 font-mono">Gestão de Equipe & Permissões</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-1">
            Usuários & Permissões da Plataforma
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Cadastre os membros da equipe vinculados a este tenant e defina exatamente quais módulos cada usuário pode visualizar e operar.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/40 shadow-xs transition-all flex items-center gap-2 cursor-pointer w-fit"
        >
          <UserPlus className="w-4 h-4 text-[#C9A227]" />
          <span>+ Criar Novo Usuário no Tenant</span>
        </button>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-700 shrink-0" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* 2. LISTA DE USUÁRIOS */}
      <section className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3B0B14]" />
            <h2 className="font-serif font-bold text-sm text-stone-900">
              Membros da Equipe ({users.length})
            </h2>
          </div>
          <span className="text-[11px] text-stone-500 font-medium">Controle granular ativo</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Função / Perfil</th>
                <th className="py-3 px-4">Módulos com Acesso</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {users.map((u) => {
                const roleConfig = ROLE_LABELS[u.role] || {
                  label: u.role,
                  color: 'bg-stone-100 text-stone-700 border border-stone-300',
                  description: 'Perfil personalizado',
                };
                const isCurrent = u.id === currentUserId;
                const allowedCount = u.allowed_modules?.length || 0;
                const totalCount = ALL_ADMIN_MODULES.length;

                return (
                  <tr key={u.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {u.name ? u.name.slice(0, 2) : u.email.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-serif font-bold text-stone-900 text-sm flex items-center gap-1.5">
                            <span>{u.name || 'Sem nome'}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-[#3B0B14]">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${roleConfig.color}`}>
                        {roleConfig.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-800 text-[11px]">
                            {allowedCount === totalCount ? 'Acesso Total (Todos os Módulos)' : `${allowedCount} de ${totalCount} módulos liberados`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(u.allowed_modules || []).slice(0, 4).map((modId) => {
                            const mod = ALL_ADMIN_MODULES.find((m) => m.id === modId);
                            return (
                              <span
                                key={modId}
                                className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] border border-stone-200"
                              >
                                {mod?.name || modId}
                              </span>
                            );
                          })}
                          {(u.allowed_modules?.length || 0) > 4 && (
                            <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 text-[10px] font-bold">
                              +{(u.allowed_modules?.length || 0) - 4} mais
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {u.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-900 font-bold text-[10px] uppercase">
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-stone-300"
                        >
                          <Edit2 className="w-3 h-3 text-[#3B0B14]" />
                          <span>Permissões</span>
                        </button>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              u.status === 'active'
                                ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {u.status === 'active' ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. MODAL: CRIAR OU EDITAR USUÁRIO & PERMISSÕES */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-300 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3B0B14]" />
                  {modalMode === 'create' ? 'Cadastrar Novo Usuário da Equipe' : `Editar Permissões: ${selectedUser?.name}`}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Defina o papel funcional e selecione os módulos visíveis na plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Tenant Vinculado */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C9A227]" />
                  <span className="font-bold text-stone-900">Tenant de Origem:</span>
                  <span className="text-stone-600">Conexão Maçônica</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#3B0B14] text-[#C9A227] px-2 py-0.5 rounded-full">
                  Automático da Sessão
                </span>
              </div>

              {/* Dados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">E-mail Profissional</label>
                  <input
                    type="email"
                    required
                    disabled={modalMode === 'edit'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@conexaomaconica.com.br"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-[#3B0B14] disabled:bg-stone-100 disabled:text-stone-500"
                  />
                </div>
              </div>

              {/* Senha temporária (apenas no modo de criação) */}
              {modalMode === 'create' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                    <span>Senha Temporária de Acesso</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#3B0B14] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-[#3B0B14]"
                    />
                    <Key className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-stone-500">
                    O usuário utilizará esta senha para o primeiro login e será solicitado a definir uma nova.
                  </p>
                </div>
              )}

              {/* Seleção do Papel / Preset */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="text-xs font-bold text-stone-700 block">
                  Perfil de Acesso & Modelo de Permissão
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'admin', label: 'Administrador Geral', desc: 'Acesso total a todos os módulos' },
                    { id: 'finance', label: 'Gestor Financeiro', desc: 'Faturas, assinaturas e pagamentos' },
                    { id: 'moderator', label: 'Moderador de Cadastros', desc: 'Dossiê, aprovações e empresas' },
                    { id: 'editor', label: 'Operador de Conteúdo', desc: 'Lojas, categorias e eventos' },
                    { id: 'socio_admin', label: 'Sócio Co-Admin', desc: 'Gestão executiva e negócios' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleRolePresetChange(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        role === p.id
                          ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]/50 shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-800'
                      }`}
                    >
                      <strong className="text-xs font-bold block">{p.label}</strong>
                      <span className="text-[10px] opacity-80 block mt-0.5 leading-tight">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Módulos Granulares ("Definir o que cada um pode ver") */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-stone-900 block">
                      Módulos Permitidos na Plataforma
                    </label>
                    <span className="text-[11px] text-stone-500">
                      Marque ou desmarque os módulos que este usuário poderá visualizar no menu lateral.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllModules}
                      className="text-[10px] font-bold text-[#3B0B14] hover:underline cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={clearAllModules}
                      className="text-[10px] font-bold text-stone-500 hover:underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border border-stone-200 rounded-xl bg-stone-50/50">
                  {ALL_ADMIN_MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-white border-amber-400/80 shadow-2xs'
                            : 'bg-transparent border-transparent hover:bg-stone-100 text-stone-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModule(mod.id)}
                          className="mt-0.5 rounded text-[#3B0B14] focus:ring-[#3B0B14] accent-[#3B0B14]"
                        />
                        <div className="min-w-0">
                          <strong className={`block text-xs ${isChecked ? 'text-stone-900 font-bold' : 'text-stone-600 font-medium'}`}>
                            {mod.name}
                          </strong>
                          <span className="text-[10px] text-stone-500 block leading-tight">
                            {mod.description}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedModules.length === 0}
                  className="px-5 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-extrabold text-xs rounded-xl border border-[#C9A227]/40 shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                  )}
                  <span>{modalMode === 'create' ? 'Criar Usuário' : 'Salvar Permissões'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
