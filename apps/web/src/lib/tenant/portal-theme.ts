/**
 * Tema dos portais logados (Área do Membro e Portal do Anunciante): cor da Conexão por padrão, ou a cor primária
 * do tenant quando configurada. O token global --color-primary tem um azul padrão do design system e por isso não é usado.
 * Sem logo própria do tenant e com a cor da Conexão, usa a logomarca oficial, que só é legível sobre a cor primária.
 */

export const DEFAULT_PORTAL_PRIMARY = '#5d1523';
export const DEFAULT_PORTAL_ACCENT = '#C9A227';
export const DEFAULT_PORTAL_LOGO = '/logoconexao_red_vert.png';

const HEX = /^#[0-9a-f]{6}$/i;

/** Texto claro ou escuro sobre uma cor, pelo contraste (luminância relativa). */
export function readableForeground(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? '#1c1917' : '#ffffff';
}

export interface PortalBrandInput {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

export function resolvePortalTheme(brand: PortalBrandInput) {
  const primary = brand.primaryColor && HEX.test(brand.primaryColor) ? brand.primaryColor : DEFAULT_PORTAL_PRIMARY;
  const isConexaoDefault = !brand.primaryColor || brand.primaryColor.toLowerCase() === DEFAULT_PORTAL_PRIMARY;
  const onDark = !brand.logoUrl && isConexaoDefault;
  return {
    primary,
    /** Logo a exibir: a do tenant, a oficial da Conexão (sobre fundo escuro) ou nenhuma. */
    logo: brand.logoUrl || (onDark ? DEFAULT_PORTAL_LOGO : null),
    onDark,
    vars: {
      '--member-primary': primary,
      '--member-primary-fg': readableForeground(primary),
      '--member-accent': DEFAULT_PORTAL_ACCENT,
    } as Record<string, string>,
  };
}
