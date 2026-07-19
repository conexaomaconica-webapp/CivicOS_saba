'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewListingWizardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Restaurantes');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [plan, setPlan] = useState<'bronze' | 'prata' | 'ouro'>('bronze');
  const [plansConfig, setPlansConfig] = useState<Record<'bronze' | 'prata' | 'ouro', number>>({
    bronze: 0,
    prata: 299,
    ouro: 499,
  });

  // CEP & Separated Address Fields
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [fetchingCep, setFetchingCep] = useState(false);

  // Pro-rata Math Fields
  const [daysRemaining, setDaysRemaining] = useState(365);
  const [proRataPrices, setProRataPrices] = useState<Record<'bronze' | 'prata' | 'ouro', number>>({
    bronze: 0,
    prata: 299,
    ouro: 499,
  });

  // Custom Modern Dialog Modal State
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Calculate pro-rata proportional pricing
  useEffect(() => {
    const now = new Date();
    const endOfYear = new Date(now.getFullYear(), 11, 31); // 31/12
    const oneDay = 24 * 60 * 60 * 1000;
    const remaining = Math.max(1, Math.ceil((endOfYear.getTime() - now.getTime()) / oneDay));
    setDaysRemaining(remaining);

    const prataPro = parseFloat(((plansConfig.prata / 365) * remaining).toFixed(2));
    const ouroPro = parseFloat(((plansConfig.ouro / 365) * remaining).toFixed(2));
    setProRataPrices({
      bronze: 0,
      prata: prataPro,
      ouro: ouroPro,
    });
  }, [plansConfig]);

  // Autopopulate address fields using ViaCEP API
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      const fetchCep = async () => {
        setFetchingCep(true);
        setErrorMsg(null);
        try {
          const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.erro) {
            setErrorMsg('CEP não encontrado. Por favor, digite os dados do endereço manualmente.');
          } else {
            setLogradouro(data.logradouro || '');
            setBairro(data.bairro || '');
            setCidade(data.localidade || '');
            setEstado(data.uf || '');
            
            // Set focus on number input field
            setTimeout(() => {
              const numInput = document.getElementById('numero-input');
              if (numInput) numInput.focus();
            }, 100);
          }
        } catch (err) {
          setErrorMsg('Falha ao conectar com o serviço de CEP. Preencha os campos abaixo.');
        } finally {
          setFetchingCep(false);
        }
      };
      fetchCep();
    }
  }, [cep]);

  useEffect(() => {
    const fetchUserAndPlans = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Resolve tenant_id
      let tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) {
        const { data: tenantList } = await supabase.from('tenants').select('id').limit(1);
        if (tenantList && tenantList.length > 0) {
          tenantId = tenantList[0]?.id;
        }
      }

      if (tenantId) {
        const { data: dbPlans } = await supabase
          .from('tenant_plans')
          .select('tier, price_annual')
          .eq('tenant_id', tenantId);

        if (dbPlans && dbPlans.length > 0) {
          const mapped: Partial<Record<'bronze' | 'prata' | 'ouro', number>> = {};
          dbPlans.forEach((p: any) => {
            if (p.tier === 'bronze' || p.tier === 'prata' || p.tier === 'ouro') {
              mapped[p.tier as 'bronze' | 'prata' | 'ouro'] = parseFloat(p.price_annual);
            }
          });
          setPlansConfig(prev => ({ ...prev, ...mapped }));
        }
      }
    };
    fetchUserAndPlans();
  }, [supabase, router]);

  const validateStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!name.trim()) {
        setErrorMsg('Por favor, informe o Nome da Empresa.');
        return false;
      }
      if (!category) {
        setErrorMsg('Por favor, selecione uma Categoria.');
        return false;
      }
    } else if (step === 3) {
      if (!cep.trim() || !logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
        setErrorMsg('Por favor, preencha todos os campos obrigatórios de endereço (CEP, Logradouro, Número, Bairro, Cidade e Estado).');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // Resolve tenant_id from user metadata
      let tenantId = user?.user_metadata?.tenant_id;
      
      // Fallback: if no tenant_id exists in user metadata, fetch a default one to satisfy database constraint
      if (!tenantId) {
        const { data: tenantList } = await supabase.from('tenants').select('id').limit(1);
        if (tenantList && tenantList.length > 0) {
          tenantId = tenantList[0]?.id;
        }
      }

      if (!tenantId) {
        throw new Error('Nenhum inquilino (tenant) ativo encontrado para associar o anúncio.');
      }

      // Generate slug based on business name
      const slugify = (text: string) => {
        return text
          .toString()
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-');
      };
      const slug = `${slugify(name)}-${Math.random().toString(36).substring(2, 6)}`;

      // Combine separated address fields into a single string for storage
      const finalAddress = `${logradouro}, ${numero}${complemento.trim() ? ' - ' + complemento.trim() : ''}, ${bairro}, ${cidade} - ${estado} (CEP: ${cep})`;

      // Insert business listing into businesses table
      const { error } = await supabase.from('businesses').insert({
        tenant_id: tenantId,
        owner_id: user.id,
        name,
        category,
        description,
        phone,
        email,
        website,
        address: finalAddress,
        plan_tier: plan,
        slug,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setDialog({
          isOpen: true,
          type: 'success',
          title: 'Cadastro Concluído!',
          message: `Sua empresa "${name}" foi cadastrada com sucesso no guia comercial regional!`,
          onConfirm: () => {
            router.push('/dashboard');
          }
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao cadastrar o anúncio.');
    } finally {
      setLoading(false);
    }
  };

  // Step indicator helper
  const renderStepIndicator = () => {
    const steps = [
      { num: 1, label: 'Básico' },
      { num: 2, label: 'Contato' },
      { num: 3, label: 'Local' },
      { num: 4, label: 'Plano' },
    ];

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          borderBottom: '1px solid var(--border-default)',
          paddingBottom: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {steps.map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <div
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isActive
                    ? 'var(--accent)'
                    : isDone
                    ? 'var(--accent-subtle)'
                    : 'var(--border-strong)',
                  color: isActive
                    ? 'var(--text-inverse)'
                    : isDone
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                {isDone ? '✓' : s.num}
              </div>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: isActive ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'none', // hidden on small mobile view, shown below
                }}
                className="step-label"
              >
                {s.label}
              </span>
            </div>
          );
        })}
        {/* CSS to show labels on bigger viewports */}
        <style>{`
          @media (min-width: 480px) {
            .step-label { display: inline !important; }
          }
        `}</style>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        padding: 'var(--space-8) var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '32rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-8) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-link)',
              fontWeight: 'var(--font-weight-semibold)',
              textDecoration: 'none',
            }}
          >
            ← Voltar para o Painel
          </Link>
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginTop: 'var(--space-2)',
            }}
          >
            Anunciar Nova Empresa
          </h2>
        </div>

        {renderStepIndicator()}

        {errorMsg && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'oklch(0.95 0.05 25 / 0.1)',
              border: '1px solid var(--color-error-500)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error-500)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Nome da Empresa / Anúncio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pizzaria Forno de Ouro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                  }}
                >
                  <option value="Restaurantes">Restaurantes & Bares</option>
                  <option value="Serviços">Serviços Profissionais</option>
                  <option value="Saúde">Saúde & Bem Estar</option>
                  <option value="Educação">Educação</option>
                  <option value="Lojas">Lojas & Varejo</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Descrição
                </label>
                <textarea
                  placeholder="Conte um pouco sobre sua empresa, produtos ou serviços..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact Info */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  E-mail Comercial
                </label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Website
                </label>
                <input
                  type="url"
                  placeholder="https://suaempresa.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
                Informações de Localização e Endereço
              </span>

              {/* CEP Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                  CEP * {fetchingCep && <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'normal', marginLeft: 'var(--space-2)' }}>(Buscando...)</span>}
                </label>
                <input
                  type="text"
                  required
                  maxLength={9}
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Logradouro & Numero Row */}
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: '15rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                    Rua / Avenida *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome da rua ou avenida"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: '5rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                    Número *
                  </label>
                  <input
                    id="numero-input"
                    type="text"
                    required
                    placeholder="123"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Complemento & Bairro Row */}
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: '10rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                    Complemento / Sala
                  </label>
                  <input
                    type="text"
                    placeholder="Sala 402, Bloco B"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: '10rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                    Bairro *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Centro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Cidade & Estado Row */}
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: '12rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Florianópolis"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: '4rem' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-bold)' }}>
                    Estado *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="SC"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-tertiary)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Plan Selection */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
                Selecione o plano de exibição
              </span>

              {/* Bronze Plan */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: plan === 'bronze' ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                  backgroundColor: plan === 'bronze' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  value="bronze"
                  checked={plan === 'bronze'}
                  onChange={() => setPlan('bronze')}
                  style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent)' }}
                />
                <div>
                  <h4 style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>Plano Bronze (Grátis)</h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Exibição textual simples no guia comercial da comunidade.
                  </p>
                </div>
              </label>

              {/* Prata Plan */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: plan === 'prata' ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                  backgroundColor: plan === 'prata' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  value="prata"
                  checked={plan === 'prata'}
                  onChange={() => setPlan('prata')}
                  style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent)' }}
                />
                <div>
                  <h4 style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
                    Plano Prata — R$ {plansConfig.prata.toFixed(2)}/ano
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'var(--font-weight-semibold)', marginTop: '2px' }}>
                    Pro-rata proporcional (até 31/12): R$ {proRataPrices.prata.toFixed(2)} (restam {daysRemaining} dias)
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Capa personalizada, redes sociais completas e prioridade média no guia. Vencimento unificado (31/12).
                  </p>
                </div>
              </label>

              {/* Ouro Plan */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: plan === 'ouro' ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                  backgroundColor: plan === 'ouro' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  value="ouro"
                  checked={plan === 'ouro'}
                  onChange={() => setPlan('ouro')}
                  style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--accent)' }}
                />
                <div>
                  <h4 style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
                    Plano Ouro — R$ {plansConfig.ouro.toFixed(2)}/ano
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'var(--font-weight-semibold)', marginTop: '2px' }}>
                    Pro-rata proporcional (até 31/12): R$ {proRataPrices.ouro.toFixed(2)} (restam {daysRemaining} dias)
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Destaque total no topo, imagem de capa, galeria de fotos completa, botões de ação e direito a banners. Vencimento unificado (31/12).
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Navigation Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 'var(--space-6)',
              borderTop: '1px solid var(--border-default)',
              paddingTop: 'var(--space-4)',
            }}
          >
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                }}
              >
                Anterior
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--text-inverse)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                }}
              >
                Próximo
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: loading ? 'var(--accent-subtle)' : 'var(--accent)',
                  color: 'var(--text-inverse)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-bold)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Modern Custom Dialog Alert */}
      {dialog.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg-overlay, rgba(0,0,0,0.6))',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '24rem',
              backgroundColor: 'var(--bg-secondary, #18181b)',
              border: '1px solid var(--border-default, #27272a)',
              borderRadius: 'var(--radius-xl, 0.75rem)',
              padding: 'var(--space-6, 1.5rem)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              textAlign: 'center',
            }}
          >
            {/* Success icon indicator */}
            <div
              style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '50%',
                backgroundColor: 'oklch(0.95 0.05 140 / 0.1)',
                color: 'oklch(0.60 0.15 140)',
                border: '1px solid oklch(0.70 0.15 140 / 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xl, 1.25rem)',
                fontWeight: 'bold',
                margin: '0 auto',
              }}
            >
              ✓
            </div>
            
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {dialog.title}
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                {dialog.message}
              </p>
            </div>
            
            <button
              onClick={() => {
                setDialog(prev => ({ ...prev, isOpen: false }));
                if (dialog.onConfirm) dialog.onConfirm();
              }}
              style={{
                width: '100%',
                padding: 'var(--space-2-5, 0.625rem)',
                borderRadius: 'var(--radius-md, 0.375rem)',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
