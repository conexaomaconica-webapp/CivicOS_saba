'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/types/database.types';
import {
  APPROVED_FONT_STACKS,
  brandCssVarsToStyle,
  brandToCssVars,
  contrastRatio,
  generatePrimaryScale,
  oklchToHex,
  type ApprovedFontToken,
  type BrandRadiusPreset,
} from '@/lib/tenant/brand-tokens';

// ---------------------------------------------------------------------------
// Brand Studio (ADM-021) — white-label identity for the tenant
// ---------------------------------------------------------------------------

const HEX_RE = /^#[0-9a-f]{6}$/i;
const FONT_OPTIONS = [
  { label: 'Padrão da plataforma', value: '' },
  { label: 'Sans-serif da plataforma', value: 'platform-sans' },
  { label: 'Editorial com serifa', value: 'editorial-serif' },
  { label: 'Sans-serif humanista', value: 'humanist-sans' },
] as const;

function isSafeAssetUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.length > 0 &&
      parsed.username.length === 0 &&
      parsed.password.length === 0
    );
  } catch {
    return false;
  }
}

function isApprovedFontToken(value: string): value is ApprovedFontToken {
  return Object.hasOwn(APPROVED_FONT_STACKS, value);
}

const RADIUS_PRESETS: { id: BrandRadiusPreset; label: string; radius: string }[] = [
  { id: 'sm', label: 'Discreto', radius: '4px' },
  { id: 'md', label: 'Equilibrado', radius: '8px' },
  { id: 'lg', label: 'Suave', radius: '12px' },
  { id: 'xl', label: 'Arredondado', radius: '20px' },
];

const COLOR_MODES = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
  { id: 'auto', label: 'Automático' },
] as const;

const DENSITIES = [
  { id: 'comfortable', label: 'Confortável' },
  { id: 'compact', label: 'Compacto' },
] as const;

interface BrandForm {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  radius: BrandRadiusPreset;
  density: 'comfortable' | 'compact';
  colorMode: 'light' | 'dark' | 'auto';
}

const EMPTY_FORM: BrandForm = {
  appName: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '',
  accentColor: '',
  fontFamily: '',
  radius: 'md',
  density: 'comfortable',
  colorMode: 'light',
};

type TenantRow = Pick<
  Database['public']['Tables']['tenants']['Row'],
  'id' | 'name' | 'slug' | 'settings'
>;

function normalizeBranding(form: BrandForm): Record<string, unknown> | null {
  const branding: Record<string, unknown> = {};

  if (form.appName.trim()) branding.appName = form.appName.trim().slice(0, 64);
  if (form.logoUrl.trim() && isSafeAssetUrl(form.logoUrl.trim())) {
    branding.logoUrl = form.logoUrl.trim().slice(0, 512);
  }
  if (form.faviconUrl.trim() && isSafeAssetUrl(form.faviconUrl.trim())) {
    branding.faviconUrl = form.faviconUrl.trim().slice(0, 512);
  }
  if (form.primaryColor && HEX_RE.test(form.primaryColor)) {
    branding.primaryColor = form.primaryColor.toLowerCase();
  }
  if (form.accentColor && HEX_RE.test(form.accentColor)) {
    branding.accentColor = form.accentColor.toLowerCase();
  }
  if (isApprovedFontToken(form.fontFamily)) branding.fontFamily = form.fontFamily;

  branding.radius = form.radius;
  branding.density = form.density;
  branding.colorMode = form.colorMode;

  return Object.keys(branding).length > 0 ? branding : null;
}

