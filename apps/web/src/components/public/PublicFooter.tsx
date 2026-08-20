import Link from 'next/link';
import Image from 'next/image';

export function PublicFooter() {
  return (
    <footer className="bg-[#140305] border-t border-[#4B161B] text-slate-300 pt-10 pb-24 md:pb-10 relative z-20">
      <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Direitos e Segurança */}
        <div className="flex flex-col items-center md:items-start text-xs space-y-2">
          <Image 
            src="/logoconexao_red_vert.png" 
            alt="Conexão Maçônica" 
            width={140} 
            height={50} 
            className="h-12 w-auto object-contain mb-1 opacity-90" 
          />
          <div>
            <p className="text-slate-400">Todos os direitos reservados.</p>
          </div>
          <div className="flex items-center gap-2 text-slate-500 pt-1">
            <span>Ambiente 100% Seguro</span>
            <span>•</span>
            <span>Rede Verificada</span>
          </div>
        </div>

        {/* Links Legais */}
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/termos" className="text-slate-300 hover:text-[#C9A227] transition-colors duration-200">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="text-slate-300 hover:text-[#C9A227] transition-colors duration-200">
            Privacidade e LGPD
          </Link>
        </div>

        {/* Assinatura Saba Studio */}
        <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto pt-6 md:pt-0 border-t border-[#4B161B]/50 md:border-none md:pr-20 lg:pr-12">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Desenvolvido por</span>
          <a href="https://sabastudioblog.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 opacity-60 transition-opacity duration-300">
            <Image 
              src="/logosabastudio.svg" 
              alt="Saba Studio" 
              width={150} 
              height={40} 
              className="h-8 w-auto brightness-0 invert" 
            />
          </a>
        </div>

      </div>
    </footer>
  );
}
