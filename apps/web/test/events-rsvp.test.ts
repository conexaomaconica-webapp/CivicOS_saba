/**
 * events-rsvp.test.ts
 * Testes unitários do módulo Eventos & RSVP da plataforma Conexão Maçônica.
 *
 * Fluxos testados (todos os exigidos na especificação):
 * ✓ Carregar evento ativo por slug
 * ✓ Retornar erro para evento inexistente
 * ✓ Confirmar presença (novo registro)
 * ✓ Registrar ausência (attendance_status = 'declined')
 * ✓ Evitar duplicidade — segunda inscrição com mesmo WhatsApp = upsert
 * ✓ Atualizar inscrição existente
 * ✓ Gerar código único no formato CM-YYYY-NNNN (não UUID)
 * ✓ Capturar e salvar origem (ref=whatsapp, utm_source, utm_campaign)
 * ✓ Listar inscrições no Admin (com guard de autorização)
 * ✓ Realizar check-in e preencher checked_in_at
 * ✓ Impedir check-in duplicado (retornar already_checked = true)
 * ✓ Bloquear acesso administrativo para usuário sem role autorizado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPlatformEventBySlugAction,
  upsertEventRegistrationAction,
  getAdminEventListAction,
  adminCheckinRegistrationAction,
  adminUndoCheckinAction,
  getRegistrationByCheckinTokenAction,
} from '../src/app/actions/platform-events';
import {
  normalizeWhatsApp,
  validateWhatsApp,
  buildCSVContent,
  sanitizeUTMParams,
  generateICSContent,
} from '../src/lib/events/events-service';

// ---------------------------------------------------------------------------
// Mock infrastructure
// ---------------------------------------------------------------------------

const MOCK_EVENT = {
  id: 'evt-001',
  slug: 'conexao-empresarial-2026',
  title: 'Conexão Empresarial da Família Maçônica',
  subtitle: 'Relacionamentos que aproximam! Negócios que fortalecem!',
  description: 'Descrição do evento.',
  event_date: '2026-11-24',
  start_time: '19:00:00',
  end_time: null,
  timezone: 'America/Bahia',
  venue_name: 'Centro de Convenções de Feira de Santana',
  venue_address: 'Feira de Santana – BA',
  city: 'Feira de Santana',
  cover_image_url: null,
  registration_enabled: true,
  capacity: null,
};

const MOCK_REGISTRATION = {
  registration_id: 'reg-uuid-001',
  confirmation_code: 'CM-2026-0001',
  is_new: true,
  full_name: 'Eduardo Silva',
  attendance_status: 'confirmed',
};

const MOCK_REGISTRATION_EXISTING = {
  registration_id: 'reg-uuid-001',
  confirmation_code: 'CM-2026-0001',
  is_new: false,
  full_name: 'Eduardo Silva',
  attendance_status: 'declined',
};

const MOCK_ADMIN_EVENT_LIST = [
  {
    id: 'evt-001',
    slug: 'conexao-empresarial-2026',
    title: 'Conexão Empresarial da Família Maçônica',
    event_date: '2026-11-24',
    start_time: '19:00:00',
    venue_name: 'Centro de Convenções de Feira de Santana',
    city: 'Feira de Santana',
    status: 'published',
    registration_enabled: true,
    capacity: null,
    total_registrations: 42,
    total_confirmed: 38,
    total_checkins: 0,
    created_at: '2026-09-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Mock: supabase/server
// ---------------------------------------------------------------------------
vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn(),
  resolveTenantIdServer: vi.fn().mockResolvedValue('tenant-001'),
}));

// Mock: rate-limiter (permitir por padrão)
vi.mock('../src/lib/security/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetMs: 0 }),
}));

// ---------------------------------------------------------------------------
// Helpers de mock do client Supabase
// ---------------------------------------------------------------------------
function createSupabaseMock(overrides: Record<string, unknown> = {}) {
  return {
    rpc: vi.fn().mockImplementation((fnName: string) => {
      switch (fnName) {
        case 'get_platform_event_by_slug':
          return Promise.resolve({ data: [MOCK_EVENT], error: null });
        case 'upsert_event_registration':
          return Promise.resolve({ data: [MOCK_REGISTRATION], error: null });
        case 'admin_list_platform_events':
          return Promise.resolve({ data: MOCK_ADMIN_EVENT_LIST, error: null });
        case 'admin_get_event_dashboard':
          return Promise.resolve({
            data: [{
              total_registrations: 42, total_confirmed: 38,
              total_declined: 4, total_checkins: 0,
              by_attendee_type: { macom: 30, convidado: 12 },
              by_source: { whatsapp: 25, direto: 17 },
            }],
            error: null,
          });
        case 'admin_checkin_registration':
          return Promise.resolve({
            data: [{
              registration_id: 'reg-uuid-001',
              full_name: 'Eduardo Silva',
              confirmation_code: 'CM-2026-0001',
              checked_in_at: '2026-11-24T22:05:00Z',
              already_checked: false,
            }],
            error: null,
          });
        default:
          return Promise.resolve({ data: null, error: null });
      }
    }),
    from: vi.fn().mockReturnThis(),
    ...overrides,
  };
}

import { createServerSideClient } from '../src/lib/supabase/server';
const mockCreateClient = createServerSideClient as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Suite 1: Carregar evento público
// ---------------------------------------------------------------------------
describe('getPlatformEventBySlugAction', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(createSupabaseMock());
  });

  it('✓ deve carregar evento ativo por slug', async () => {
    const result = await getPlatformEventBySlugAction('conexao-empresarial-2026');
    expect(result.success).toBe(true);
    expect(result.data?.slug).toBe('conexao-empresarial-2026');
    expect(result.data?.title).toBe('Conexão Empresarial da Família Maçônica');
    expect(result.data?.registration_enabled).toBe(true);
  });

  it('✓ deve retornar erro para evento não encontrado', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      })
    );
    const result = await getPlatformEventBySlugAction('evento-inexistente');
    expect(result.success).toBe(false);
    expect(result.error).toContain('não encontrado');
  });

  it('✓ deve retornar erro para slug vazio', async () => {
    const result = await getPlatformEventBySlugAction('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('obrigatório');
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Confirmar presença (RSVP)
// ---------------------------------------------------------------------------
describe('upsertEventRegistrationAction', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(createSupabaseMock());
  });

  const baseInput = {
    eventId: 'evt-001',
    fullName: 'Eduardo Silva',
    whatsapp: '75991272323',
    attendeeType: 'macom' as const,
    attendanceStatus: 'confirmed' as const,
  };

  it('✓ deve confirmar presença criando novo registro', async () => {
    const result = await upsertEventRegistrationAction(baseInput);
    expect(result.success).toBe(true);
    expect(result.data?.attendanceStatus).toBe('confirmed');
    expect(result.data?.isNew).toBe(true);
  });

  it('✓ deve registrar ausência (declined)', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockImplementation((fn: string) => {
          if (fn === 'upsert_event_registration') {
            return Promise.resolve({
              data: [{ ...MOCK_REGISTRATION, attendance_status: 'declined', is_new: true }],
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      })
    );
    const result = await upsertEventRegistrationAction({
      ...baseInput,
      attendanceStatus: 'declined',
    });
    expect(result.success).toBe(true);
    expect(result.data?.attendanceStatus).toBe('declined');
  });

  it('✓ deve retornar upsert (is_new = false) para WhatsApp duplicado', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockImplementation((fn: string) => {
          if (fn === 'upsert_event_registration') {
            return Promise.resolve({ data: [MOCK_REGISTRATION_EXISTING], error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      })
    );
    const result = await upsertEventRegistrationAction(baseInput);
    expect(result.success).toBe(true);
    expect(result.data?.isNew).toBe(false);
    expect(result.data?.confirmationCode).toBe('CM-2026-0001');
  });

  it('✓ deve atualizar inscrição existente (confirmed → declined)', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockImplementation((fn: string) => {
          if (fn === 'upsert_event_registration') {
            return Promise.resolve({
              data: [{ ...MOCK_REGISTRATION_EXISTING, attendance_status: 'declined' }],
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      })
    );
    const result = await upsertEventRegistrationAction({
      ...baseInput,
      attendanceStatus: 'declined',
    });
    expect(result.success).toBe(true);
    expect(result.data?.attendanceStatus).toBe('declined');
    expect(result.data?.isNew).toBe(false);
  });

  it('✓ deve gerar código no formato CM-YYYY-NNNN (não UUID)', async () => {
    const result = await upsertEventRegistrationAction(baseInput);
    expect(result.success).toBe(true);
    expect(result.data?.confirmationCode).toMatch(/^CM-\d{4}-\d{4}$/);
    expect(result.data?.confirmationCode).not.toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('✓ deve capturar e salvar origem/UTM', async () => {
    let capturedArgs: Record<string, unknown> = {};
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockImplementation((fn: string, args: Record<string, unknown>) => {
          if (fn === 'upsert_event_registration') {
            capturedArgs = args;
            return Promise.resolve({ data: [MOCK_REGISTRATION], error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      })
    );
    await upsertEventRegistrationAction({
      ...baseInput,
      source: 'whatsapp',
      utmSource: 'instagram',
      utmCampaign: 'convite-impresso',
    });
    expect(capturedArgs['p_source']).toBe('whatsapp');
    expect(capturedArgs['p_utm_source']).toBe('instagram');
    expect(capturedArgs['p_utm_campaign']).toBe('convite-impresso');
  });

  it('✓ deve rejeitar nome muito curto', async () => {
    const result = await upsertEventRegistrationAction({ ...baseInput, fullName: 'AB' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('3 caracteres');
  });

  it('✓ deve rejeitar WhatsApp inválido (menos de 10 dígitos)', async () => {
    const result = await upsertEventRegistrationAction({ ...baseInput, whatsapp: '123' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('WhatsApp inválido');
  });

  it('✓ deve rejeitar tipo de participante inválido', async () => {
    const result = await upsertEventRegistrationAction({
      ...baseInput,
      attendeeType: 'invalido' as never,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tipo de participante inválido');
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Admin — listagem de inscrições
// ---------------------------------------------------------------------------
describe('getAdminEventListAction', () => {
  it('✓ deve listar eventos no Admin com sucesso', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseMock());
    const result = await getAdminEventListAction();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].total_registrations).toBe(42);
  });

  it('✓ deve bloquear acesso administrativo sem autorização (código 42501)', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'Acesso não autorizado.' },
        }),
      })
    );
    const result = await getAdminEventListAction();
    expect(result.success).toBe(false);
    expect(result.error).toContain('não autorizado');
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Check-in
// ---------------------------------------------------------------------------
describe('adminCheckinRegistrationAction', () => {
  it('✓ deve realizar check-in preenchendo checked_in_at', async () => {
    mockCreateClient.mockResolvedValue(createSupabaseMock());
    const result = await adminCheckinRegistrationAction('reg-uuid-001');
    expect(result.success).toBe(true);
    expect(result.data?.checkedInAt).toBeDefined();
    expect(result.data?.alreadyChecked).toBe(false);
  });

  it('✓ deve impedir check-in duplicado (already_checked = true)', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({
          data: [{
            registration_id: 'reg-uuid-001',
            full_name: 'Eduardo Silva',
            confirmation_code: 'CM-2026-0001',
            checked_in_at: '2026-11-24T22:05:00Z',
            already_checked: true,
          }],
          error: null,
        }),
      })
    );
    const result = await adminCheckinRegistrationAction('reg-uuid-001');
    expect(result.success).toBe(true);
    expect(result.data?.alreadyChecked).toBe(true);
    expect(result.data?.checkedInAt).toBe('2026-11-24T22:05:00Z');
  });

  it('✓ deve retornar erro para inscrição não encontrada', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'P0002', message: 'Inscrição não encontrada.' },
        }),
      })
    );
    const result = await adminCheckinRegistrationAction('reg-inexistente');
    expect(result.success).toBe(false);
    expect(result.error).toContain('não encontrada');
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Desfazer Check-in (Reversão Administrativa)
// ---------------------------------------------------------------------------
describe('adminUndoCheckinAction', () => {
  it('✓ deve desfazer check-in com sucesso para admin autorizado', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({
          data: [{
            registration_id: 'reg-uuid-001',
            full_name: 'Eduardo Silva',
            confirmation_code: 'CM-2026-0001',
            success: true,
          }],
          error: null,
        }),
      })
    );
    const result = await adminUndoCheckinAction('reg-uuid-001');
    expect(result.success).toBe(true);
    expect(result.data?.success).toBe(true);
  });

  it('✓ deve bloquear reversão para usuário sem autorização master/socio_admin (42501)', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'Acesso não autorizado.' },
        }),
      })
    );
    const result = await adminUndoCheckinAction('reg-uuid-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('não autorizado');
  });
});

// ---------------------------------------------------------------------------
// Suite 6: QR Code e Busca por Token
// ---------------------------------------------------------------------------
describe('getRegistrationByCheckinTokenAction', () => {
  it('✓ deve localizar participante por token de check-in', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({
          data: [{
            id: 'reg-uuid-001',
            full_name: 'Eduardo Silva',
            whatsapp: '75991272323',
            email: 'e@mail.com',
            attendee_type: 'macom',
            masonic_organization: 'Loja X',
            company_name: 'Empresa Y',
            city: 'Feira de Santana',
            attendance_status: 'confirmed',
            confirmation_code: 'CM-2026-0001',
            checked_in_at: null,
            checkin_token: 'token-uuid-123',
          }],
          error: null,
        }),
      })
    );

    const result = await getRegistrationByCheckinTokenAction('evt-001', 'token-uuid-123');
    expect(result.success).toBe(true);
    expect(result.data?.full_name).toBe('Eduardo Silva');
    expect(result.data?.confirmation_code).toBe('CM-2026-0001');
  });

  it('✓ deve retornar null quando token não for localizado', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rpc: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })
    );

    const result = await getRegistrationByCheckinTokenAction('evt-001', 'token-invalido');
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Utilitários (events-service) — sem mocks necessários
// ---------------------------------------------------------------------------
describe('normalizeWhatsApp', () => {
  it('✓ deve normalizar (75) 99999-9999 para apenas dígitos', () => {
    // (75) 99999-9999 → 7 dígitos no número = 11 dígitos total
    expect(normalizeWhatsApp('(75) 99999-9999')).toBe('75999999999');
  });

  it('✓ deve normalizar +55 75 99999-9999', () => {
    // +55 (DDI) + 75 (DDD) + 99999-9999 = 13 dígitos total
    expect(normalizeWhatsApp('+55 75 99999-9999')).toBe('5575999999999');
  });

  it('✓ deve manter número já limpo', () => {
    expect(normalizeWhatsApp('75991272323')).toBe('75991272323');
  });
});

describe('validateWhatsApp', () => {
  it('✓ deve aceitar WhatsApp válido com DDD', () => {
    const result = validateWhatsApp('75991272323');
    expect(result.valid).toBe(true);
  });

  it('✓ deve rejeitar número muito curto', () => {
    const result = validateWhatsApp('12345');
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });
});

describe('sanitizeUTMParams', () => {
  it('✓ deve capturar ref e utm_source', () => {
    const result = sanitizeUTMParams({
      ref: 'whatsapp',
      utm_source: 'instagram',
      utm_campaign: 'convite-impresso',
    });
    expect(result.source).toBe('whatsapp');
    expect(result.utmSource).toBe('instagram');
    expect(result.utmCampaign).toBe('convite-impresso');
  });

  it('✓ deve sanitizar caracteres perigosos', () => {
    const result = sanitizeUTMParams({ ref: '<script>alert(1)</script>' });
    expect(result.source).not.toContain('<');
    expect(result.source).not.toContain('>');
  });
});

describe('buildCSVContent', () => {
  it('✓ deve gerar CSV com BOM UTF-8 e cabeçalho correto', () => {
    const items = [{
      id: 'reg-001',
      full_name: 'Eduardo Silva',
      whatsapp: '75991272323',
      email: 'e@mail.com',
      attendee_type: 'macom',
      masonic_organization: 'Loja X',
      company_name: 'Empresa Y',
      city: 'Feira de Santana',
      attendance_status: 'confirmed',
      confirmation_code: 'CM-2026-0001',
      source: 'whatsapp',
      utm_source: null,
      utm_campaign: null,
      checked_in_at: null,
      created_at: '2026-09-01T10:00:00Z',
      total_count: 1,
    }];
    const csv = buildCSVContent(items, 'Evento Teste');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('CM-2026-0001');
    expect(csv).toContain('Eduardo Silva');
    expect(csv).toContain('Maçom');
    expect(csv).toContain('Confirmado');
  });
});

describe('generateICSContent', () => {
  it('✓ deve gerar arquivo ICS válido com UID baseado no código', () => {
    const ics = generateICSContent({
      title: 'Conexão Empresarial',
      event_date: '2026-11-24',
      start_time: '19:00:00',
      venue_name: 'Centro de Convenções',
    }, 'CM-2026-0001');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261124T190000');
    expect(ics).toContain('UID:CM-2026-0001@');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
