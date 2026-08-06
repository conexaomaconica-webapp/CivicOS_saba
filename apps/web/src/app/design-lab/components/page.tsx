'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  Drawer,
  Toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  EmptyState
} from '@saas/ui';

import { BusinessCard } from '../_components/domain/BusinessCard';
import { CommunityBadge } from '../_components/domain/CommunityBadge';
import { BillingSummary } from '../_components/domain/BillingSummary';
import { ContractViewer } from '../_components/domain/ContractViewer';
import { ModerationQueue } from '../_components/domain/ModerationQueue';
import { StatusTimeline } from '../_components/domain/StatusTimeline';
import { MOCK_BUSINESSES } from '../_mocks/businesses';
import { MOCK_PLANS } from '../_mocks/plans';
import { MOCK_CONTRACTS } from '../_mocks/contracts';
import { MOCK_MODERATION_ITEMS } from '../_mocks/moderation';
import {
  toBusinessCardViewModel,
  toBillingSummaryViewModel,
  toContractViewerViewModel,
  toModerationQueueItemViewModel
} from '../_types/view-models';

export default function ComponentPlaygroundPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [selectVal, setSelectVal] = useState('option-1');
  const [activeToast, setActiveToast] = useState(false);

  const simulateLoading = () => {
    setBtnLoading(true);
    setTimeout(() => setBtnLoading(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header Banner */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
          <span>🧩 @saas/ui & Domain</span>
          <span>•</span>
          <span>11 Primitivas & 6 Componentes de Domínio</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Component Playground & Domain Showcase
        </h2>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Galeria de primitivas neutras do Design System e componentes de domínio simulados com View Models desacoplados.
        </p>
      </div>

      {/* 1. BUTTON PRIMITIVE */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">1. Button Primitive</h3>
            <p className="text-xs text-slate-400">Variantes, tamanhos, estados de carregamento e desabilitado</p>
          </div>
          <Button size="sm" variant="outline" onClick={simulateLoading} loading={btnLoading}>
            Simular Loading (2s)
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono text-slate-500">Variantes Semânticas</div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary" loading={btnLoading}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="text-xs font-mono text-slate-500">Tamanhos</div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button size="sm">Small (32px)</Button>
            <Button size="md">Medium (40px)</Button>
            <Button size="lg">Large (48px)</Button>
            <Button size="icon" aria-label="Ícone Configurações">⚙️</Button>
          </div>
        </div>
      </section>

      {/* 2. INPUT PRIMITIVE */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">2. Input Primitive</h3>
          <p className="text-xs text-slate-400">Entrada de texto com rótulo, ajuda, ícones e estado inválido</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Campo Padrão"
            placeholder="Digite aqui..."
            helperText="Texto auxiliar descritivo"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />

          <Input
            label="Com Ícone"
            leftIcon="🔍"
            placeholder="Buscar..."
          />

          <Input
            label="Estado de Erro (Inválido)"
            value="valor_invalido"
            errorMessage="Formato de e-mail incorreto"
          />
        </div>
      </section>

      {/* 3. SELECT PRIMITIVE */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">3. Select Primitive</h3>
          <p className="text-xs text-slate-400">Seleção acessível por teclado com seta indicadora</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Selecione uma opção"
            value={selectVal}
            onChange={(e) => setSelectVal(e.target.value)}
            options={[
              { label: 'Opção 1 — Padrão', value: 'option-1' },
              { label: 'Opção 2 — Alternativa', value: 'option-2' },
              { label: 'Opção 3 — Desabilitada', value: 'option-3', disabled: true }
            ]}
          />

          <Select
            label="Com mensagem de erro"
            errorMessage="Seleção obrigatória"
            options={[
              { label: 'Nenhuma opção selecionada', value: '' }
            ]}
          />
        </div>
      </section>

      {/* 4. BADGE PRIMITIVE */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">4. Badge Primitive</h3>
          <p className="text-xs text-slate-400">Tags e marcadores de estado semântico</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="info" icon="ℹ️">Informação</Badge>
          <Badge variant="success" icon="✅">Sucesso</Badge>
          <Badge variant="warning" icon="⚠️">Atenção</Badge>
          <Badge variant="danger" icon="🚨">Perigo</Badge>
          <Badge variant="accent">Destaque</Badge>
          <Badge variant="success" size="sm">Pequeno</Badge>
        </div>
      </section>

      {/* 5. CARD PRIMITIVE */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">5. Card Primitive & Composites</h3>
          <p className="text-xs text-slate-400">Contêiner estruturado com slots de Header, Content e Footer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Cartão Elevado com Sombra</CardTitle>
              <CardDescription>Slot de descrição secundária com tipografia reduzida.</CardDescription>
            </CardHeader>
            <CardContent>
              Conteúdo principal do cartão estilizado com margem e espaçamento padronizados.
            </CardContent>
            <CardFooter>
              <span className="text-xs text-slate-400">Rodapé Informativo</span>
              <Button size="sm">Ação</Button>
            </CardFooter>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Cartão com Efeito Glassmorphism</CardTitle>
              <CardDescription>Superfície semitransparente com desfoque de fundo.</CardDescription>
            </CardHeader>
            <CardContent>
              Perfeito para dashboards e sobreposições visuais de destaque.
            </CardContent>
            <CardFooter>
              <Badge variant="accent">Glass Style</Badge>
              <Button size="sm" variant="outline">Ver mais</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 6. DIALOG, DRAWER & TOAST PRIMITIVES */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">6. Dialog, Drawer & Toast Primitives</h3>
          <p className="text-xs text-slate-400">Superfícies sobrepostas acessíveis com atalho Escape e travamento de foco</p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
            Abrir Dialog (Modal)
          </Button>

          <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
            Abrir Drawer (Gaveta)
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setActiveToast(true);
              setTimeout(() => setActiveToast(false), 3000);
            }}
          >
            Disparar Toast de Exemplo
          </Button>
        </div>

        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Confirmação de Ação"
          description="Este é um modal de diálogo acessível neutro."
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsDialogOpen(false)}>
                Confirmar
              </Button>
            </>
          }
        >
          <p>
            Conteúdo interativo dentro do diálogo com foco capturado e suporte à tecla <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-xs">Esc</kbd>.
          </p>
        </Dialog>

        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Painel de Filtros (Drawer)"
          footer={
            <Button size="sm" onClick={() => setIsDrawerOpen(false)}>
              Aplicar Filtros
            </Button>
          }
        >
          <div className="space-y-4">
            <Input label="Filtro por Palavra-Chave" placeholder="Digite..." />
            <Select
              label="Filtro de Categoria"
              options={[
                { label: 'Todas as Categorias', value: 'all' },
                { label: 'Categoria A', value: 'a' }
              ]}
            />
          </div>
        </Drawer>

        {activeToast && (
          <div className="pt-2">
            <Toast
              toast={{
                id: 't1',
                type: 'success',
                title: 'Operação Realizada',
                message: 'Os dados foram salvos com sucesso na camada de estado.'
              }}
              onDismiss={() => setActiveToast(false)}
            />
          </div>
        )}
      </section>

      {/* 7. TABS PRIMITIVE */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">7. Tabs Primitive</h3>
          <p className="text-xs text-slate-400">Navegação em abas acessíveis com marcação ARIA role=tab</p>
        </div>

        <Tabs defaultValue="tab-1">
          <TabsList>
            <TabsTrigger value="tab-1">Aba 1 (Geral)</TabsTrigger>
            <TabsTrigger value="tab-2">Aba 2 (Detalhes)</TabsTrigger>
            <TabsTrigger value="tab-3" disabled>Aba 3 (Desabilitada)</TabsTrigger>
          </TabsList>

          <TabsContent value="tab-1" className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            Conteúdo da primeira aba.
          </TabsContent>
          <TabsContent value="tab-2" className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            Conteúdo detalhado da segunda aba.
          </TabsContent>
        </Tabs>
      </section>

      {/* 8. SKELETON & EMPTYSTATE PRIMITIVES */}
      <section className="space-y-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">8. Skeleton & EmptyState Primitives</h3>
          <p className="text-xs text-slate-400">Estados de carregamento sem CLS e visualização para listas sem registros</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-mono text-slate-400 mb-2">Skeleton Loading</div>
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="space-y-2 flex-1">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
              </div>
            </div>
            <Skeleton variant="rectangular" height={80} />
          </div>

          <EmptyState
            icon="📭"
            title="Nenhum Registro Encontrado"
            description="Não existem dados para os filtros selecionados no momento."
            primaryAction={<Button size="sm">Criar Registro</Button>}
            secondaryAction={<Button size="sm" variant="ghost">Limpar Filtros</Button>}
          />
        </div>
      </section>

      {/* ====================================================================
          FASE 4 — COMPONENTES DE DOMÍNIO SIMULADOS (VIEW MODELS)
         ==================================================================== */}
      <section className="space-y-8 bg-slate-900/80 border border-amber-500/40 p-8 rounded-2xl">
        <div className="border-b border-slate-800 pb-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <span>🏰 Fase 4</span>
            <span>•</span>
            <span>Componentes de Domínio Desacoplados (View Models)</span>
          </div>
          <h3 className="text-xl font-bold text-white">6 Componentes de Domínio Específicos</h3>
          <p className="text-xs text-slate-400">
            Cartões de empresa, selos fraternos, resumo financeiro, minuta de contrato, fila de moderação e linha do tempo de estados.
          </p>
        </div>

        {/* 1. CommunityBadges */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-slate-400 uppercase">1. CommunityBadges (Selos Fraternos & Neutros)</h4>
          <div className="flex flex-wrap gap-3">
            <CommunityBadge label="Membro Verificado" category="verification" tone="success" icon="🛡️" />
            <CommunityBadge label="Loja Parceira" category="connection" tone="info" icon="🏛️" />
            <CommunityBadge label="Patrocinador Gold" category="commercial" tone="warning" icon="⭐" />
            <CommunityBadge label="Anunciante Silver" category="commercial" tone="neutral" icon="🎖️" />
            <CommunityBadge label="Fundador Pioneiro" category="recognition" tone="accent" icon="🚀" />
          </div>
        </div>

        {/* 2. BusinessCards Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-slate-400 uppercase">2. BusinessCards (Empresas do Guia Comercial)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BusinessCard viewModel={toBusinessCardViewModel(MOCK_BUSINESSES[0]!)} />
            <BusinessCard viewModel={toBusinessCardViewModel(MOCK_BUSINESSES[1]!)} />
          </div>
        </div>

        {/* 3. BillingSummary & ContractViewer */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-slate-400 uppercase">3. BillingSummary & ContractViewer</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <BillingSummary viewModel={toBillingSummaryViewModel(MOCK_PLANS[0]!)} />
            <ContractViewer viewModel={toContractViewerViewModel(MOCK_CONTRACTS[0]!)} />
          </div>
        </div>

        {/* 4. ModerationQueue & StatusTimeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-slate-400 uppercase">4. ModerationQueue & StatusTimeline</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ModerationQueue item={toModerationQueueItemViewModel(MOCK_MODERATION_ITEMS[0]!)} />
            <StatusTimeline
              orientation="vertical"
              steps={[
                { label: 'Cadastro Inicial da Empresa', timestamp: '2026-08-01 10:00', status: 'completed' },
                { label: 'Verificação do Vínculo Fraterno', timestamp: '2026-08-02 14:30', status: 'completed' },
                { label: 'Análise de Moderação Administrativa', timestamp: '2026-08-03 09:15', status: 'current' },
                { label: 'Assinatura do Contrato de Veiculação', timestamp: 'Pendente', status: 'pending' },
                { label: 'Publicação no Guia Comercial', timestamp: 'Pendente', status: 'pending' }
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
