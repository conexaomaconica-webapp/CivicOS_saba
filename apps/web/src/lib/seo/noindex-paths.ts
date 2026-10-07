/**
 * Rotas que funcionam normalmente para o usuário, mas não devem entrar no índice do Google (funil de cadastro do
 * anunciante e pesquisas institucionais). O middleware envia X-Robots-Tag nelas, inclusive nas respostas de redirect,
 * que não carregam <meta robots>. As páginas também declaram robots na Metadata API (camada dupla).
 */
export function isNoIndexFollowPath(pathname: string): boolean {
  return (
    pathname === '/anunciar' ||
    pathname.startsWith('/anunciar/') ||
    pathname === '/pesquisa' ||
    pathname.startsWith('/pesquisa/') ||
    pathname === '/pesquisas' ||
    pathname.startsWith('/pesquisas/')
  );
}
