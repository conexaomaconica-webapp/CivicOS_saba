import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { ShieldCheck, Award, Building2, Store, CreditCard, ChevronRight, CheckCircle2, Eye, Star } from 'lucide-react';

export const metadata = {
  title: 'Painel do Anunciante · Conexão Maçônica',
};

export default async function AdvertiserDashboardPage() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fanunciante');
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Painel do Anunciante (ADV-009)
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Assinatura Ativa
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mt-2">Bem-vindo, Anunciante</h1>
          <p className="text-xs text-stone-400 mt-1">
            Gerencie o perfil da sua empresa, serviços, benefícios e faturas comerciais.
          </p>
        </div>

        <Link
          href="/guia"
          className="px-4 py-2 bg-stone-900 border border-stone-700 hover:border-amber-500 text-stone-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start md:self-auto"
        >
          <Eye className="w-4 h-4 text-amber-400" /> Ver Guia Público
        </Link>
      </div>

      {/* Grid de Métricas & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-stone-400 text-xs font-semibold">
            <span>Plano Vigente</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-300 font-serif">Plano Prata</p>
          <p className="text-xs text-stone-400">Ativado via Asaas Gateway</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-stone-400 text-xs font-semibold">
            <span>Vínculo Fraterno</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 font-serif">Irmão da Rede</p>
          <p className="text-xs text-stone-400">Selo verificado & consentido</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-stone-400 text-xs font-semibold">
            <span>Status no Guia</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white font-serif">Publicado</p>
          <p className="text-xs text-emerald-400">Ativo nas buscas públicas</p>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-lg text-white">Gestão da Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard"
            className="p-5 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-900/50 text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100 group-hover:text-amber-400 transition-colors">
                  Editar Perfil & Mídias
                </h4>
                <p className="text-xs text-stone-400">Logotipo, descrição, WhatsApp e horário de funcionamento</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-stone-300 transition-colors" />
          </Link>

          <Link
            href="/dashboard/empresas/default/beneficios"
            className="p-5 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-900/50 text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100 group-hover:text-amber-400 transition-colors">
                  Benefícios & Serviços
                </h4>
                <p className="text-xs text-stone-400">Cadastrar descontos e catálogo de serviços oferecidos</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-stone-300 transition-colors" />
          </Link>
        </div>
      </div>
    </main>
  );
}
