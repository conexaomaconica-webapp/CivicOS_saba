/**
 * Cabeçalho de identidade das páginas públicas de convite: faixa na cor primária do tenant com a logomarca centralizada.
 * Sem dependências de servidor: a página (servidor) resolve a marca e passa por props.
 */
type Props = {
  /** Logomarca já resolvida para esta cor (tenant ou oficial da Conexão). */
  logoSrc: string | null;
  brandName: string;
  primaryColor: string;
};

export function InviteBrandHeader({ logoSrc, brandName, primaryColor }: Props) {
  return (
    <header
      className="flex w-full items-center justify-center border-b-4 border-[#C9A227] px-4 py-6 sm:py-8"
      style={{ background: primaryColor }}
    >
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoSrc} alt={brandName} className="h-auto max-h-24 w-full max-w-[380px] object-contain sm:max-h-28" />
      ) : (
        <span className="font-serif text-2xl font-bold tracking-wide text-white">{brandName}</span>
      )}
    </header>
  );
}
