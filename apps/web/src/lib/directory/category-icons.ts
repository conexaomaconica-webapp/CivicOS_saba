import {
  Award, Briefcase, Building2, Car, Compass, Globe, Hand, Heart, Home,
  Landmark, Palette, Phone, Scale, ShieldCheck, ShoppingBasket, Sparkles,
  Star, Stethoscope, Store, Tag, Utensils, Wrench, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'briefcase', label: 'Negócios', icon: Briefcase },
  { value: 'building', label: 'Empresas', icon: Building2 },
  { value: 'servicos', label: 'Serviços', icon: Wrench },
  { value: 'store', label: 'Comércio', icon: Store },
  { value: 'shopping', label: 'Compras', icon: ShoppingBasket },
  { value: 'saude', label: 'Saúde', icon: Stethoscope },
  { value: 'juridico', label: 'Jurídico', icon: Scale },
  { value: 'utensils', label: 'Alimentação', icon: Utensils },
  { value: 'home', label: 'Casa e imóveis', icon: Home },
  { value: 'car', label: 'Automotivo', icon: Car },
  { value: 'phone', label: 'Tecnologia', icon: Phone },
  { value: 'palette', label: 'Arte e cultura', icon: Palette },
  { value: 'heart', label: 'Bem-estar', icon: Heart },
  { value: 'hand', label: 'Atendimento', icon: Hand },
  { value: 'landmark', label: 'Institucional', icon: Landmark },
  { value: 'globe', label: 'Turismo', icon: Globe },
  { value: 'compass', label: 'Localização', icon: Compass },
  { value: 'shield', label: 'Segurança', icon: ShieldCheck },
  { value: 'award', label: 'Especialistas', icon: Award },
  { value: 'star', label: 'Destaques', icon: Star },
  { value: 'sparkles', label: 'Beleza', icon: Sparkles },
  { value: 'tag', label: 'Outros', icon: Tag },
];

const CATEGORY_ICON_MAP = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((option) => [option.value, option.icon]),
) as Record<string, LucideIcon>;

// Compatibilidade com valores historicos ja persistidos.
CATEGORY_ICON_MAP.stethoscope = Stethoscope;
CATEGORY_ICON_MAP.wrench = Wrench;
CATEGORY_ICON_MAP.scale = Scale;

export function resolveCategoryIcon(value: string | null | undefined): LucideIcon {
  return CATEGORY_ICON_MAP[(value || '').toLowerCase().trim()] || Briefcase;
}

export function isCategoryIcon(value: string): boolean {
  return Boolean(CATEGORY_ICON_MAP[value]);
}

export function normalizeCategoryIcon(value: string | null | undefined): string {
  const normalized = (value || '').toLowerCase().trim();
  if (normalized === 'stethoscope') return 'saude';
  if (normalized === 'wrench') return 'servicos';
  if (normalized === 'scale') return 'juridico';
  return isCategoryIcon(normalized) ? normalized : 'briefcase';
}
