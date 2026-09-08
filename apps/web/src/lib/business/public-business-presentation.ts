import type { Database, Json } from '@/types/database.types';

export type PublicBusinessPlan = 'bronze' | 'prata' | 'ouro' | null;
export type PublicBusinessTemplate = 'bronze' | 'prata' | 'ouro';
export type PublicCommercialPlan = 'bronze' | 'prata' | 'ouro';

export type PublicMediaAsset = {
  url: string;
  alt: string;
  type: 'image' | 'video';
  focalPosition?: {
    x: number;
    y: number;
  };
  objectPosition?: string;
  crop?: {
    sourceWidth: number;
    sourceHeight: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export function getObjectPosition(asset?: PublicMediaAsset | null): string | undefined {
  if (!asset) return undefined;
  if (asset.objectPosition) return asset.objectPosition;
  if (asset.focalPosition && typeof asset.focalPosition.x === 'number' && typeof asset.focalPosition.y === 'number') {
    return `${asset.focalPosition.x}% ${asset.focalPosition.y}%`;
  }
  return undefined;
}

export type PublicBusinessReview = {
  id: string;
  rating: number;
  comment: string | null;
  publishedAt: string | null;
  authorName?: string | null;
  authorAvatar?: PublicMediaAsset | null;
};

export type PublicBusinessService = {
  id?: string;
  name: string;
  description?: string | null;
  iconName?: string | null;
  priceInfo?: string | null;
};

export type PublicBusinessBenefit = {
  id?: string;
  title: string;
  description: string;
  benefitType?: string | null;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  discountCode?: string | null;
  badgeText?: string | null;
  redeemInstructions?: string | null;
  validUntil?: string | null;
};

export type PublicBusinessEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
};

export type PublicBusinessPost = {
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
};

import type { InstitutionalRecognitionDTO } from '@/app/actions/institutional-recognitions';

export type PublicBusinessPresentation = {
  plan: {
    commercialPlan: PublicCommercialPlan;
    template: PublicBusinessTemplate;
  };
  entitlements: {
    maxPhotos: number;
    maxServices: number;
    maxEvents: number;
    maxPosts: number;
    maxBenefits: number;
    canShowBenefits: boolean;
    canShowEvents: boolean;
    canShowPosts: boolean;
    canShowWebsite: boolean;
    canShowSocialLinks: boolean;
  };
  recognition: {
    verified: boolean;
    founder: boolean;
    pedraFundamental: boolean;
    colunaDeHonra: boolean;
    goldPlanBadge?: boolean;
    catalog?: InstitutionalRecognitionDTO[];
  };
  identity: {
    slug: string;
    name: string;
    category: string | null;
    description: string | null;
    logo: PublicMediaAsset | null;
  };
  authority: {
    effectivePlan: PublicBusinessPlan;
    isVerified: boolean;
    isFounder: boolean;
    communityVerified: boolean;
    isPedraFundamental?: boolean;
    isColunaDeHonra?: boolean;
  };
  media: {
    cover: PublicMediaAsset | null;
    gallery: PublicMediaAsset[];
  };
  owner: {
    name: string;
    businessRole: string | null;
    organization: string | null;
    communityLabel: string | null;
    avatar: PublicMediaAsset | null;
    endorsedByCount?: number;
    endorserAvatars?: string[];
  } | null;
  contacts: {
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    instagram: string | null;
    facebook: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    website: string | null;
  };
  location: {
    address: string;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
    mapImage: PublicMediaAsset | null;
  } | null;
  hours: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>;
  services: PublicBusinessService[];
  benefit: PublicBusinessBenefit | null;
  benefits: PublicBusinessBenefit[];
  events: PublicBusinessEvent[];
  posts: PublicBusinessPost[];
  reviews: {
    average: number | null;
    count: number;
    items: PublicBusinessReview[];
  };
  metrics: {
    views: number | null;
    openingStatus: string | null;
  };
};

export function resolveBusinessProfileTemplate(
  planCode: string | null | undefined
): PublicBusinessTemplate {
  if (!planCode) return 'bronze';
  const normalized = planCode.toLowerCase().trim();
  switch (normalized) {
    case 'ouro_founder':
    case 'ouro':
      return 'ouro';
    case 'prata':
      return 'prata';
    case 'bronze':
    default:
      return 'bronze';
  }
}

type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number] & {
  benefits?: Json;
  services?: Json;
  events?: Json;
  posts?: Json;
  is_pedra_fundamental?: boolean;
  is_coluna_honra?: boolean;
  entitlements?: Record<string, number | boolean>;
};
type ReviewRow = Database['public']['Functions']['public_business_reviews']['Returns'][number];

