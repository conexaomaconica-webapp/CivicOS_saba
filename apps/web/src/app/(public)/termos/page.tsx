import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso | Conexão Maçônica',
  description: 'Termos de uso da plataforma Conexão Maçônica.',
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#20080a] text-slate-300 py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#300d11] p-8 md:p-12 rounded-2xl shadow-xl border border-[#4B161B]">
        <h1 className="text-3xl font-bold text-white mb-8">Termos de Uso</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            Bem-vindo ao Conexão Maçônica. Ao acessar ou usar nosso site e aplicativo, você concorda com estes Termos de Uso.
            Por favor, leia-os cuidadosamente.
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar os serviços do Conexão Maçônica, você concorda em cumprir e estar vinculado a
            estes termos. Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">2. Uso da Plataforma</h2>
          <p>
            O Conexão Maçônica é um guia comercial e rede de networking. Os usuários comprometem-se a fornecer informações
            verídicas, atualizadas e manter uma conduta respeitosa e alinhada aos valores da instituição.
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">3. Planos e Assinaturas</h2>
          <p>
            Alguns recursos são exclusivos para assinantes de planos específicos (Bronze, Prata, Ouro, Ouro Fundador).
            Os detalhes, valores e vigência de cada assinatura estão descritos no momento da contratação e podem
            sofrer reajustes mediante aviso prévio.
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">4. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo, marcas, layout, logos e software associados à plataforma Conexão Maçônica são de propriedade
            exclusiva da plataforma e estão protegidos pelas leis de direitos autorais.
          </p>

          <p className="pt-8 text-xs text-slate-500 italic">
            Última atualização: 20 de Agosto de 2026. Este é um texto provisório e deverá ser revisado por equipe jurídica competente.
          </p>
        </div>
      </div>
    </main>
  );
}
