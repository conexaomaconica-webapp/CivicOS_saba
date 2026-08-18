import { z } from 'zod';

export const analyticsEventTypeSchema = z.enum([
  'page_view',
  'contact_whatsapp',
  'contact_phone',
  'social_link',
  'directions',
  'event_view',
  'post_view',
]);

export type AnalyticsEventType = z.infer<typeof analyticsEventTypeSchema>;

export const recordAnalyticsEventSchema = z.object({
  businessId: z.string().uuid({ message: 'businessId deve ser um UUID válido' }),
  eventType: analyticsEventTypeSchema,
  referrer: z.string().optional().nullable(),
});

export type RecordAnalyticsEventInput = z.infer<typeof recordAnalyticsEventSchema>;

export const analyticsSummaryItemSchema = z.object({
  eventType: analyticsEventTypeSchema,
  totalCount: z.number().int().nonnegative(),
});

export type AnalyticsSummaryItem = z.infer<typeof analyticsSummaryItemSchema>;
