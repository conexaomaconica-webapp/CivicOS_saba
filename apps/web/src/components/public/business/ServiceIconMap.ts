import {
  Briefcase,
  CheckCircle2,
  Award,
  Clock,
  Star,
  Shield,
  Zap,
  Wrench,
  HeartPulse,
  Scale,
  Sparkles,
  Truck,
  Gift,
  Building,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';

const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  check: CheckCircle2,
  award: Award,
  clock: Clock,
  star: Star,
  shield: Shield,
  zap: Zap,
  wrench: Wrench,
  health: HeartPulse,
  scale: Scale,
  sparkles: Sparkles,
  truck: Truck,
  gift: Gift,
  building: Building,
  dollar: DollarSign,
};

export function resolveServiceIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Briefcase;
  const key = iconName.toLowerCase().trim();
  return SERVICE_ICON_MAP[key] ?? Briefcase;
}
