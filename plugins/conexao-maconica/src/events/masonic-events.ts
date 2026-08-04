// Masonic Events - Event definitions for the plugin

export const masonicEvents = {
  // Organization events
  'organization.created': {
    description: 'Organização maçônica criada',
    payload: {
      organization_id: 'string (uuid)',
      name: 'string',
      potency: 'string',
      created_by: 'string (uuid)'
    }
  },
  
  'organization.updated': {
    description: 'Organização maçônica atualizada',
    payload: {
      organization_id: 'string (uuid)',
      changes: 'Record<string, unknown>',
      updated_by: 'string (uuid)'
    }
  },

  'organization_person.added': {
    description: 'Pessoa adicionada à organização',
    payload: {
      person_id: 'string (uuid)',
      organization_id: 'string (uuid)',
      role_in_org: 'string',
      added_by: 'string (uuid)'
    }
  },

  // Credential events
  'credential.requested': {
    description: 'Credencial solicitada',
    payload: {
      issuance_id: 'string (uuid)',
      credential_type_id: 'string (uuid)',
      requested_by: 'string (uuid)',
      target_type: 'business | organization',
      target_id: 'string (uuid)'
    }
  },

  'credential.verified': {
    description: 'Credencial verificada (aprovada/rejeitada)',
    payload: {
      issuance_id: 'string (uuid)',
      status: 'verified | rejected',
      verified_by: 'string (uuid)'
    }
  },

  'credential.evidence_uploaded': {
    description: 'Evidência anexada à credencial',
    payload: {
      evidence_id: 'string (uuid)',
      issuance_id: 'string (uuid)',
      evidence_type: 'string',
      uploaded_by: 'string (uuid)'
    }
  },

  'credential.expired': {
    description: 'Credencial expirada',
    payload: {
      issuance_id: 'string (uuid)',
      credential_type_id: 'string (uuid)',
      target_type: 'business | organization',
      target_id: 'string (uuid)'
    }
  },

  // Founder events
  'founder.qualified': {
    description: 'Empresa qualificada como fundadora',
    payload: {
      qualification: {
        id: 'string (uuid)',
        business_id: 'string (uuid)',
        founder_number: 'number',
        qualified_by: 'string (uuid)'
      }
    }
  },

  'founder.revoked': {
    description: 'Qualificação de fundador revogada',
    payload: {
      qualification: {
        id: 'string (uuid)',
        business_id: 'string (uuid)',
        founder_number: 'number'
      },
      reason: 'string (optional)'
    }
  },

  // Business extensions events
  'business.highlight_created': {
    description: 'Destaque de listagem criado',
    payload: {
      highlight_id: 'string (uuid)',
      business_id: 'string (uuid)',
      highlight_type: 'home_carousel | category_top | search_boost',
      start_at: 'string (datetime)',
      end_at: 'string (datetime)'
    }
  },

  'business.sponsorship_created': {
    description: 'Patrocínio criado',
    payload: {
      sponsorship_id: 'string (uuid)',
      business_id: 'string (uuid)',
      sponsor_scope: 'portal_global | category | event_channel',
      scope_target_id: 'string (uuid) | null'
    }
  },

  // Search events
  'masonic.search.performed': {
    description: 'Busca maçônica realizada',
    payload: {
      query: 'string (optional)',
      filters: 'Record<string, unknown>',
      results_count: 'number',
      performed_by: 'string (uuid) | null',
      session_id: 'string (optional)'
    }
  },

  // Content events
  'masonic.content.published': {
    description: 'Conteúdo maçônico publicado',
    payload: {
      content_type: 'article | event | banner | popup',
      content_id: 'string (uuid)',
      category_id: 'string (uuid) | null',
      published_by: 'string (uuid)'
    }
  }
} as const;

export type MasonicEventMap = typeof masonicEvents;
export type MasonicEventName = keyof MasonicEventMap;
export type MasonicEventPayload<T extends MasonicEventName> = MasonicEventMap[T]['payload'];

export const MASONIC_EVENT_NAMES = Object.keys(masonicEvents) as MasonicEventName[];