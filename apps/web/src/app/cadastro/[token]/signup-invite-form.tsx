'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Search } from 'lucide-react';
import { submitSignupInviteAction, getCitiesByStateAction } from '@/lib/onboarding/signup-invite-service';
import { MASONIC_RELATION_LABEL, MASONIC_RELATIONS } from '@/lib/onboarding/signup-invite-shared';
import { formatCpfCnpj, formatPhone } from '@/lib/onboarding/onboarding-validation';
import { InviteBrandHeader } from '@/components/onboarding/InviteBrandHeader';
import { LodgeAutocomplete } from '@/components/onboarding/LodgeAutocomplete';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const NEW_CATEGORY = '__other__';

const INVITE_PLAN_OPTIONS = [
  {
    code: 'acacia_pedra_fundamental',
    name: 'Plano Acácia — 2 anos — Pedra Fundamental',
    badge: '⭐ Condição Especial',
    description: 'Vigência de 24 meses (bienal), topo das buscas do Guia e outorga do selo histórico Pedra Fundamental.',
  },
  {
    code: 'acacia',
    name: 'Plano Acácia (Anual)',
    description: 'Prioridade máxima no Guia comercial, galeria de fotos, vídeo institucional e destaque ampliado.',
  },
  {
    code: 'compasso',
    name: 'Plano Compasso (Anual)',
    description: 'Destaque no Guia, mídias institucionais e canal direto no WhatsApp.',
  },
  {
    code: 'esquadro',
    name: 'Plano Esquadro (Anual)',
    description: 'Presença essencial e oficial no Guia Comercial.',
  },
];

type Props = {
  token: string;
  invitedName?: string;
  invitedEmail?: string;
  categories: Array<{ id: string; name: string }>;
  brandName: string;
  primaryColor: string;
  logoSrc?: string | null;
};

const inputClass =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1 text-xs font-bold text-stone-700">
      <span>{label}</span>
      {children}
      {hint && <span className="block text-[11px] font-normal text-stone-500">{hint}</span>}
    </label>
  );
}

