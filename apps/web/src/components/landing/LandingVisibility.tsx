import React from 'react';
import { MapPin, MessageCircle, Image as ImageIcon, Star } from 'lucide-react';

export function LandingVisibility() {
  return (
    <section className="py-20 bg-[#20080a] text-white border-t border-[#4B161B]">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-xs font-bold text-[#C9A227] tracking-widest uppercase">
              Proposta de Valor B2B
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Sua empresa merece ser encontrada por quem valoriza seu trabalho
            </h3>
            <p className="text-slate-300 text-base leading-relaxed">
              Não basta estar na internet. É preciso estar onde o seu público-alvo procura. O <strong>Conexão Maçônica</strong> oferece à sua empresa um perfil estruturado e auditável com todos os recursos comerciais necessários para gerar novos clientes.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm font-semibold text-slate-200">
              <div className="p-3 bg-[#300d11] rounded-lg border border-[#4B161B] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C9A227]" />
                <span>Mapa e Endereço</span>
              </div>
              <div className="p-3 bg-[#300d11] rounded-lg border border-[#4B161B] flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#C9A227]" />
                <span>Botão de WhatsApp</span>
              </div>
              <div className="p-3 bg-[#300d11] rounded-lg border border-[#4B161B] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                <span>Galeria de Fotos</span>
              </div>
              <div className="p-3 bg-[#300d11] rounded-lg border border-[#4B161B] flex items-center gap-2">
                <Star className="w-4 h-4 text-[#C9A227]" />
                <span>Moderação de Reviews</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-[#C9A227]/10 via-[#300d11] to-[#20080a] border border-[#C9A227]/30 space-y-6">
            <div className="text-2xl font-bold text-[#C9A227]">Recursos de Destaque Comercial</div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Seu perfil no Guia conta com indexação para mecanismos de busca (SEO), compartilhamento nativo nas redes sociais e métricas agregadas no painel administrativo do anunciante.
            </p>
            <div className="pt-4 border-t border-[#4B161B] flex items-center justify-between text-xs text-slate-400">
              <span>Painel do Anunciante</span>
              <span className="text-[#C9A227] font-bold">Incluso nos Planos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
