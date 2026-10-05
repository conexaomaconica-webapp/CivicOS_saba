export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'rating'
  | 'boolean'
  | 'date';

export type SurveyStatus = 'draft' | 'published' | 'archived';

export interface ConditionalRule {
  depends_on_question_id: string;
  expected_values: string[];
}

export interface SurveyOption {
  id: string;
  question_id: string;
  label: string;
  value: string;
  order_index: number;
  is_active: boolean;
  created_at?: string;
}

export interface SurveyQuestion {
  id: string;
  block_id: string;
  question_text: string;
  help_text?: string | null;
  question_type: QuestionType;
  order_index: number;
  is_required: boolean;
  is_active: boolean;
  allow_other: boolean;
  conditional_rules?: ConditionalRule | null;
  options?: SurveyOption[];
  created_at?: string;
  updated_at?: string;
}

export interface SurveyBlock {
  id: string;
  survey_id: string;
  title: string;
  description?: string | null;
  order_index: number;
  is_active: boolean;
  questions?: SurveyQuestion[];
  created_at?: string;
  updated_at?: string;
}

export interface SurveyVersion {
  id: string;
  survey_id: string;
  version_number: number;
  status: SurveyStatus;
  schema_snapshot: Record<string, any>;
  published_at?: string | null;
  created_at?: string;
}

export interface Survey {
  id: string;
  tenant_id?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  show_logo?: boolean;
  header_color?: string;
  banner_url?: string | null;
  logo_size?: 'small' | 'medium' | 'large' | 'full';
  logo_position?: 'left' | 'center' | 'right';
  response_count?: number;
  status: SurveyStatus;
  current_version: number;
  created_by?: string | null;
  blocks?: SurveyBlock[];
  created_at?: string;
  updated_at?: string;
}

export interface SurveyResponseSubmission {
  survey_id: string;
  version_number: number;
  user_id?: string;
  business_id?: string;
  respondent_email?: string;
  respondent_name?: string;
  consent_research?: boolean;
  consent_commercial?: boolean;
  answers: Array<{
    question_id: string;
    answer_value?: string;
    selected_options?: string[];
    other_text?: string;
  }>;
}

export interface SurveyAnalyticsSummary {
  survey_id: string;
  total_responses: number;
  version_number: number;
  /** Respostas por dia (YYYY-MM-DD, fuso America/Sao_Paulo), em ordem crescente. */
  responses_by_day?: Array<{ date: string; count: number }>;
  consent_research_count?: number;
  consent_commercial_count?: number;
  first_response_at?: string | null;
  last_response_at?: string | null;
  /** Respostas por versão da pesquisa. */
  responses_by_version?: Array<{ version_number: number; count: number }>;
  block_summaries: Array<{
    block_id: string;
    title: string;
    question_summaries: Array<{
      question_id: string;
      question_text: string;
      question_type: QuestionType;
      total_answers: number;
      /** Rótulos legíveis das opções (value -> label). */
      option_labels?: Record<string, string>;
      option_counts?: Record<string, number>;
      text_samples?: string[];
      average_rating?: number;
    }>;
  }>;
}
