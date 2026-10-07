import { appUrl } from '@/lib/seo/app-url';

/**
 * SEO da página pública da empresa: título, descrição e JSON-LD gerados a partir dos dados reais do cadastro.
 * Funções puras (sem I/O) para serem testadas; a página só junta os dados e chama estas funções.
 */

export type BusinessSeoOverrides = {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_og_image_url?: string | null;
  seo_indexable?: boolean | null;
};

export type BusinessSeoInput = {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
};

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/** Corta sem partir palavra e sem deixar pontuação solta no fim. */
export function truncateAtWord(text: string, max: number): string {
  const value = clean(text);
  if (value.length <= max) return value;
  const slice = value.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[\s,;:.\-–—]+$/, '')}…`;
}

function place(city: string | null, state: string | null): string {
  const c = clean(city);
  const s = clean(state).toUpperCase();
  if (c && s) return `${c} - ${s}`;
  return c || s;
}

/** "Nome | Categoria em Cidade - UF"; se passar de 60 caracteres, descarta partes menos importantes. */
export function buildBusinessTitle(input: BusinessSeoInput, overrides?: BusinessSeoOverrides | null): string {
  const manual = clean(overrides?.seo_title);
  if (manual) return manual;

  const name = clean(input.name);
  const category = clean(input.category);
  const where = place(input.city, input.state);

  const candidates = [
    category && where ? `${name} | ${category} em ${where}` : '',
    category && input.city ? `${name} | ${category} em ${clean(input.city)}` : '',
    where ? `${name} | ${where}` : '',
    category ? `${name} | ${category}` : '',
    name,
  ].filter(Boolean);

  return candidates.find((candidate) => candidate.length <= TITLE_MAX) ?? truncateAtWord(name, TITLE_MAX);
}

/** Texto natural (não é concatenação de campos). Usa a descrição da empresa quando existe. */
export function buildBusinessDescription(input: BusinessSeoInput, overrides?: BusinessSeoOverrides | null): string {
  const manual = clean(overrides?.seo_description);
  if (manual) return truncateAtWord(manual, DESCRIPTION_MAX);

  const own = clean(input.description);
  if (own.length >= 50) return truncateAtWord(own, DESCRIPTION_MAX);

  const name = clean(input.name);
  const where = clean(input.city) ? ` em ${place(input.city, input.state)}` : '';
  const category = clean(input.category);
  const lead = category ? `${name}: ${category.toLowerCase()}${where}.` : `Conheça ${name}${where}.`;
  return truncateAtWord(
    `${lead} Veja serviços, localização, contatos, fotos e ofertas no Conexão Maçônica.`,
    DESCRIPTION_MAX
  );
}

/** Indexável por padrão; só fica fora quando o admin desmarcou explicitamente. */
export function isBusinessIndexable(overrides?: BusinessSeoOverrides | null): boolean {
  return overrides?.seo_indexable !== false;
}

export function businessCanonicalUrl(slug: string): string {
  return appUrl(`/guia/${slug}`);
}

/** Subtipo Schema.org mais específico para a categoria; sem correspondência clara, LocalBusiness. */
const SCHEMA_TYPE_BY_KEYWORD: Array<[RegExp, string]> = [
  [/restaurante|pizzaria|churrascaria|lanchonete|hamburgueria/i, 'Restaurant'],
  [/cafeteria|café|padaria|confeitaria/i, 'Bakery'],
  [/bar\b|pub\b|choperia/i, 'BarOrPub'],
  [/dentista|odonto/i, 'Dentist'],
  [/advogad|advocacia|jur[ií]dic/i, 'LegalService'],
  [/contab|contador/i, 'AccountingService'],
  [/im[óo]ve|imobili/i, 'RealEstateAgent'],
  [/oficina|mec[âa]nic|auto\s?(el[ée]trica|pe[çc]as)/i, 'AutoRepair'],
  [/farm[áa]cia|drogaria/i, 'Pharmacy'],
  [/academia|fitness|crossfit/i, 'ExerciseGym'],
  [/hotel|pousada/i, 'LodgingBusiness'],
  [/sal[ãa]o|barbearia|est[ée]tica|beleza/i, 'BeautySalon'],
  [/[óo]p?tica/i, 'Store'],
  [/loja|com[ée]rcio|mercado|supermercado/i, 'Store'],
  [/cl[íi]nica|m[ée]dic|psic[óo]log|fisioterap|sa[úu]de/i, 'MedicalBusiness'],
  [/engenharia|arquitet|consultoria|marketing|tecnologia|servi[çc]os?/i, 'ProfessionalService'],
];

export function schemaTypeForCategory(category: string | null | undefined): string {
  const value = clean(category);
  if (!value) return 'LocalBusiness';
  return SCHEMA_TYPE_BY_KEYWORD.find(([pattern]) => pattern.test(value))?.[1] ?? 'LocalBusiness';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

type SchemaBusinessData = BusinessSeoInput & {
  imageUrls: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  socialUrls: Array<string | null | undefined>;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: Array<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }>;
  ratingAverage: number | null;
  ratingCount: number;
};

function toAbsoluteUrl(value: string | null | undefined): string | undefined {
  const url = clean(value);
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`;
  return undefined;
}

