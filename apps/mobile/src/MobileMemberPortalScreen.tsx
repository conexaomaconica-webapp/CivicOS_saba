import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createMobileGuideService,
  type MobileGuideSponsoredBusiness,
} from './guide-data';
import {
  loadRedeemedBenefits,
  type MobileBenefitRedemption,
} from './benefit-redemption';
import {
  changeMobileMemberPassword,
  clearMobileFavoritesRemote,
  fetchMobileMemberOverview,
  requestMobilePasswordReset,
  updateMobileMemberProfile,
  type MobileAuthSessionTokens,
  type MobileMemberOverview,
  type MobileMemberUser,
} from './mobile-member-client';

export type MemberPortalTab = 'visao-geral' | 'favoritos' | 'beneficios' | 'indicacoes' | 'perfil' | 'senha';

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

type MobileMemberPortalScreenProps = {
  memberUser: MobileMemberUser;
  session: MobileAuthSessionTokens | null;
  favorites: string[];
  initialTab?: MemberPortalTab;
  onBack: () => void;
  onLogout: () => void;
  onUpdateMemberUser: (user: MobileMemberUser) => void;
  onSyncFavoritesFromAccount: (slugs: string[]) => void;
  onToggleFavorite: (slug: string, name?: string) => void;
  onClearFavorites: () => void;
  onSelectBusiness: (slug: string) => void;
  onOpenVoucherModal: (voucher: MobileBenefitRedemption) => void;
  onDeleteAccount: () => Promise<boolean>;
  onToast: (msg: string) => void;
  onExploreCatalog: () => void;
};