export default function BrandStudioPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY_FORM);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const appliedVarsRef = useRef<string[]>([]);
  const previousThemeRef = useRef<string | null>(null);
  const previousDarkModeRef = useRef<string | null>(null);

  const setField = useCallback(<K extends keyof BrandForm>(key: K, value: BrandForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  // -------------------------------------------------------------------------
  // Load tenant + current branding
  // -------------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile || !['master', 'socio_admin'].includes(profile.role)) {
        router.push('/');
        return;
      }

      const tenantId = profile.tenant_id;
      if (!tenantId) {
        setErrorMsg('Nenhum tenant autorizado foi associado a este administrador.');
        setLoading(false);
        return;
      }

      const { data: dbTenant, error } = await supabase
        .from('tenants')
        .select('id, name, slug, settings')
        .eq('id', tenantId)
        .single();

      if (error || !dbTenant) {
        setErrorMsg('Não foi possível carregar os dados do inquilino.');
        setLoading(false);
        return;
      }

      setTenant(dbTenant);

      const settings =
        typeof dbTenant.settings === 'object' && dbTenant.settings !== null
          ? (dbTenant.settings as Record<string, unknown>)
          : {};
      const branding =
        typeof settings.branding === 'object' && settings.branding !== null
          ? (settings.branding as Record<string, unknown>)
          : {};

      setForm({
        appName: typeof branding.appName === 'string' ? branding.appName : '',
        logoUrl: typeof branding.logoUrl === 'string' ? branding.logoUrl : '',
        faviconUrl: typeof branding.faviconUrl === 'string' ? branding.faviconUrl : '',
        primaryColor: typeof branding.primaryColor === 'string' ? branding.primaryColor : '',
        accentColor: typeof branding.accentColor === 'string' ? branding.accentColor : '',
        fontFamily:
          typeof branding.fontFamily === 'string' &&
          isApprovedFontToken(branding.fontFamily)
            ? branding.fontFamily
            : '',
        radius:
          branding.radius === 'sm' || branding.radius === 'md' || branding.radius === 'lg' || branding.radius === 'xl'
            ? branding.radius
            : 'md',
        density: branding.density === 'compact' ? 'compact' : 'comfortable',
        colorMode:
          branding.colorMode === 'dark' || branding.colorMode === 'auto'
            ? branding.colorMode
            : 'light',
      });

      previousThemeRef.current = document.documentElement.getAttribute('data-theme');
      previousDarkModeRef.current = document.documentElement.className.includes('dark') ? 'dark' : null;
      setLoading(false);
    };

    void load();
  }, [supabase, router]);

  // -------------------------------------------------------------------------
  // Live preview: apply overrides to the real page while editing
  // -------------------------------------------------------------------------

  const brandInput = useMemo(() => {
    const primaryColor = HEX_RE.test(form.primaryColor) ? form.primaryColor : undefined;
    const accentColor = HEX_RE.test(form.accentColor) ? form.accentColor : undefined;
    return {
      primaryColor,
      accentColor,
      fontToken: isApprovedFontToken(form.fontFamily)
        ? form.fontFamily
        : undefined,
      radius: form.radius,
      density: form.density,
    };
  }, [form]);

  const cssOutput = useMemo(() => brandToCssVars(brandInput), [brandInput]);

  useEffect(() => {
    const root = document.documentElement;

    appliedVarsRef.current.forEach((key) => root.style.removeProperty(key));
    const keys: string[] = [];

    Object.entries(cssOutput.root).forEach(([key, value]) => {
      root.style.setProperty(key, value);
      keys.push(key);
    });
    if (form.colorMode === 'dark') {
      Object.entries(cssOutput.dark).forEach(([key, value]) => {
        root.style.setProperty(key, value);
        keys.push(key);
      });
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else if (form.colorMode === 'light') {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    }
    appliedVarsRef.current = keys;

    return () => {
      appliedVarsRef.current.forEach((key) => root.style.removeProperty(key));
      appliedVarsRef.current = [];
      if (previousThemeRef.current) {
        root.setAttribute('data-theme', previousThemeRef.current);
      } else {
        root.removeAttribute('data-theme');
      }
      if (previousDarkModeRef.current) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
  }, [cssOutput, form.colorMode]);

  // -------------------------------------------------------------------------
  // Validation summary
  // -------------------------------------------------------------------------

  const contrast = useMemo(() => {
    if (!brandInput.primaryColor) return null;
    return Math.max(
      contrastRatio(brandInput.primaryColor, '#ffffff') ?? 0,
      contrastRatio(brandInput.primaryColor, '#000000') ?? 0,
    );
  }, [brandInput]);

  const primaryScaleHexes = useMemo(() => {
    if (!brandInput.primaryColor) return null;
    const scale = generatePrimaryScale(brandInput.primaryColor);
    if (!scale) return null;
    return ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((step) => {
      const match = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/.exec(scale[step] ?? '');
      return match ? oklchToHex(Number(match[1]), Number(match[2]), Number(match[3])) : null;
    });
  }, [brandInput.primaryColor]);

  const validPrimary = !form.primaryColor || HEX_RE.test(form.primaryColor);
  const validAccent = !form.accentColor || HEX_RE.test(form.accentColor);

  // -------------------------------------------------------------------------
  // Persist
  // -------------------------------------------------------------------------

  const save = async () => {
    if (!tenant) return;
    if (!validPrimary || !validAccent) {
      setErrorMsg('Use códigos hex válidos (ex.: #4A0E1A) nas cores.');
      return;
    }
    if (form.logoUrl && !isSafeAssetUrl(form.logoUrl)) {
      setErrorMsg('O logotipo deve usar HTTPS ou um caminho seguro do próprio portal.');
      return;
    }
    if (form.faviconUrl && !isSafeAssetUrl(form.faviconUrl)) {
      setErrorMsg('O favicon deve usar HTTPS ou um caminho seguro do próprio portal.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const settings =
      typeof tenant.settings === 'object' && tenant.settings !== null
        ? (tenant.settings as Record<string, unknown>)
        : {};

    const branding = normalizeBranding(form);
    const nextSettings = { ...settings };
    if (branding) {
      nextSettings.branding = branding;
    } else {
      delete nextSettings.branding;
    }

    const payload = nextSettings as unknown as Json;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ settings: payload })
        .eq('id', tenant.id);

      if (error) throw error;

      setTenant({ ...tenant, settings: payload });
      setDirty(false);
      setSuccessMsg('Identidade salva. Os visitantes verão as novas cores e detalhes no próximo carregamento.');
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível salvar a identidade. Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  const resetToPlatformDefaults = async () => {
    if (!tenant) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const settings =
      typeof tenant.settings === 'object' && tenant.settings !== null
        ? (tenant.settings as Record<string, unknown>)
        : {};
    const nextSettings = { ...settings };
    delete nextSettings.branding;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ settings: nextSettings as unknown as Json })
        .eq('id', tenant.id);
      if (error) throw error;

      setForm(EMPTY_FORM);
      setTenant({ ...tenant, settings: nextSettings as unknown as Json });
      setDirty(false);
      setSuccessMsg('Identidade restaurada para o padrão da plataforma.');
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível restaurar o padrão. Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  const previewStyle = useMemo(() => {
    const style = brandCssVarsToStyle(cssOutput);
    return style.replace(':root', '#brand-preview').replaceAll("[data-theme='dark']", "#brand-preview[data-theme='dark']");
  }, [cssOutput]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border-default)', borderTopColor: 'var(--accent)', borderRadius: 'var(--radius-full)', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p>Carregando o estúdio de identidade…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        padding: 'var(--space-8) var(--space-6)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: previewStyle }} />

      <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/admin/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Configurações do inquilino
          </Link>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            ESTÚDIO DE IDENTIDADE
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--tracking-tight)' }}>
            Marca do portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '46rem', lineHeight: 'var(--leading-relaxed)' }}>
            Defina a identidade do seu portal. As alterações valem para todos os visitantes — cores, tipografia, cantos e densidade. Se nada for definido, a identidade da plataforma é usada.
          </p>
        </div>

        {errorMsg && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'oklch(0.95 0.05 25 / 0.12)', border: '1px solid var(--color-error-500)', borderRadius: 'var(--radius-md)', color: 'var(--color-error-500)', fontSize: 'var(--text-sm)' }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'oklch(0.95 0.05 140 / 0.12)', border: '1px solid oklch(0.60 0.15 140)', borderRadius: 'var(--radius-md)', color: 'oklch(0.60 0.15 140)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
            {successMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* -------------------------------------------------- Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Identidade base */}
            <section style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-default)' }}>
                Identidade base
              </h2>

              <Field label="Nome do portal">
                <input
                  type="text"
                  value={form.appName}
                  maxLength={64}
                  placeholder="Ex.: Conexão Maçônica"
                  onChange={(e) => setField('appName', e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <Field label="Logotipo (URL)">
                <input
                  type="url"
                  value={form.logoUrl}
                  placeholder="https://…/logo.png"
                  onChange={(e) => setField('logoUrl', e.target.value)}
                  style={inputStyle}
                />
                {form.logoUrl && (
                  <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <img src={form.logoUrl} alt="" width={40} height={40} style={{ objectFit: 'contain', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-tertiary)' }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Pré-visualização do logotipo.</span>
                  </div>
                )}
              </Field>

              <Field label="Favicon (URL)">
                <input
                  type="url"
                  value={form.faviconUrl}
                  placeholder="https://…/favicon.ico"
                  onChange={(e) => setField('faviconUrl', e.target.value)}
                  style={inputStyle}
                />
              </Field>
            </section>

            {/* Cores */}
            <section style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-default)' }}>
                <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
                  Cores
                </h2>
                {contrast !== null && (
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: contrast >= 4.5 ? 'oklch(0.55 0.16 145)' : 'oklch(0.62 0.19 55)',
                    }}
                  >
                    Contraste do botão principal: {contrast.toFixed(1)}:1 {contrast >= 4.5 ? '· AA ✓' : '· abaixo de AA'}
                  </span>
                )}
              </div>

              <ColorField
                label="Cor principal"
                value={form.primaryColor}
                scale={primaryScaleHexes}
                invalid={!validPrimary}
                hint="Gera toda a paleta do portal. Use a escala na pré-visualização ao lado."
                onChange={(v) => setField('primaryColor', v)}
              />

              <ColorField
                label="Cor de realce / dourado (opcional)"
                value={form.accentColor}
                invalid={!validAccent}
                hint="Selos, badges e detalhes finos. A cor principal continua comandando botões e ações."
                onChange={(v) => setField('accentColor', v)}
              />
            </section>

            {/* Tipografia e forma */}
            <section style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-default)' }}>
                Tipografia e forma
              </h2>

              <Field label="Família tipográfica">
                <select
                  value={form.fontFamily}
                  onChange={(e) => setField('fontFamily', e.target.value)}
                  style={inputStyle}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cantos (raio)">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
                  {RADIUS_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setField('radius', preset.id)}
                      aria-pressed={form.radius === preset.id}
                      style={{
                        ...segmentedButtonStyle,
                        borderColor: form.radius === preset.id ? 'var(--accent)' : 'var(--border-default)',
                        backgroundColor: form.radius === preset.id ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                        color: form.radius === preset.id ? 'var(--accent-active)' : 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <span style={{ width: 20, height: 20, border: '2px solid currentColor', borderRadius: preset.radius, display: 'block' }} />
                      <span style={{ fontSize: 'var(--text-xs)' }}>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Densidade">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
                  {DENSITIES.map((density) => (
                    <button
                      key={density.id}
                      type="button"
                      onClick={() => setField('density', density.id)}
                      aria-pressed={form.density === density.id}
                      style={{
                        ...segmentedButtonStyle,
                        borderColor: form.density === density.id ? 'var(--accent)' : 'var(--border-default)',
                        backgroundColor: form.density === density.id ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                        color: form.density === density.id ? 'var(--accent-active)' : 'var(--text-primary)',
                      }}
                    >
                      {density.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Modo de cor">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                  {COLOR_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setField('colorMode', mode.id)}
                      aria-pressed={form.colorMode === mode.id}
                      style={{
                        ...segmentedButtonStyle,
                        borderColor: form.colorMode === mode.id ? 'var(--accent)' : 'var(--border-default)',
                        backgroundColor: form.colorMode === mode.id ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                        color: form.colorMode === mode.id ? 'var(--accent-active)' : 'var(--text-primary)',
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 'var(--space-1) 0 0' }}>
                  No modo automático, o portal acompanha a preferência de cada visitante.
                </p>
              </Field>
            </section>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-4)' }}>
              <button
                type="button"
                onClick={() => void resetToPlatformDefaults()}
                disabled={saving}
                style={{ ...buttonStyle.secondary, color: 'var(--color-error-500)' }}
              >
                Restaurar padrão
              </button>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Link
                  href="/admin/settings"
                  style={{ ...buttonStyle.secondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Cancelar
                </Link>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !dirty}
                  style={{ ...buttonStyle.primary, opacity: saving || !dirty ? 0.6 : 1, cursor: saving || !dirty ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Salvando…' : 'Salvar identidade'}
                </button>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- Preview */}
          <div style={{ position: 'sticky', top: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Pré-visualização
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {tenant?.name ?? ''} · {tenant?.slug ?? ''}
              </span>
            </div>

            <div
              id="brand-preview"
              data-theme={form.colorMode === 'dark' ? 'dark' : undefined}
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Mock app chrome */}
              <div style={{ display: 'flex', minHeight: 340 }}>
                <aside style={{ width: 168, backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-default)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border-default)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent)', display: 'block' }} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {form.appName || tenant?.name || 'Portal'}
                    </span>
                  </div>
                  {['Início', 'Diretório', 'Meus anúncios'].map((item, index) => (
                    <div
                      key={item}
                      style={{
                        fontSize: 'var(--text-xs)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: index === 0 ? 'var(--accent-subtle)' : 'transparent',
                        color: index === 0 ? 'var(--accent-active)' : 'var(--text-secondary)',
                        fontWeight: index === 0 ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                      }}
                    >
                      {item}
                    </div>
                  ))}
                  <div style={{ marginTop: 'auto' }} />
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>Administrador</span>
                    {tenant?.slug ?? ''}
                  </div>
                </aside>

                <main style={{ flex: 1, padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div>
                      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--tracking-tight)' }}>
                        Bem-vindo ao portal
                      </h3>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                        Veja como as cores e a tipografia aparecem para os visitantes.
                      </p>
                    </div>
                    <button type="button" style={{ ...buttonStyle.primary, fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}>
                      Nova publicação
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                    {[
                      { label: 'Publicações ativas', value: '12' },
                      { label: 'Visualizações', value: '3.2 mil' },
                      { label: 'Selos de confiança', value: '5' },
                      { label: 'Novos contatos', value: '28' },
                    ].map((stat) => (
                      <div key={stat.label} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)' }}>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>{stat.label}</p>
                        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)', margin: 'var(--space-1) 0 0' }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>Status da identidade</span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-inverse)', backgroundColor: 'var(--accent)', borderRadius: 'var(--radius-full)', padding: '2px var(--space-2)' }}>
                        {contrast !== null && contrast >= 4.5 ? 'AA ✓' : 'Revisar'}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                      <div style={{ width: '62%', height: '100%', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent)' }} />
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                      Texto secundário sobre superfície — <span style={{ color: 'var(--accent)' }}>links e destaques</span> usam a cor de destaque.
                    </p>
                  </div>
                </main>
              </div>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 'var(--leading-relaxed)' }}>
              A pré-visualização reflete as alterações em tempo real. Os status (erro, sucesso, aviso) são protegidos e nunca mudam por marca.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-tertiary)',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)',
};

const segmentedButtonStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-tertiary)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const buttonStyle = {
  primary: {
    padding: 'var(--space-2) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'var(--text-inverse)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-weight-bold)',
    cursor: 'pointer',
  },
  secondary: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-secondary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
} satisfies Record<string, React.CSSProperties>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>{label}</label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  scale,
  invalid,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  scale?: (string | null)[] | null;
  invalid: boolean;
  hint: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <label
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-tertiary)',
          }}
        >
          <input
            type="color"
            value={value || '#4A0E1A'}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Selecionar ${label.toLowerCase()}`}
            style={{ position: 'absolute', inset: -8, width: 56, height: 56, cursor: 'pointer' }}
          />
        </label>
        <input
          type="text"
          value={value}
          placeholder="#4A0E1A"
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputStyle,
            flex: 1,
            fontFamily: 'var(--font-mono)',
            borderColor: invalid ? 'var(--color-error-500)' : 'var(--border-default)',
          }}
          aria-invalid={invalid}
        />
      </div>
      {scale && (
        <div
          aria-hidden="true"
          style={{ display: 'flex', height: 12, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-default)' }}
        >
          {scale.map((hex, index) => (
            <span
              key={`${hex ?? 'empty'}-${index}`}
              style={{ flex: 1, backgroundColor: hex ?? 'var(--bg-tertiary)' }}
            />
          ))}
        </div>
      )}
      <p style={{ fontSize: 'var(--text-xs)', color: invalid ? 'var(--color-error-500)' : 'var(--text-secondary)', margin: 0 }}>
        {invalid ? 'Código hex inválido — use o formato #RRGGBB.' : hint}
      </p>
    </Field>
  );
}