export default function SignupInviteForm({ token, invitedName, invitedEmail, categories, brandName, primaryColor, logoSrc = null }: Props) {
  const [values, setValues] = useState({
    responsibleName: invitedName || '',
    responsibleEmail: invitedEmail || '',
    responsiblePhone: '',
    tradingName: '',
    legalName: '',
    document: '',
    businessPhone: '',
    publicEmail: '',
    website: '',
    categoryId: '',
    categoryOther: '',
    postalCode: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    masonicRelation: 'mason',
    referenceMasonName: '',
    referenceMasonCim: '',
    lodgeName: '',
    lodgeOrganizationId: '',
    potency: '',
    consent: false,
    website2: '', // isca anti-robô: fica invisível
    planInterest: 'acacia_pedra_fundamental',
    paymentPreference: 'pix',
  });
  const [otherCategory, setOtherCategory] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof values, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));

  async function loadCitiesForState(uf: string) {
    if (!uf || uf.length !== 2) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const list = await getCitiesByStateAction(uf);
      setCities(list);
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }

  async function handleCepSearch(rawCep?: string) {
    const raw = (rawCep !== undefined ? rawCep : values.postalCode).replace(/\D/g, '');
    if (raw.length !== 8) {
      setCepFeedback({ type: 'error', message: 'Informe um CEP válido com 8 dígitos.' });
      return;
    }
    setIsSearchingCep(true);
    setCepFeedback(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      if (!res.ok) throw new Error('Serviço de CEP indisponível');
      const data = await res.json();
      if (data.erro) {
        setCepFeedback({ type: 'error', message: 'CEP não localizado nos Correios. Preencha manualmente.' });
        return;
      }
      const uf = data.uf ? data.uf.toUpperCase() : values.state;
      setValues((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: uf,
      }));
      setCepFeedback({ type: 'success', message: 'Endereço localizado via CEP! Complete número e complemento.' });
      if (uf) void loadCitiesForState(uf);
    } catch {
      setCepFeedback({ type: 'error', message: 'Falha ao buscar CEP. Você pode preencher manualmente.' });
    } finally {
      setIsSearchingCep(false);
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = val;
    if (val.length > 5) formatted = `${val.slice(0, 5)}-${val.slice(5)}`;
    set('postalCode', formatted);
    setCepFeedback(null);
    if (val.length === 8) {
      void handleCepSearch(val);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const result = await submitSignupInviteAction(token, values);
    setSending(false);
    if (!result.success) {
      setError(result.error || 'Não foi possível enviar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#faf7f2]">
        <InviteBrandHeader logoSrc={logoSrc} brandName={brandName} primaryColor={primaryColor} />
        <div className="mx-auto mt-12 max-w-lg space-y-3 rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
          <h1 className="font-serif text-xl font-bold text-stone-900">Dados enviados</h1>
          <p className="text-sm text-stone-600">
            Obrigado! A equipe da {brandName} vai conferir as informações e entrará em contato para os próximos passos.
            Nada é publicado antes dessa conferência.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2]" style={{ ['--brand' as string]: primaryColor }}>
      <InviteBrandHeader logoSrc={logoSrc} brandName={brandName} primaryColor={primaryColor} />
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <header className="space-y-2 text-center">
          <h1 className="font-serif text-2xl font-bold sm:text-3xl" style={{ color: primaryColor }}>Cadastro da sua empresa</h1>
          <p className="text-sm text-stone-600">
            Preencha os dados abaixo. A equipe vai conferir as informações antes de seguir para o contrato. Nada é publicado agora.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div>
        )}

        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-lg font-bold text-stone-900">Responsável</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *"><input required className={inputClass} value={values.responsibleName} onChange={(e) => set('responsibleName', e.target.value)} autoComplete="name" /></Field>
            <Field label="E-mail *" hint="Será o seu acesso ao painel."><input required type="email" className={inputClass} value={values.responsibleEmail} onChange={(e) => set('responsibleEmail', e.target.value)} autoComplete="email" /></Field>
            <Field label="Telefone / WhatsApp"><input className={inputClass} inputMode="tel" value={values.responsiblePhone} onChange={(e) => set('responsiblePhone', formatPhone(e.target.value))} placeholder="(00) 00000-0000" /></Field>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-lg font-bold text-stone-900">Empresa</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome fantasia *"><input required className={inputClass} value={values.tradingName} onChange={(e) => set('tradingName', e.target.value)} /></Field>
            <Field label="Razão social *"><input required className={inputClass} value={values.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
            <Field label="CNPJ ou CPF *"><input required className={inputClass} inputMode="numeric" value={formatCpfCnpj(values.document)} onChange={(e) => set('document', e.target.value.replace(/\D/g, '').slice(0, 14))} /></Field>
            <Field label="Telefone da empresa"><input className={inputClass} inputMode="tel" value={values.businessPhone} onChange={(e) => set('businessPhone', formatPhone(e.target.value))} placeholder="(00) 00000-0000" /></Field>
            <Field label="E-mail público" hint="Opcional. Aparece na página da empresa."><input type="email" className={inputClass} value={values.publicEmail} onChange={(e) => set('publicEmail', e.target.value)} /></Field>
            <Field label="Site"><input className={inputClass} value={values.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
          </div>

          <Field label="Categoria *" hint="Escolha da lista. Só informe outra se a sua atividade realmente não estiver nela.">
            <select
              required
              className={inputClass}
              value={otherCategory ? NEW_CATEGORY : values.categoryId}
              onChange={(e) => {
                if (e.target.value === NEW_CATEGORY) {
                  setOtherCategory(true);
                  set('categoryId', '');
                } else {
                  setOtherCategory(false);
                  set('categoryId', e.target.value);
                  set('categoryOther', '');
                }
              }}
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              <option value={NEW_CATEGORY}>Não encontrei minha categoria…</option>
            </select>
          </Field>
          {otherCategory && (
            <Field label="Qual é a categoria? *"><input required className={inputClass} maxLength={80} value={values.categoryOther} onChange={(e) => set('categoryOther', e.target.value)} /></Field>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">Endereço</h2>
              <p className="text-xs text-stone-500">
                Digite o CEP para preenchimento automático ou selecione o estado para ver as cidades.
              </p>
            </div>
          </div>

          {cepFeedback && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold ${cepFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
            >
              {cepFeedback.message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Field label="CEP" hint="Busca automática">
                <div className="flex gap-1.5">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={values.postalCode}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <button
                    type="button"
                    onClick={() => handleCepSearch()}
                    disabled={isSearchingCep}
                    title="Buscar endereço pelo CEP"
                    className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-700 hover:bg-stone-100 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSearchingCep ? <Loader2 className="h-4 w-4 animate-spin text-[#3B0B14]" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>
            <div className="sm:col-span-4">
              <Field label="Rua / Avenida">
                <input className={inputClass} value={values.street} onChange={(e) => set('street', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Número">
                <input className={inputClass} value={values.number} onChange={(e) => set('number', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-4">
              <Field label="Bairro">
                <input className={inputClass} value={values.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Estado (UF) *">
                <select
                  required
                  className={inputClass}
                  value={values.state}
                  onChange={(e) => {
                    const newUf = e.target.value;
                    set('state', newUf);
                    set('city', '');
                    void loadCitiesForState(newUf);
                  }}
                >
                  <option value="">UF</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
            </div>
            <div className="sm:col-span-4">
              <Field label="Cidade *" hint={loadingCities ? 'Carregando cidades do estado...' : values.state ? `${cities.length} cidades disponíveis` : undefined}>
                <input
                  required
                  list="cities-list"
                  className={inputClass}
                  value={values.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder={values.state ? 'Selecione ou digite a cidade' : 'Informe o estado ou digite o CEP'}
                />
                <datalist id="cities-list">
                  {cities.map((cityName) => (
                    <option key={cityName} value={cityName} />
                  ))}
                </datalist>
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-lg font-bold text-stone-900">Vínculo maçônico</h2>
          <p className="text-xs text-stone-500">O Guia é voltado à comunidade maçônica. A equipe confere estas informações.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Você é *">
              <select className={inputClass} value={values.masonicRelation} onChange={(e) => set('masonicRelation', e.target.value)}>
                {MASONIC_RELATIONS.map((key) => <option key={key} value={key}>{MASONIC_RELATION_LABEL[key]}</option>)}
              </select>
            </Field>
            <Field label={values.masonicRelation === 'mason' ? 'Seu nome de maçom *' : 'Nome do maçom de referência *'}>
              <input required className={inputClass} value={values.referenceMasonName} onChange={(e) => set('referenceMasonName', e.target.value)} />
            </Field>
            <Field label="CIM (se tiver)"><input className={inputClass} value={values.referenceMasonCim} onChange={(e) => set('referenceMasonCim', e.target.value)} /></Field>
            <Field label="Potência *" hint="Ex.: GOB, CMSB, COMAB, GOSP."><input required className={inputClass} value={values.potency} onChange={(e) => set('potency', e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <Field label="Loja Maçônica *" hint="Digite o nome e escolha na lista. Se a sua Loja não aparecer, pode digitar o nome mesmo: a equipe ajusta depois.">
                <LodgeAutocomplete
                  tone="light"
                  value={values.lodgeName}
                  onChange={(value) => set('lodgeName', value)}
                  onPick={(lodge) => {
                    set('lodgeOrganizationId', lodge?.id ?? '');
                    // Escolheu da lista: já preenche a potência da Loja (pode ser ajustada).
                    if (lodge?.potency) set('potency', lodge.potency);
                  }}
                  placeholder="Ex.: Aliança Universitária"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Isca anti-robô: invisível para pessoas */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Não preencha<input tabIndex={-1} autoComplete="off" value={values.website2} onChange={(e) => set('website2', e.target.value)} /></label>
        </div>

        {/* Plano comercial de interesse & Forma de pagamento */}
        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-900">Plano comercial de interesse</h2>
            <p className="text-xs text-stone-500">
              Selecione o plano desejado para a divulgação da sua empresa no Guia Conexão Maçônica.
            </p>
          </div>

          <div className="space-y-3">
            {INVITE_PLAN_OPTIONS.map((plan) => (
              <label
                key={plan.code}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition cursor-pointer ${values.planInterest === plan.code
                    ? 'border-[#3B0B14] bg-[#3B0B14]/5 shadow-xs'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
              >
                <input
                  type="radio"
                  name="planInterest"
                  value={plan.code}
                  checked={values.planInterest === plan.code}
                  onChange={(e) => set('planInterest', e.target.value)}
                  className="mt-1 h-4 w-4 text-[#3B0B14] focus:ring-[#3B0B14]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-sm font-bold text-stone-900">{plan.name}</span>
                    {plan.badge && (
                      <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 border border-amber-300">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">{plan.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              Como você prefere realizar o pagamento do plano? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition cursor-pointer ${values.paymentPreference === 'pix'
                    ? 'border-[#3B0B14] bg-[#3B0B14]/5'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
              >
                <input
                  type="radio"
                  name="paymentPreference"
                  value="pix"
                  checked={values.paymentPreference === 'pix'}
                  onChange={(e) => set('paymentPreference', e.target.value)}
                  className="h-4 w-4 text-[#3B0B14] focus:ring-[#3B0B14]"
                />
                <div>
                  <span className="text-sm font-bold text-stone-900 block">Pix</span>
                  <span className="text-[11px] text-stone-500">Pagamento instantâneo via Pix</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition cursor-pointer ${values.paymentPreference === 'credit_card'
                    ? 'border-[#3B0B14] bg-[#3B0B14]/5'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
              >
                <input
                  type="radio"
                  name="paymentPreference"
                  value="credit_card"
                  checked={values.paymentPreference === 'credit_card'}
                  onChange={(e) => set('paymentPreference', e.target.value)}
                  className="h-4 w-4 text-[#3B0B14] focus:ring-[#3B0B14]"
                />
                <div>
                  <span className="text-sm font-bold text-stone-900 block">Cartão de Crédito</span>
                  <span className="text-[11px] text-stone-500">Pagamento via cartão</span>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="flex items-start gap-3 text-sm text-stone-700">
            <input type="checkbox" required checked={values.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-1 h-4 w-4 rounded border-stone-300" />
            <span>
              Concordo que a {brandName} use estes dados para analisar o cadastro e entrar em contato (LGPD). Posso pedir a
              exclusão a qualquer momento.
            </span>
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: primaryColor }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            {sending ? 'Enviando…' : 'Enviar dados para conferência'}
          </button>
        </section>
      </form>
    </main>
  );
}
