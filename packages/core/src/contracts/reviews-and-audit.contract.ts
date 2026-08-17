import { z } from 'zod';

export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'hidden']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const businessReviewSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  businessId: z.string().uuid(),
  authorId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
  status: reviewStatusSchema,
  moderatedAt: z.string().nullable().optional(),
  moderatorId: z.string().uuid().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BusinessReview = z.infer<typeof businessReviewSchema>;

export const ratingSummarySchema = z.object({
  averageRating: z.number().min(0).max(5),
  totalApprovedReviews: z.number().int().min(0),
});
export type RatingSummary = z.infer<typeof ratingSummarySchema>;

export const adminAuditLogSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable().optional(),
  actorId: z.string().uuid(),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  action: z.string().min(1),
  beforeValue: z.record(z.unknown()).nullable().optional(),
  afterValue: z.record(z.unknown()).nullable().optional(),
  reason: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type AdminAuditLog = z.infer<typeof adminAuditLogSchema>;

export const searchPublicBusinessesQuerySchema = z.object({
  tenantId: z.string().uuid(),
  query: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  masonicOrgId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
});
export type SearchPublicBusinessesQuery = z.infer<typeof searchPublicBusinessesQuerySchema>;
