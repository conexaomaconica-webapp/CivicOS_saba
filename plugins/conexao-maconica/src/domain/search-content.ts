export interface MasonicSearchWeights {
  name: number;
  description: number;
  category: number;
  tags: number;
  location: number;
  verification_status: number;
  founder_status: number;
  plan_tier: number;
  review_score: number;
  review_count: number;
}

export const DEFAULT_MASONIC_SEARCH_WEIGHTS: MasonicSearchWeights = {
  name: 10,
  description: 5,
  category: 8,
  tags: 6,
  location: 7,
  verification_status: 15,
  founder_status: 12,
  plan_tier: 8,
  review_score: 5,
  review_count: 3
};

export interface MasonicContentCategory {
  id: string;
  tenant_id: string | null;
  parent_id: string | null;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  content_type: 'article' | 'event' | 'banner' | 'popup' | 'institutional';
  created_at: string;
  updated_at: string;
}

export const CONTENT_TYPES = [
  'article',
  'event',
  'banner',
  'popup',
  'institutional'
] as const;

export type ContentType = typeof CONTENT_TYPES[number];

export const MASONIC_CONTENT_CATEGORIES = [
  // Artigos
  { code: 'artigo_ritualistica', name: 'Ritualística', content_type: 'article' as ContentType, icon: 'book-open' },
  { code: 'artigo_simbolismo', name: 'Simbolismo', content_type: 'article' as ContentType, icon: 'sparkles' },
  { code: 'artigo_historia', name: 'História Maçônica', content_type: 'article' as ContentType, icon: 'landmark' },
  { code: 'artigo_filosofia', name: 'Filosofia', content_type: 'article' as ContentType, icon: 'brain' },
  { code: 'artigo_educacao', name: 'Educação Maçônica', content_type: 'article' as ContentType, icon: 'graduation-cap' },
  
  // Eventos
  { code: 'evento_sessao', name: 'Sessões Ritualísticas', content_type: 'event' as ContentType, icon: 'calendar' },
  { code: 'evento_palestra', name: 'Palestras e Conferências', content_type: 'event' as ContentType, icon: 'mic' },
  { code: 'evento_confraternizacao', name: 'Confraternizações', content_type: 'event' as ContentType, icon: 'users' },
  { code: 'evento_beneficente', name: 'Ações Beneficentes', content_type: 'event' as ContentType, icon: 'heart-handshake' },
  { code: 'evento_formacao', name: 'Cursos e Formação', content_type: 'event' as ContentType, icon: 'book-open' },
  
  // Institucional
  { code: 'inst_comunicado', name: 'Comunicados Oficiais', content_type: 'institutional' as ContentType, icon: 'megaphone' },
  { code: 'inst_edital', name: 'Editais', content_type: 'institutional' as ContentType, icon: 'file-text' },
  { code: 'inst_ata', name: 'Atas Resumidas', content_type: 'institutional' as ContentType, icon: 'clipboard-list' }
] as const;