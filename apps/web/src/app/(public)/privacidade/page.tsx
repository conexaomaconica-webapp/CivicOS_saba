import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacidade e LGPD | Conexão Maçônica',
  description: 'Política de privacidade e proteção de dados (LGPD) do Conexão Maçônica.',
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#20080a] text-slate-300 py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#300d11] p-8 md:p-12 rounded-2xl shadow-xl border border-[#4B161B]">
        <h1 className="text-3xl font-bold text-white mb-8">Política de Privacidade (LGPD)</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            O Conexão Maçônica leva a sua privacidade a sério. Esta política descreve como coletamos, usamos,
            armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">1. Dados Coletados</h2>
          <p>
            Coletamos informações fornecidas voluntariamente por você durante o cadastro e uso da plataforma,
            tais como: nome, e-mail, telefone, nome da empresa, loja maçônica vinculada, e dados de pagamento.
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">2. Uso das Informações</h2>
          <p>
            Os dados coletados são utilizados exclusivamente para:
            <br/>• Criar e gerenciar sua conta e seu perfil público no guia.
            <br/>• Processar pagamentos de assinaturas.
            <br/>• Enviar comunicações importantes sobre a plataforma e oportunidades de networking.
            <br/>• Garantir a segurança e integridade da rede.
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">3. Compartilhamento de Dados</h2>
          <p>
            Suas informações de contato comercial (cadastradas no perfil público) ficam visíveis no guia para fomentar
            negócios. Seus dados sigilosos de navegação, senha e pagamento jamais são compartilhados com terceiros, 
            exceto provedores essenciais para o funcionamento do sistema (ex: gateways de pagamento seguro).
          </p>

          <h2 className="text-xl font-semibold text-[#C9A227] mt-8 mb-4">4. Seus Direitos</h2>
          <p>
            De acordo com a LGPD, você tem o direito de solicitar o acesso, correção, atualização ou exclusão
            dos seus dados pessoais a qualquer momento, através dos canais de atendimento da plataforma.
          </p>

          <p className="pt-8 text-xs text-slate-500 italic">
            Última atualização: 20 de Agosto de 2026. Este é um texto provisório e deverá ser revisado por equipe jurídica competente.
          </p>
        </div>
      </div>
    </main>
  );
}
