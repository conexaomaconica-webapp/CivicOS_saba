import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpsertEventRegistrationAction } = vi.hoisted(() => ({
  mockUpsertEventRegistrationAction: vi.fn(),
}));

vi.mock('@/app/actions/platform-events', () => ({
  upsertEventRegistrationAction: mockUpsertEventRegistrationAction,
}));

import { OPTIONS, POST } from '../route';

describe('/api/mobile/events/rsvp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds to OPTIONS preflight with CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/mobile/events/rsvp', {
      method: 'POST',
      body: 'not-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(mockUpsertEventRegistrationAction).not.toHaveBeenCalled();
  });

  it('returns 400 when eventId is missing', async () => {
    const req = new Request('http://localhost/api/mobile/events/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Irmão Teste',
        whatsapp: '75999999999',
        attendeeType: 'macom',
        masonicOrganization: 'Loja 16 de Junho',
        attendanceStatus: 'confirmed',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(mockUpsertEventRegistrationAction).not.toHaveBeenCalled();
  });

  it('forwards valid payload with app_mobile default source and returns registration result', async () => {
    mockUpsertEventRegistrationAction.mockResolvedValue({
      success: true,
      data: {
        registrationId: 'reg-1',
        confirmationCode: 'CM-2026-0048',
        isNew: true,
        fullName: 'Eduardo Silva',
        attendanceStatus: 'confirmed',
        checkinToken: 'tok-abc',
      },
    });

    const req = new Request('http://localhost/api/mobile/events/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt-123',
        fullName: 'Eduardo Silva',
        whatsapp: '(75) 99999-9999',
        attendeeType: 'macom',
        masonicOrganization: 'Loja 16 de Junho',
        attendanceStatus: 'confirmed',
        city: 'Feira de Santana - BA',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.confirmationCode).toBe('CM-2026-0048');
    expect(mockUpsertEventRegistrationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-123',
        fullName: 'Eduardo Silva',
        whatsapp: '(75) 99999-9999',
        attendeeType: 'macom',
        masonicOrganization: 'Loja 16 de Junho',
        attendanceStatus: 'confirmed',
        source: 'app_mobile',
      })
    );
  });

  it('returns 400 when upsertEventRegistrationAction fails validation (e.g. macom without lodge)', async () => {
    mockUpsertEventRegistrationAction.mockResolvedValue({
      success: false,
      error: 'Loja / Potência Maçônica é obrigatória para a categoria Maçom.',
    });

    const req = new Request('http://localhost/api/mobile/events/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt-123',
        fullName: 'Eduardo Silva',
        whatsapp: '75999999999',
        attendeeType: 'macom',
        attendanceStatus: 'confirmed',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Maçônica');
  });
});
