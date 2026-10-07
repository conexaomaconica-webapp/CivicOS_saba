/**
 * Rotas onde o GA4 NÃO deve rodar: áreas internas (admin, painel do anunciante, conta do membro) e rotas cuja URL
 * carrega um token secreto de acesso (cadastro por convite, contrato, adesão). Mandar essa URL ao Google vazaria o
 * token e misturaria o uso interno da equipe com o do público.
 * O funil público (/anunciar/passo-*, /login, /register) continua medido: não tem token na URL.
 */
const EXCLUDED_PREFIXES = [
  '/admin',
  '/master',
  '/platform',
  '/dashboard',
  '/anunciante',
  '/minha-conta',
  '/usuario',
  '/perfil',
  '/profile',
  '/diagnostics',
  '/health',
  '/api',
  '/auth',
  '/c',
  '/cadastro',
  '/contratacao',
  '/adesao',
  '/design-lab',
  '/visual-lab',
];

export function isAnalyticsExcludedPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').split('?')[0]!.split('#')[0]!;
  return EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
