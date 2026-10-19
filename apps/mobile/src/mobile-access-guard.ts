import { evaluateMobileMemberAccess, type MobileAccessContext, type MobileAccessDecision } from './member-access';

export type MobileSurface = 'home' | 'guia' | 'beneficios' | 'empresas' | 'lojas' | 'mais' | 'favoritos' | 'indicacoes' | 'conexoes' | 'mural' | 'perfil';

const PUBLIC_SURFACES: ReadonlySet<MobileSurface> = new Set(['home', 'guia', 'beneficios', 'empresas', 'lojas']);

export interface MobileGuardDecision extends MobileAccessDecision {
  readonly surface: MobileSurface;
  readonly publicSurface: boolean;
  readonly authorizationStatus: 'authorized' | 'denied' | 'indeterminate';
}

export type MobileGuardVerification = 'verified' | 'unavailable';

/**
 * Navigation is only a presentation concern. Every protected operation must
 * call this guard again with a freshly resolved backend context.
 */
export function guardMobileSurface(
  surface: MobileSurface,
  context: MobileAccessContext | null,
  verification: MobileGuardVerification = 'verified',
): MobileGuardDecision {
  const publicSurface = PUBLIC_SURFACES.has(surface);
  if (publicSurface) return { surface, publicSurface, allowed: true, reason: 'allowed', authorizationStatus: 'authorized' };
  if (verification === 'unavailable') {
    return { surface, publicSurface, allowed: false, reason: 'profile-inactive', authorizationStatus: 'indeterminate' };
  }
  if (!context) return { surface, publicSurface, allowed: false, reason: 'unauthenticated', authorizationStatus: 'denied' };
  const decision = evaluateMobileMemberAccess(context);
  return { surface, publicSurface, ...decision, authorizationStatus: decision.allowed ? 'authorized' : 'denied' };
}

export function isPublicMobileSurface(surface: MobileSurface): boolean {
  return PUBLIC_SURFACES.has(surface);
}
