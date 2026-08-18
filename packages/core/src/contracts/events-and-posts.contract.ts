import { z } from 'zod';

export const eventPublicationStatusSchema = z.enum(['draft', 'published', 'canceled', 'archived']);
export type EventPublicationStatus = z.infer<typeof eventPublicationStatusSchema>;

export const postPublicationStatusSchema = z.enum(['draft', 'scheduled', 'published', 'archived']);
export type PostPublicationStatus = z.infer<typeof postPublicationStatusSchema>;

export const businessEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  businessId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  timezone: z.string().min(1).default('America/Sao_Paulo'),
  locationName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  externalTicketUrl: z.string().nullable().optional(),
  publicationStatus: eventPublicationStatusSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BusinessEvent = z.infer<typeof businessEventSchema>;

export const businessPostSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  businessId: z.string().uuid(),
  title: z.string().min(1).max(255),
  summary: z.string().nullable().optional(),
  content: z.string().min(1),
  coverImageUrl: z.string().nullable().optional(),
  publicationStatus: postPublicationStatusSchema,
  publishedAt: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BusinessPost = z.infer<typeof businessPostSchema>;