export function MobileMemberPortalScreen({
  memberUser,
  session,
  favorites,
  initialTab = 'visao-geral',
  onBack,
  onLogout,
  onUpdateMemberUser,
  onSyncFavoritesFromAccount,
  onToggleFavorite,
  onClearFavorites,
  onSelectBusiness,
  onOpenVoucherModal,
  onDeleteAccount,
  onToast,
  onExploreCatalog,
}: MobileMemberPortalScreenProps) {
  const [activeTab, setActiveTab] = useState<MemberPortalTab>(initialTab);
  const [overview, setOverview] = useState<MobileMemberOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [favBusinesses, setFavBusinesses] = useState<MobileGuideSponsoredBusiness[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState(memberUser.name || '');
  const [profilePhone, setProfilePhone] = useState(memberUser.phone || '');
  const [profileCity, setProfileCity] = useState(memberUser.city || '');
  const [profileState, setProfileState] = useState((memberUser.state || 'BA').toUpperCase());
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  // Account deletion state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const guideServiceRef = useRef(createMobileGuideService());

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoadingOverview(true);

    fetchMobileMemberOverview(session)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.overview) {
          setOverview(res.overview);
          setProfileName(res.overview.user.name || memberUser.name || '');
          setProfilePhone(res.overview.user.phone || '');
          setProfileCity(res.overview.user.city || '');
          setProfileState((res.overview.user.state || 'BA').toUpperCase());
          onUpdateMemberUser(res.overview.user);
          if (res.overview.favoriteSlugs.length > 0) {
            onSyncFavoritesFromAccount(res.overview.favoriteSlugs);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOverview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (activeTab !== 'favoritos') return;
    if (favorites.length === 0) {
      setFavBusinesses([]);
      setLoadingFavs(false);
      return;
    }

    let cancelled = false;
    setLoadingFavs(true);

    (async () => {
      try {
        const matched = await guideServiceRef.current.loadBusinessesBySlugs(favorites);
        const bySlug = new Map<string, MobileGuideSponsoredBusiness>();
        matched.forEach((b) => {
          if (b.slug) bySlug.set(b.slug.toLowerCase(), b);
        });

        const missing = favorites.filter((s) => !bySlug.has(s.toLowerCase()));
        if (missing.length > 0) {
          const detailResults = await Promise.allSettled(
            missing.map((slug) => guideServiceRef.current.loadBusinessDetail(slug)),
          );
          detailResults.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              const d = r.value;
              bySlug.set(d.business_slug.toLowerCase(), {
                id: d.business_id,
                name: d.business_name,
                slug: d.business_slug,
                city: d.city,
                state: d.state,
                logo_url: d.logo_url,
                logo_background_color: d.logo_background_color ?? null,
                cover_url: d.cover_url ?? null,
                description: d.description,
                category_name: d.primary_category_name,
                category_slug: null,
                plan_tier: d.effective_plan_code,
                is_featured: false,
                is_pedra_fundamental: d.is_pedra_fundamental,
                address: d.address,
              });
            }
          });
        }

        if (!cancelled) {
          const ordered = favorites
            .map((slug) => bySlug.get(slug.toLowerCase()))
            .filter((b): b is MobileGuideSponsoredBusiness => Boolean(b));
          setFavBusinesses(ordered);
        }
      } finally {
        if (!cancelled) setLoadingFavs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, favorites]);

  const localVouchers = loadRedeemedBenefits();
  const remoteRedemptions = overview?.redemptions || [];
  const totalBenefitsCount = Math.max(overview?.stats?.benefitsCount ?? 0, localVouchers.length);
  const firstName = (memberUser.name || 'Membro').trim().split(/\s+/)[0] || 'Membro';
  const profileIncomplete = !profileName.trim() || !profileCity.trim() || !profileState.trim() || !profilePhone.trim();

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!session) {
      setProfileFeedback({ ok: false, text: 'Sessão expirada. Entre novamente para salvar seu perfil.' });
      return;
    }

    setSavingProfile(true);
    const res = await updateMobileMemberProfile(session, {
      name: profileName.trim(),
      phone: profilePhone.trim(),
      city: profileCity.trim(),
      state: profileState.trim().toUpperCase(),
    });
    setSavingProfile(false);

    if (res.success && res.user) {
      onUpdateMemberUser(res.user);
      setProfileFeedback({ ok: true, text: 'Perfil atualizado com sucesso.' });
      onToast('✓ Perfil atualizado com sucesso!');
    } else {
      setProfileFeedback({ ok: false, text: res.error || 'Não foi possível atualizar seu perfil.' });
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!session) {
      setPasswordFeedback({ ok: false, text: 'Sessão expirada. Entre novamente para alterar a senha.' });
      return;
    }
    if (!currentPassword) {
      setPasswordFeedback({ ok: false, text: 'Informe sua senha atual.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordFeedback({ ok: false, text: 'A nova senha deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ ok: false, text: 'A confirmação não confere com a nova senha.' });
      return;
    }

    setSavingPassword(true);
    const res = await changeMobileMemberPassword(session, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setSavingPassword(false);

    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ ok: true, text: 'Senha alterada com sucesso.' });
      onToast('✓ Senha alterada com sucesso!');
    } else {
      setPasswordFeedback({ ok: false, text: res.error || 'Não foi possível alterar a senha.' });
    }
  };

  const handleSendResetEmail = async () => {
    if (!memberUser.email) return;
    setSendingReset(true);
    const res = await requestMobilePasswordReset(memberUser.email);
    setSendingReset(false);
    setPasswordFeedback({
      ok: res.success,
      text: res.success
        ? (res.message || 'Enviamos um link de redefinição para o seu e-mail.')
        : (res.error || 'Não foi possível enviar o link de recuperação.'),
    });
  };

  const handleClearAllFavorites = async () => {
    onClearFavorites();
    if (session) {
      await clearMobileFavoritesRemote(session);
    }
    onToast('🤍 Lista de favoritos limpa.');
  };

  const handleConfirmDeleteAccount = async () => {
    setDeletingAccount(true);
    const ok = await onDeleteAccount();
    setDeletingAccount(false);
    if (ok) {
      onBack();
    }
  };

  const navItems: { id: MemberPortalTab; label: string; icon: string }[] = [
    { id: 'visao-geral', label: 'Visão geral', icon: '🏠' },
    { id: 'favoritos', label: `Favoritos (${favorites.length})`, icon: '❤️' },
    { id: 'beneficios', label: 'Benefícios', icon: '🎁' },
    { id: 'indicacoes', label: 'Indicações', icon: '🤝' },
    { id: 'perfil', label: 'Meu perfil', icon: '👤' },
    { id: 'senha', label: 'Senha e conta', icon: '🔑' },
  ];

  return (
    <div className="mobile-member-portal">
      {/* Top Bar */}
      <div className="mobile-member-topbar">
        <button type="button" className="mobile-member-back-btn" onClick={onBack}>
          ← Voltar ao Menu
        </button>
        <button type="button" className="mobile-member-logout-btn" onClick={onLogout}>
          Sair
        </button>
      </div>

      {/* Member Banner Header */}
      <div className="mobile-member-header-card">
        <div className="mobile-member-avatar-circle">
          {firstName.charAt(0).toUpperCase()}
        </div>
        <div className="mobile-member-header-text">
          <span className="mobile-member-eyebrow">Área do Membro</span>
          <h1 className="mobile-member-greeting">Olá, {firstName}</h1>
          <span className="mobile-member-email">{memberUser.email}</span>
        </div>
      </div>

      {/* Scrollable Tabs matching Web MemberShell */}
      <div className="mobile-member-tabs" role="tablist" aria-label="Navegação da Área do Membro">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`mobile-member-tab-pill ${activeTab === tab.id ? 'is-active' : ''}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="mobile-member-content">
        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'visao-geral' && (
          <div className="mobile-member-stack">
            {profileIncomplete && (
              <button
                type="button"
                className="mobile-member-incomplete-banner"
                onClick={() => setActiveTab('perfil')}
              >
                <span>👤</span>
                <div>
                  <strong>Complete seu perfil</strong>
                  <span>Adicione telefone, cidade e UF para manter seus dados atualizados.</span>
                </div>
              </button>
            )}

            <div className="mobile-member-stats-grid">
              <div className="mobile-member-stat-card">
                <span className="mobile-member-stat-icon">❤️</span>
                <strong>{favorites.length}</strong>
                <small>Empresas favoritas</small>
              </div>
              <div className="mobile-member-stat-card">
                <span className="mobile-member-stat-icon">🎁</span>
                <strong>{totalBenefitsCount}</strong>
                <small>Benefícios resgatados</small>
              </div>
              <div className="mobile-member-stat-card">
                <span className="mobile-member-stat-icon">🤝</span>
                <strong>{overview?.stats?.referralsCount ?? 0}</strong>
                <small>Indicações na rede</small>
              </div>
            </div>

            <div className="mobile-member-shortcuts-grid">
              <button
                type="button"
                className="mobile-member-shortcut-card"
                onClick={() => setActiveTab('favoritos')}
              >
                <strong>Meus favoritos</strong>
                <span>Empresas que você salvou no Guia.</span>
              </button>
              <button
                type="button"
                className="mobile-member-shortcut-card"
                onClick={() => setActiveTab('beneficios')}
              >
                <strong>Meus benefícios</strong>
                <span>Consulte códigos, validade e histórico.</span>
              </button>
              <button
                type="button"
                className="mobile-member-shortcut-card"
                onClick={() => setActiveTab('indicacoes')}
              >
                <strong>Minhas indicações</strong>
                <span>Empresas indicadas e negócios confirmados.</span>
              </button>
              <button
                type="button"
                className="mobile-member-shortcut-card"
                onClick={() => setActiveTab('perfil')}
              >
                <strong>Meu perfil</strong>
                <span>Gerencie seus dados pessoais.</span>
              </button>
              <button
                type="button"
                className="mobile-member-shortcut-card"
                onClick={() => setActiveTab('senha')}
              >
                <strong>Senha e segurança</strong>
                <span>Altere a senha ou exclua sua conta.</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MEUS FAVORITOS */}
        {activeTab === 'favoritos' && (
          <div className="mobile-member-stack">
            <div className="mobile-member-section-head">
              <div>
                <h2>Meus favoritos</h2>
                <p>Empresas que você salvou no Guia em qualquer aparelho.</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="mobile-member-mini-btn" onClick={onExploreCatalog}>
                  Explorar
                </button>
                {favorites.length > 0 && (
                  <button
                    type="button"
                    className="mobile-member-mini-btn mobile-member-mini-btn--danger"
                    onClick={() => void handleClearAllFavorites()}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {loadingFavs ? (
              <div className="mobile-member-empty-box">Carregando suas empresas favoritas...</div>
            ) : favorites.length === 0 ? (
              <div className="mobile-member-empty-box">
                Você ainda não favoritou nenhuma empresa. No Guia, toque no coração para salvá-la aqui.
              </div>
            ) : favBusinesses.length === 0 ? (
              <div className="mobile-member-empty-box">
                Não foi possível carregar os detalhes das empresas favoritas neste momento.
              </div>
            ) : (
              <div className="mobile-member-fav-list">
                {favBusinesses.map((biz) => (
                  <article key={biz.slug} className="mobile-member-fav-card">
                    <button
                      type="button"
                      className="mobile-member-fav-main"
                      onClick={() => onSelectBusiness(biz.slug)}
                    >
                      <div
                        className="mobile-member-fav-logo"
                        style={biz.logo_background_color ? { background: biz.logo_background_color } : undefined}
                      >
                        {biz.logo_url ? (
                          <img src={biz.logo_url} alt={biz.name} />
                        ) : (
                          <span>{biz.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="mobile-member-fav-info">
                        <strong>{biz.name}</strong>
                        <span>
                          {[biz.category_name, biz.city, biz.state].filter(Boolean).join(' • ') || 'Empresa Parceira'}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="mobile-member-fav-remove"
                      onClick={() => onToggleFavorite(biz.slug, biz.name)}
                      aria-label={`Remover ${biz.name} dos favoritos`}
                      title="Remover dos favoritos"
                    >
                      ❤️
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MEUS BENEFÍCIOS */}
        {activeTab === 'beneficios' && (
          <div className="mobile-member-stack">
            <div className="mobile-member-section-head">
              <div>
                <h2>Meus benefícios</h2>
                <p>Códigos resgatados e situação de utilização.</p>
              </div>
            </div>

            {loadingOverview ? (
              <div className="mobile-member-empty-box">Carregando seus benefícios...</div>
            ) : remoteRedemptions.length === 0 && localVouchers.length === 0 ? (
              <div className="mobile-member-empty-box">Você ainda não resgatou nenhum benefício.</div>
            ) : (
              <div className="mobile-member-benefits-list">
                {remoteRedemptions.map((item) => (
                  <article key={item.id} className="mobile-member-benefit-card">
                    <strong>{item.benefit_snapshot?.title || 'Benefício resgatado'}</strong>
                    <small>Resgatado em {new Date(item.redeemed_at).toLocaleString('pt-BR')}</small>
                    <div className="mobile-member-code-pill">{item.public_code}</div>
                    <span className="mobile-member-benefit-status">
                      Status: {item.status === 'redeemed' ? 'Disponível' : item.status === 'used' ? 'Utilizado' : item.status}
                    </span>
                  </article>
                ))}

                {localVouchers
                  .filter((lv) => !remoteRedemptions.some((rr) => rr.public_code === lv.code))
                  .map((v) => (
                    <article key={v.id} className="mobile-member-benefit-card">
                      <strong>{v.title}</strong>
                      <small>{v.businessName}</small>
                      <div className="mobile-member-code-pill">{v.code}</div>
                      <button
                        type="button"
                        className="mobile-member-mini-btn"
                        onClick={() => onOpenVoucherModal(v)}
                      >
                        Ver comprovante
                      </button>
                    </article>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MINHAS INDICAÇÕES */}
        {activeTab === 'indicacoes' && (
          <div className="mobile-member-stack">
            <div className="mobile-member-section-head">
              <div>
                <h2>Minhas indicações</h2>
                <p>Empresas que você indicou e o que aconteceu depois.</p>
              </div>
            </div>

            {loadingOverview ? (
              <div className="mobile-member-empty-box">Carregando suas indicações...</div>
            ) : (
              <>
                <div className="mobile-member-stats-grid">
                  <div className="mobile-member-stat-card">
                    <strong>{overview?.referralsSummary?.total ?? 0}</strong>
                    <small>Pessoas que você indicou</small>
                  </div>
                  <div className="mobile-member-stat-card">
                    <strong>{overview?.referralsSummary?.connections ?? 0}</strong>
                    <small>Negócios confirmados</small>
                  </div>
                  <div className="mobile-member-stat-card">
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.92rem' }}>
                      {overview?.referralsSummary?.code || '—'}
                    </strong>
                    <small>Código de indicação</small>
                  </div>
                </div>

                {!overview?.referralsSummary?.by_business?.length ? (
                  <div className="mobile-member-empty-box">
                    Você ainda não tem indicações registradas. Compartilhe o link de uma empresa no Guia pelo botão &quot;Indicar&quot; para acompanhar aqui.
                  </div>
                ) : (
                  <div className="mobile-member-referrals-list">
                    {overview.referralsSummary.by_business.map((row) => (
                      <article key={row.business_slug || row.business_name} className="mobile-member-ref-card">
                        {row.business_slug ? (
                          <button
                            type="button"
                            className="mobile-member-ref-link"
                            onClick={() => onSelectBusiness(row.business_slug!)}
                          >
                            {row.business_name} →
                          </button>
                        ) : (
                          <strong>{row.business_name}</strong>
                        )}
                        <div className="mobile-member-ref-metrics">
                          <span><b>{row.indications}</b> indicação(ões)</span>
                          <span><b>{row.contacts}</b> contato(s)</span>
                          <span><b>{row.benefits}</b> benefício(s)</span>
                          <span><b>{row.connections}</b> negócio(s)</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 5: MEU PERFIL */}
        {activeTab === 'perfil' && (
          <form onSubmit={(e) => void handleSaveProfile(e)} className="mobile-member-form-card">
            <h2 className="mobile-member-form-title">Dados pessoais</h2>

            <div className="mobile-rsvp-field">
              <label htmlFor="member-profile-name">Nome completo</label>
              <input
                id="member-profile-name"
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={savingProfile}
              />
            </div>

            <div className="mobile-rsvp-field">
              <label htmlFor="member-profile-email">E-mail</label>
              <input
                id="member-profile-email"
                type="email"
                value={memberUser.email}
                disabled
                style={{ background: '#f5f5f4', color: '#78716c' }}
              />
              <small style={{ fontSize: '0.68rem', color: '#78716c' }}>
                O e-mail é o seu acesso. Para trocá-lo, fale com o suporte.
              </small>
            </div>

            <div className="mobile-rsvp-field">
              <label htmlFor="member-profile-phone">Telefone</label>
              <input
                id="member-profile-phone"
                type="tel"
                placeholder="(75) 99999-9999"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                disabled={savingProfile}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 88px', gap: 10 }}>
              <div className="mobile-rsvp-field">
                <label htmlFor="member-profile-city">Cidade</label>
                <input
                  id="member-profile-city"
                  type="text"
                  required
                  placeholder="Feira de Santana"
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <div className="mobile-rsvp-field">
                <label htmlFor="member-profile-state">UF</label>
                <select
                  id="member-profile-state"
                  value={profileState}
                  onChange={(e) => setProfileState(e.target.value)}
                  disabled={savingProfile}
                >
                  {BR_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {profileFeedback && (
              <div className={`mobile-member-feedback ${profileFeedback.ok ? 'is-ok' : 'is-err'}`}>
                {profileFeedback.text}
              </div>
            )}

            <button type="submit" disabled={savingProfile} className="mobile-member-save-btn">
              {savingProfile ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </form>
        )}

        {/* TAB 6: SENHA E CONTA */}
        {activeTab === 'senha' && (
          <div className="mobile-member-stack">
            <form onSubmit={(e) => void handleChangePassword(e)} className="mobile-member-form-card">
              <h2 className="mobile-member-form-title">🔑 Alterar senha</h2>

              <div className="mobile-rsvp-field">
                <label htmlFor="member-current-password">Senha atual</label>
                <input
                  id="member-current-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={savingPassword}
                />
              </div>

              <div className="mobile-rsvp-field">
                <label htmlFor="member-new-password">Nova senha</label>
                <input
                  id="member-new-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
                  disabled={savingPassword}
                />
              </div>

              <div className="mobile-rsvp-field">
                <label htmlFor="member-confirm-password">Confirmar nova senha</label>
                <input
                  id="member-confirm-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={savingPassword}
                />
              </div>

              <label className="mobile-member-checkbox-row">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                />
                <span>Mostrar senhas digitadas</span>
              </label>

              {passwordFeedback && (
                <div className={`mobile-member-feedback ${passwordFeedback.ok ? 'is-ok' : 'is-err'}`}>
                  {passwordFeedback.text}
                </div>
              )}

              <button type="submit" disabled={savingPassword} className="mobile-member-save-btn">
                {savingPassword ? 'Alterando senha...' : 'Salvar nova senha'}
              </button>

              <button
                type="button"
                disabled={sendingReset}
                className="mobile-member-forgot-btn"
                onClick={() => void handleSendResetEmail()}
              >
                {sendingReset ? 'Enviando link...' : 'Esqueceu a senha atual? Receba um link por e-mail'}
              </button>
            </form>

            {/* Zona de Exclusão Definitiva */}
            <div className="mobile-member-danger-card">
              <h3>Exclusão permanente da conta</h3>
              <p>
                Ao excluir sua conta, seus dados e suas credenciais de login são removidos definitivamente
                do sistema e não será mais possível entrar com o mesmo e-mail e senha.
              </p>

              {!confirmDeleteOpen ? (
                <button
                  type="button"
                  className="mobile-member-danger-btn"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Excluir minha conta definitivamente
                </button>
              ) : (
                <div className="mobile-member-danger-confirm">
                  <strong>Confirma a exclusão irreversível da sua conta?</strong>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      disabled={deletingAccount}
                      className="mobile-member-danger-confirm-btn"
                      onClick={() => void handleConfirmDeleteAccount()}
                    >
                      {deletingAccount ? 'Excluindo...' : 'Sim, excluir conta'}
                    </button>
                    <button
                      type="button"
                      disabled={deletingAccount}
                      className="mobile-member-danger-cancel-btn"
                      onClick={() => setConfirmDeleteOpen(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
