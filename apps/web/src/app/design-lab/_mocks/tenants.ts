import { MockTenant } from '../_types/design-lab';

export const MOCK_TENANTS: MockTenant[] = [
  {
    id: 'ten_conexao_maconica',
    name: 'Conexão Maçônica',
    slug: 'conexao-maconica',
    themePreset: 'conexao-maconica',
    primaryColor: '#4A0E1A', // Bordô Profundo
    accentColor: '#C9A227', // Dourado de Insígnia
    surfaceColor: '#F3EEDD', // Marfim (papel claro)
    isOfficial: true,
    labelBadge: 'Vertical Oficial'
  },
  {
    id: 'ten_civicos_neutro',
    name: 'CivicOS Neutro',
    slug: 'civicos-neutro',
    themePreset: 'civicos-neutro',
    primaryColor: '#0F172A', // Neutral Slate
    accentColor: '#2563EB', // Electric Blue
    surfaceColor: '#18181B', // Dark Zinc
    isOfficial: true,
    labelBadge: 'Base Neutra White Label'
  },
  {
    id: 'ten_community_blue',
    name: 'Community Blue Concept',
    slug: 'community-blue',
    themePreset: 'community-blue-concept',
    primaryColor: '#0284C7', // Royal Cyan / Blue
    accentColor: '#F59E0B', // Amber Gold
    surfaceColor: '#0C4A6E', // Deep Sky Dark
    isOfficial: false,
    labelBadge: 'Conceito Não Oficial (Ex: Rotary)'
  },
  {
    id: 'ten_community_gold',
    name: 'Community Gold Concept',
    slug: 'community-gold',
    themePreset: 'community-gold-concept',
    primaryColor: '#B45309', // Noble Gold / Ochre
    accentColor: '#0D9488', // Teal Accent
    surfaceColor: '#451A03', // Deep Warm Amber Dark
    isOfficial: false,
    labelBadge: 'Conceito Não Oficial (Ex: Lions)'
  }
];
