import { describe, expect, it, vi } from 'vitest';
import { listInternalProfileDTOs } from './profile-access-service';

const allowedId = '00000000-0000-0000-0000-000000000001';
const rejectedId = '00000000-0000-0000-0000-000000000002';

describe('profile access service', () => {
  it('filters batch profile reads to the authorized scope before querying', async () => {
    const inFilter = vi.fn().mockResolvedValue({
      data: [{ id: allowedId, name: 'Membro', email: 'membro@example.com', document_number: null }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ in: inFilter });
    const supabase = { from: vi.fn().mockReturnValue({ select }) } as any;

    const result = await listInternalProfileDTOs(
      supabase,
      [allowedId, rejectedId],
      { allowedUserIds: [allowedId] },
    );

    expect(inFilter).toHaveBeenCalledWith('id', [allowedId]);
    expect(result).toEqual([{ id: allowedId, name: 'Membro', email: 'membro@example.com', document_number: null }]);
  });
});
