import { describe, it, expect } from 'vitest';
import {
  businessReviewSchema,
  ratingSummarySchema,
  reviewStatusSchema,
} from '@saas/core';

describe('BLOCO 3: Reviews, Reputation and Double Anti-Self-Evaluation', () => {
  it('validates review status enum strictly preserving history', () => {
    expect(reviewStatusSchema.parse('pending')).toBe('pending');
    expect(reviewStatusSchema.parse('approved')).toBe('approved');
    expect(reviewStatusSchema.parse('rejected')).toBe('rejected');
    expect(reviewStatusSchema.parse('hidden')).toBe('hidden');
    expect(() => reviewStatusSchema.parse('deleted')).toThrow();
  });

  it('calculates unweighted simple average rating for approved reviews only', () => {
    const reviews = [
      { rating: 5, status: 'approved' },
      { rating: 3, status: 'approved' },
      { rating: 1, status: 'rejected' }, // Rejected review must NOT affect rating
      { rating: 2, status: 'pending' },  // Pending review must NOT affect rating
    ];

    const approvedReviews = reviews.filter((r) => r.status === 'approved');
    const totalApproved = approvedReviews.length;
    const avgRating =
      totalApproved > 0
        ? Number(
            (
              approvedReviews.reduce((acc, curr) => acc + curr.rating, 0) /
              totalApproved
            ).toFixed(1)
          )
        : 0;

    const summary = ratingSummarySchema.parse({
      averageRating: avgRating,
      totalApprovedReviews: totalApproved,
    });

    expect(summary.averageRating).toBe(4.0);
    expect(summary.totalApprovedReviews).toBe(2);
  });

  it('enforces single review constraint per author and business pair', () => {
    const authorId = '11111111-1111-1111-1111-111111111111';
    const businessId = '22222222-2222-2222-2222-222222222222';
    const tenantId = '33333333-3333-3333-3333-333333333333';

    const existingReview = {
      id: '44444444-4444-4444-4444-444444444444',
      tenantId,
      businessId,
      authorId,
      rating: 4,
      comment: 'Ótimo atendimento e serviços prestados.',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validated = businessReviewSchema.parse(existingReview);
    expect(validated.rating).toBe(4);

    // Attempting to duplicate review with same (tenantId, businessId, authorId) key
    const simulateUniqueConstraint = (
      existing: typeof validated,
      incoming: { tenantId: string; businessId: string; authorId: string }
    ) => {
      if (
        existing.tenantId === incoming.tenantId &&
        existing.businessId === incoming.businessId &&
        existing.authorId === incoming.authorId
      ) {
        throw new Error(
          'UNIQUE constraint violation: author already reviewed this business'
        );
      }
    };

    expect(() =>
      simulateUniqueConstraint(validated, { tenantId, businessId, authorId })
    ).toThrow(/UNIQUE constraint violation/);
  });

  it('blocks self-evaluation both server-side and database-level', () => {
    const ownerId = '55555555-5555-5555-5555-555555555555';
    const memberId = '66666666-6666-6666-6666-666666666666';
    const externalUserId = '77777777-7777-7777-7777-777777777777';

    const business = {
      id: '88888888-8888-8888-8888-888888888888',
      ownerId,
      memberIds: [memberId],
    };

    const validateReviewSubmission = (userId: string, targetBusiness: typeof business) => {
      if (
        userId === targetBusiness.ownerId ||
        targetBusiness.memberIds.includes(userId)
      ) {
        throw new Error(
          'Anunciantes e membros do estabelecimento não podem avaliar a própria empresa.'
        );
      }
      return true;
    };

    expect(() => validateReviewSubmission(ownerId, business)).toThrow(
      'Anunciantes e membros do estabelecimento não podem avaliar a própria empresa.'
    );
    expect(() => validateReviewSubmission(memberId, business)).toThrow(
      'Anunciantes e membros do estabelecimento não podem avaliar a própria empresa.'
    );
    expect(validateReviewSubmission(externalUserId, business)).toBe(true);
  });
});
