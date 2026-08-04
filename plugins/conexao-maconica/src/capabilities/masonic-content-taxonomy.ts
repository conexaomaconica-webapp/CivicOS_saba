// Masonic Content Taxonomy Capability - Implementation details

export type ContentType = 'article' | 'event' | 'banner' | 'popup' | 'institutional';

export interface ContentCategoryData {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  content_type: ContentType;
  parent_id?: string;
}

export interface ArticleData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category_id?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  seo_title?: string;
  seo_description?: string;
}

export interface EventData {
  title: string;
  slug: string;
  description: string;
  category_id?: string;
  start_at: string;
  end_at?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  is_online: boolean;
  meeting_url?: string;
  max_attendees?: number;
  status: 'draft' | 'published' | 'cancelled';
  featured_image?: string;
}

export const CONTENT_TYPES: ContentType[] = [
  'article',
  'event',
  'banner',
  'popup',
  'institutional'
];

export const MASONIC_CONTENT_CATEGORIES = [
  { code: 'artigo_ritualistica', name: 'Ritualística', content_type: 'article' as ContentType, icon: 'book-open' },
  { code: 'artigo_simbolismo', name: 'Simbolismo', content_type: 'article' as ContentType, icon: 'sparkles' },
  { code: 'artigo_historia', name: 'História Maçônica', content_type: 'article' as ContentType, icon: 'landmark' },
  { code: 'artigo_filosofia', name: 'Filosofia', content_type: 'article' as ContentType, icon: 'brain' },
  { code: 'artigo_educacao', name: 'Educação Maçônica', content_type: 'article' as ContentType, icon: 'graduation-cap' },
  { code: 'evento_sessao', name: 'Sessões Ritualísticas', content_type: 'event' as ContentType, icon: 'calendar' },
  { code: 'evento_palestra', name: 'Palestras e Conferências', content_type: 'event' as ContentType, icon: 'mic' },
  { code: 'evento_confraternizacao', name: 'Confraternizações', content_type: 'event' as ContentType, icon: 'users' },
  { code: 'evento_beneficente', name: 'Ações Beneficentes', content_type: 'event' as ContentType, icon: 'heart-handshake' },
  { code: 'evento_formacao', name: 'Cursos e Formação', content_type: 'event' as ContentType, icon: 'book-open' },
  { code: 'inst_comunicado', name: 'Comunicados Oficiais', content_type: 'institutional' as ContentType, icon: 'megaphone' },
  { code: 'inst_edital', name: 'Editais', content_type: 'institutional' as ContentType, icon: 'file-text' },
  { code: 'inst_ata', name: 'Atas Resumidas', content_type: 'institutional' as ContentType, icon: 'clipboard-list' }
] as const;

export const MasonicContentTaxonomyAPI = {
  getContentCategories: 'masonic-content-taxonomy:getContentCategories',
  getCategoryTree: 'masonic-content-taxonomy:getCategoryTree',
  createArticle: 'masonic-content-taxonomy:createArticle',
  createEvent: 'masonic-content-taxonomy:createEvent'
} as const;

export type MasonicContentTaxonomyMethod = typeof MasonicContentTaxonomyAPI[keyof typeof MasonicContentTaxonomyAPI];