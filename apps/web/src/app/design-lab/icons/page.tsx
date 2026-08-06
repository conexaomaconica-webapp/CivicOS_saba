'use client';

import React, { useState } from 'react';

interface IconCategory {
  category: string;
  icons: { name: string; symbol: string; usage: string }[];
}

const ICON_CATALOG: IconCategory[] = [
  {
    category: 'Navegação & UI',
    icons: [
      { name: 'Home', symbol: '🏠', usage: 'Início do Guia' },
      { name: 'Search', symbol: '🔍', usage: 'Campo de Busca Global' },
      { name: 'Menu', symbol: '☰', usage: 'Drawer / Hambúrguer' },
      { name: 'Filter', symbol: '🎛️', usage: 'Filtros Avançados' },
      { name: 'Grid', symbol: '▦', usage: 'Alternância de Lista' }
    ]
  },
  {
    category: 'Status & Selos',
    icons: [
      { name: 'CheckCircle', symbol: '✅', usage: 'Aprovado / Verificado' },
      { name: 'AlertTriangle', symbol: '⚠️', usage: 'Pendente de Análise' },
      { name: 'XCircle', symbol: '🚨', usage: 'Rejeitado / Suspenso' },
      { name: 'Star', symbol: '⭐', usage: 'Destaque Comercial' },
      { name: 'ShieldCheck', symbol: '🛡️', usage: 'Verificação Fraterna' }
    ]
  },
  {
    category: 'Financeiro & Contratos',
    icons: [
      { name: 'CreditCard', symbol: '💳', usage: 'Checkout Pagamento' },
      { name: 'FileText', symbol: '📜', usage: 'Minuta / Contrato' },
      { name: 'Receipt', symbol: '🧾', usage: 'Extrato / Fatura' },
      { name: 'Lock', symbol: '🔒', usage: 'Sessão Elevada' }
    ]
  },
  {
    category: 'Comunicação & Mídias',
    icons: [
      { name: 'MessageSquare', symbol: '💬', usage: 'Contato WhatsApp' },
      { name: 'Mail', symbol: '✉️', usage: 'E-mail Comercial' },
      { name: 'MapPin', symbol: '📍', usage: 'Localização no Mapa' },
      { name: 'Phone', symbol: '📞', usage: 'Telefone Comercial' }
    ]
  }
];

export default function IconsLabPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(`<${name} />`);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
          <span>🎨 Design Lab</span>
          <span>•</span>
          <span>Catálogo Selecionado de Iconografia</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Iconography Suite (Lucide Catalog)
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Catálogo funcional de ícones agrupados por categoria (navegação, status, financeiro, mídias). Clique para copiar o componente.
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <input
          type="text"
          placeholder="Buscar ícone por nome ou uso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg text-sm px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Icon Groups */}
      <div className="space-y-8">
        {ICON_CATALOG.map((group) => {
          const filteredIcons = group.icons.filter(
            (ic) =>
              ic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              ic.usage.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (filteredIcons.length === 0) return null;

          return (
            <div key={group.category} className="space-y-3">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {group.category}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {filteredIcons.map((ic) => (
                  <button
                    key={ic.name}
                    onClick={() => handleCopy(ic.name)}
                    className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl flex flex-col items-center justify-center text-center space-y-2 transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{ic.symbol}</span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-white font-mono">{ic.name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{ic.usage}</div>
                    </div>
                    {copiedName === ic.name && (
                      <span className="text-[9px] text-emerald-400 font-mono">Copiado!</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
