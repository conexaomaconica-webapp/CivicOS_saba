import React from 'react';

export function LandingVisibility() {
  return (
    <section className="py-20 bg-slate-950 text-white border-t border-slate-800">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-xs font-bold text-amber-400 tracking-widest uppercase">
              Proposta de Valor B2B
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Sua empresa merece ser encontrada por quem valoriza seu trabalho
            </h3>
            <p className="text-slate-300 text-base leading-relaxed">
              Não basta estar na internet. É preciso estar onde o seu público-alvo procura. O <strong>Conexão Maçônica</strong> oferece à sua empresa um perfil estruturado e auditável com todos os recursos comerciais necessários para gerar novos clientes.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm font-semibold text-slate-200">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">📍 Mapa e Endereço</div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">💬 Botão de WhatsApp</div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">🖼️ Galeria de Fotos</div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">⭐ Moderação de Reviews</div>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/20 space-y-6">
            <div className="text-2xl font-bold text-amber-400">Recursos de Destaque Comercial</div>
            <p className="text-sm text-slate-300">
              Seu perfil no Guia conta com indexação para mecanismos de busca (SEO), compartilhamento nativo nas redes sociais e métricas agregadas no painel administrativo do anunciante.
            </p>
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Painel do Anunciante</span>
              <span className="text-amber-400 font-bold">Incluso nos Planos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
