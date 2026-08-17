import type { Database, Json } from '@/types/database.types';

export type PublicBusinessPlan = 'bronze' | 'prata' | 'ouro' | null;

export type PublicMediaAsset = {
  url: string;
  alt: string;
  type: 'image' | 'video';
  crop?: {
    sourceWidth: number;
    sourceHeight: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

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

export type PublicBusinessPresentation = {
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
  } | null;
  contacts: {
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    instagram: string | null;
    facebook: string | null;
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
  benefits?: PublicBusinessBenefit[];
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

type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number] & {
  benefits?: Json;
  services?: Json;
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
): PublicBusinessPresentation {
  const locations = records(row.locations);
  const primaryLocation = locations.find((item) => item.is_headquarters === true) ?? locations[0] ?? null;
  const responsible = record(row.responsible);
  const contacts = records(row.contacts);
  const media = records(row.media)
    .map((item): PublicMediaAsset | null => {
      const url = text(item.url, 512);
      const type = text(item.media_type, 24);
      if (!url || (type !== 'image' && type !== 'video')) return null;
      return { url, type, alt: text(item.title, 180) ?? `${row.business_name} — mídia pública` };
    })
    .filter((item): item is PublicMediaAsset => item !== null);

  const contact = (kind: string) => {
    const item = contacts.find((candidate) => text(candidate.type, 40) === kind);
    return item ? text(item.value, 512) : null;
  };
  const images = media.filter((item) => item.type === 'image');
  const ownerName = responsible ? text(responsible.name, 180) : null;
  const communityVerified = responsible?.community_verified === true;

  const benefitsList = records(row.benefits)
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
    .filter((item): item is PublicBusinessBenefit => item !== null);

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
    .filter((item): item is PublicBusinessService => item !== null);

  return {
    identity: {
      slug: row.business_slug,
      name: row.business_name,
      category: row.primary_category_name,
      description: row.description,
      logo: publicAsset(row.logo_url, `Logotipo de ${row.business_name}`),
    },
    authority: {
      effectivePlan: plan(row.effective_plan_code),
      isVerified: row.is_verified === true,
      isFounder: row.is_founder === true,
      communityVerified,
    },
    media: { cover: images[0] ?? null, gallery: images.slice(1) },
    owner: ownerName ? {
      name: ownerName,
      businessRole: text(responsible?.business_role, 120),
      organization: text(responsible?.organization, 180),
      communityLabel: communityVerified ? 'Irmão' : null,
      avatar: null,
    } : null,
    contacts: {
      phone: contact('phone'),
      whatsapp: contact('whatsapp') ?? contact('phone'),
      email: contact('email'),
      instagram: contact('instagram'),
      facebook: contact('facebook'),
      website: contact('website'),
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