function records(value: Json | undefined): Record<string, Json>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, Json> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : [];
}

function record(value: Json | undefined): Record<string, Json> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, Json>
    : null;
}

function text(value: Json | undefined, maxLength = 1000): string | null {
  if (typeof value !== 'string') return null;
  const safe = value.trim();
  return safe && safe.length <= maxLength ? safe : null;
}

function numeric(value: Json | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function plan(value: string | null): PublicBusinessPlan {
  return value === 'bronze' || value === 'prata' || value === 'ouro' ? value : null;
}

function publicAsset(url: string | null, alt: string, type: 'image' | 'video' = 'image'): PublicMediaAsset | null {
  return url ? { url, alt, type } : null;
}

function addressOf(location: Record<string, Json>): string | null {
  const line = ['street', 'number', 'complement', 'neighborhood', 'city', 'state', 'postal_code']
    .map((key) => text(location[key], 160))
    .filter(Boolean)
    .join(', ');
  return line || null;
}

export function toPublicBusinessPresentation(
  row: DetailRow,
  reviewRows: ReviewRow[] = [],
  recognitionsCatalog?: InstitutionalRecognitionDTO[]
): PublicBusinessPresentation {
  const rawPlanCode = row.effective_plan_code || 'bronze';
  const template = resolveBusinessProfileTemplate(rawPlanCode);
  
  const isLegacyOuroFounder = rawPlanCode === 'ouro_founder';
  const commercialPlan: PublicCommercialPlan =
    isLegacyOuroFounder || rawPlanCode === 'ouro' ? 'ouro' : (plan(rawPlanCode) || 'bronze');

  // Fail-closed defaults: se entitlements não vier, assumir 0/false.
  // A camada de apresentação NÃO deve ser uma segunda tabela de planos.
  const customEntitlements = row.entitlements || {};

  const maxPhotos = typeof customEntitlements.gallery_photos_limit === 'number'
    ? customEntitlements.gallery_photos_limit
    : 0;
  const maxServices = typeof customEntitlements.services_limit === 'number'
    ? customEntitlements.services_limit
    : 0;
  const maxBenefits = typeof customEntitlements.benefits_limit === 'number'
    ? customEntitlements.benefits_limit
    : 0;
  const maxEvents = typeof customEntitlements.events_limit === 'number'
    ? customEntitlements.events_limit
    : 0;
  const maxPosts = typeof customEntitlements.posts_limit === 'number'
    ? customEntitlements.posts_limit
    : 0;

  const canShowBenefits = maxBenefits > 0;
  const canShowEvents = maxEvents > 0;
  const canShowPosts = maxPosts > 0;
  const canShowWebsite = typeof customEntitlements.can_show_website === 'boolean'
    ? customEntitlements.can_show_website
    : false;
  const canShowSocialLinks = typeof customEntitlements.can_show_social === 'boolean'
    ? customEntitlements.can_show_social
    : false;

  // Recognitions
  const verified = row.is_verified === true || (row as any).isVerified === true;
  const founder = row.is_founder === true || (row as any).isFounder === true || rawPlanCode === 'ouro_founder';
  const pedraFundamental = Boolean(row.is_pedra_fundamental || (row as any).isPedraFundamental);
  const colunaDeHonra = Boolean(row.is_coluna_honra || (row as any).isColunaHonra);

  const locations = records(row.locations);
  const primaryLocation = locations.find((item) => item.is_headquarters === true) ?? locations[0] ?? null;
  const responsible = record(row.responsible);
  const contacts = records(row.contacts);

  const rawMedia = records(row.media)
    .map((item): PublicMediaAsset | null => {
      const url = text(item.url, 512);
      const type = text(item.media_type, 24);
      if (!url || (type !== 'image' && type !== 'video')) return null;
      const focal = (item as any).focal_position || (item as any).focalPosition;
      const objPos = text((item as any).object_position || (item as any).objectPosition, 60);
      return {
        url,
        type,
        alt: text(item.title, 180) ?? `${row.business_name} — mídia pública`,
        focalPosition: typeof focal === 'object' && focal !== null
          ? { x: Number(focal.x) || 50, y: Number(focal.y) || 50 }
          : undefined,
        objectPosition: objPos ?? undefined,
      };
    })
    .filter((item): item is PublicMediaAsset => item !== null);

  const contact = (kind: string) => {
    const item = contacts.find((candidate) => text(candidate.type, 40) === kind);
    return item ? text(item.value, 512) : null;
  };

  const images = rawMedia.filter((item) => item.type === 'image');
  const cover = images[0] ?? null;
  // Apply maxPhotos entitlement limit to gallery
  const gallery = images.slice(1, maxPhotos + 1);

  const ownerName = responsible ? text(responsible.name, 180) : null;
  const communityVerified = responsible?.community_verified === true;

  // Benefits (sliced by entitlement)
  const benefitsList = canShowBenefits
    ? records(row.benefits)
        .map((item): PublicBusinessBenefit | null => {
          const title = text(item.title, 140);
          const description = text(item.description, 2000);
          if (!title || !description) return null;
          return {
            id: text(item.id, 64) ?? undefined,
            title,
            description,
            benefitType: text(item.benefit_type, 40),
            discountPercentage: numeric(item.discount_percentage),
            discountAmount: numeric(item.discount_amount),
            discountCode: text(item.discount_code, 50),
            badgeText: text(item.badge_text, 40),
            redeemInstructions: text(item.redeem_instructions, 1000),
            validUntil: text(item.valid_until, 64),
          };
        })
        .filter((item): item is PublicBusinessBenefit => item !== null)
        .slice(0, maxBenefits)
    : [];

  // Services (sliced by entitlement)
  const servicesList = records(row.services)
    .map((item): PublicBusinessService | null => {
      const name = text(item.name, 120);
      if (!name) return null;
      return {
        id: text(item.id, 64) ?? undefined,
        name,
        description: text(item.description, 1000),
        iconName: text(item.icon_name, 50),
        priceInfo: text(item.price_info, 80),
      };
    })
    .filter((item): item is PublicBusinessService => item !== null)
    .slice(0, maxServices);

  // Events (sliced by entitlement)
  const eventsList = canShowEvents
    ? records(row.events)
        .map((item): PublicBusinessEvent | null => {
          const title = text(item.title, 140);
          if (!title) return null;
          return {
            id: text(item.id, 64) ?? `evt-${Math.random()}`,
            title,
            description: text(item.description, 2000),
            startDate: text(item.start_date, 64),
            endDate: text(item.end_date, 64),
            location: text(item.location, 180),
            imageUrl: text(item.image_url, 512),
            externalUrl: text(item.external_url, 512),
          };
        })
        .filter((item): item is PublicBusinessEvent => item !== null)
        .slice(0, maxEvents)
    : [];

  // Posts (sliced by entitlement)
  const postsList = canShowPosts
    ? records(row.posts)
        .map((item): PublicBusinessPost | null => {
          const title = text(item.title, 140);
          if (!title) return null;
          return {
            id: text(item.id, 64) ?? `post-${Math.random()}`,
            title,
            content: text(item.content, 4000),
            summary: text(item.summary, 500),
            publishedAt: text(item.published_at, 64),
            imageUrl: text(item.image_url, 512),
          };
        })
        .filter((item): item is PublicBusinessPost => item !== null)
        .slice(0, maxPosts)
    : [];

  return {
    plan: {
      commercialPlan,
      template,
    },
    entitlements: {
      maxPhotos,
      maxServices,
      maxEvents,
      maxPosts,
      maxBenefits,
      canShowBenefits,
      canShowEvents,
      canShowPosts,
      canShowWebsite,
      canShowSocialLinks,
    },
    recognition: {
      verified,
      founder,
      pedraFundamental,
      colunaDeHonra,
      goldPlanBadge: (row.effective_plan_code || (row as any).plan_code || '').toLowerCase() === 'ouro',
      catalog: recognitionsCatalog || (row as any).recognitionsCatalog,
    },
    identity: {
      slug: row.business_slug,
      name: row.business_name,
      category: row.primary_category_name,
      description: row.description,
      logo: publicAsset(row.logo_url, `Logotipo de ${row.business_name}`),
    },
    authority: {
      effectivePlan: plan(row.effective_plan_code),
      isVerified: verified,
      isFounder: founder,
      communityVerified,
      isPedraFundamental: pedraFundamental,
      isColunaDeHonra: colunaDeHonra,
    },
    media: { cover, gallery },
    owner: (ownerName || commercialPlan === 'ouro' || (responsible && responsible.name) || row.business_name) ? {
      name: text(responsible?.name, 180) || ownerName || text((row as any).owner_name, 180) || row.business_name || 'Anunciante Titular',
      businessRole: text(responsible?.business_role, 120) || 'Proprietário',
      organization: text(responsible?.organization, 180)
        || text((row as any).organization, 180)
        || text((row as any).lodge_name, 180)
        || text((row as any).masonic_lodge, 180)
        || null,
      communityLabel: (() => {
        const raw = text(responsible?.community_label, 80) || text((row as any).community_label, 80) || 'Ir.\'.';
        if (raw === 'Irmão' || raw === 'Ir.' || raw === 'Ir.\'.') return 'Ir.\'.';
        if (raw.toLowerCase().includes('cunhada')) return 'Cunhada';
        return raw;
      })(),
      avatar: publicAsset(
        text(responsible?.avatar_url, 2048) || text((row as any).avatar_url, 2048) || text((row as any).owner_avatar_url, 2048),
        `Foto do responsável`
      ),

      endorsedByCount: typeof (row as any).recommendations_count === 'number'
        ? (row as any).recommendations_count
        : typeof (row as any).endorsement_count === 'number'
          ? (row as any).endorsement_count
          : 0,
      endorserAvatars: Array.isArray((row as any).endorser_avatars) ? (row as any).endorser_avatars : [],
    } : null,

    contacts: {
      phone: contact('phone'),
      whatsapp: contact('whatsapp') ?? contact('phone'),
      email: contact('email'),
      instagram: canShowSocialLinks ? contact('instagram') : null,
      facebook: canShowSocialLinks ? contact('facebook') : null,
      linkedin: canShowSocialLinks ? contact('linkedin') : null,
      youtube: canShowSocialLinks ? contact('youtube') : null,
      website: canShowWebsite ? contact('website') : null,
    },
    location: primaryLocation && addressOf(primaryLocation) ? {
      address: addressOf(primaryLocation)!,
      city: text(primaryLocation.city, 120),
      state: text(primaryLocation.state, 8),
      latitude: numeric(primaryLocation.latitude),
      longitude: numeric(primaryLocation.longitude),
      mapImage: null,
    } : null,
    hours: records(row.business_hours).map((item) => ({
      dayOfWeek: numeric(item.day_of_week) ?? 0,
      openTime: text(item.open_time, 16),
      closeTime: text(item.close_time, 16),
      isClosed: item.is_closed === true,
    })),
    services: servicesList,
    benefit: benefitsList[0] ?? null,
    benefits: benefitsList,
    events: eventsList,
    posts: postsList,
    reviews: {
      average: row.rating_average,
      count: row.rating_count,
      items: reviewRows.map((review) => ({
        id: review.review_public_id,
        rating: review.rating,
        comment: review.comment,
        publishedAt: review.published_at,
      })),
    },
    metrics: { views: null, openingStatus: null },
  };
}