function hhmm(value: string | null): string | undefined {
  const match = /^(\d{2}):(\d{2})/.exec(value ?? '');
  return match ? `${match[1]}:${match[2]}` : undefined;
}

/** JSON-LD LocalBusiness só com o que está de fato cadastrado e visível na página. */
export function buildLocalBusinessSchema(data: SchemaBusinessData): Record<string, unknown> {
  const url = businessCanonicalUrl(data.slug);
  const sameAs = Array.from(
    new Set(data.socialUrls.map(toAbsoluteUrl).filter((item): item is string => Boolean(item)))
  );
  const website = toAbsoluteUrl(data.website);
  const street = clean(data.address);
  const hasAddress = Boolean(street || data.city || data.state);

  const openingHoursSpecification = data.hours
    .filter((item) => !item.isClosed && hhmm(item.openTime) && hhmm(item.closeTime) && DAY_NAMES[item.dayOfWeek])
    .map((item) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_NAMES[item.dayOfWeek],
      opens: hhmm(item.openTime),
      closes: hhmm(item.closeTime),
    }));

  return {
    '@context': 'https://schema.org',
    '@type': schemaTypeForCategory(data.category),
    '@id': `${url}#business`,
    name: clean(data.name),
    url,
    description: clean(data.description) || undefined,
    image: data.imageUrls.length ? data.imageUrls : undefined,
    telephone: clean(data.phone) || undefined,
    email: clean(data.email) || undefined,
    address: hasAddress
      ? {
          '@type': 'PostalAddress',
          streetAddress: street || undefined,
          addressLocality: clean(data.city) || undefined,
          addressRegion: clean(data.state).toUpperCase() || undefined,
          addressCountry: 'BR',
        }
      : undefined,
    geo:
      data.latitude != null && data.longitude != null
        ? { '@type': 'GeoCoordinates', latitude: data.latitude, longitude: data.longitude }
        : undefined,
    openingHoursSpecification: openingHoursSpecification.length ? openingHoursSpecification : undefined,
    sameAs: website ? [website, ...sameAs] : sameAs.length ? sameAs : undefined,
    aggregateRating:
      data.ratingAverage != null && data.ratingCount > 0
        ? { '@type': 'AggregateRating', ratingValue: data.ratingAverage, reviewCount: data.ratingCount }
        : undefined,
  };
}

export type BusinessSeoFormValues = {
  seo_title: string;
  seo_description: string;
  seo_og_image_url: string;
  seo_indexable: boolean;
};

/** Valida e normaliza o que o admin digitou. Campo vazio vira null (= volta ao automático). */
export function validateSeoOverrides(
  input: BusinessSeoFormValues
): { ok: true; values: { seo_title: string | null; seo_description: string | null; seo_og_image_url: string | null; seo_indexable: boolean } } | { ok: false; error: string } {
  const title = clean(input.seo_title);
  const description = clean(input.seo_description);
  const image = clean(input.seo_og_image_url);
  if (title.length > 70) return { ok: false, error: 'O título SEO deve ter no máximo 70 caracteres.' };
  if (description.length > 200) return { ok: false, error: 'A descrição SEO deve ter no máximo 200 caracteres.' };
  if (image && !/^https:\/\/\S+$/i.test(image)) return { ok: false, error: 'A imagem de compartilhamento precisa ser um link https.' };
  return {
    ok: true,
    values: {
      seo_title: title || null,
      seo_description: description || null,
      seo_og_image_url: image || null,
      seo_indexable: input.seo_indexable !== false,
    },
  };
}
