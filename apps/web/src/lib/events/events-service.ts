/**
 * events-service.ts
 * Utilitários puros (sem 'use server') para o módulo de Eventos & RSVP.
 * Funções: validação, geração de ICS, CSV, UTM.
 */

import type { AdminRegistrationItem } from '@/app/actions/platform-events';

// ---------------------------------------------------------------------------
// Validação de WhatsApp
// ---------------------------------------------------------------------------
/**
 * Normaliza um número de WhatsApp para apenas dígitos.
 * Aceita: (75) 99999-9999 | 75999999999 | +55 75 99999-9999
 */
export function normalizeWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Valida se um WhatsApp é válido (mínimo 10 dígitos, máximo 13).
 */
export function validateWhatsApp(phone: string): { valid: boolean; message?: string } {
  const clean = normalizeWhatsApp(phone);
  if (clean.length < 10) {
    return { valid: false, message: 'Informe o DDD + número (ex: 75 99999-9999).' };
  }
  if (clean.length > 13) {
    return { valid: false, message: 'Número de WhatsApp muito longo.' };
  }
  return { valid: true };
}

/**
 * Formata o WhatsApp para exibição: (75) 99999-9999
 */
export function formatWhatsApp(phone: string): string {
  const clean = normalizeWhatsApp(phone);
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Código de Confirmação
// ---------------------------------------------------------------------------
/**
 * Formata o código de confirmação para exibição.
 * Entrada: "CM-2026-0048" → Saída: "CM-2026-0048" (já formatado)
 */
export function formatConfirmationCode(code: string): string {
  return code.toUpperCase();
}

// ---------------------------------------------------------------------------
// Captura e sanitização de UTMs da URL
// ---------------------------------------------------------------------------
export interface UTMParams {
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Extrai e sanitiza parâmetros de rastreamento da URL.
 * Suporta: ?ref=whatsapp | ?utm_source=instagram | ?utm_campaign=convite-impresso
 */
export function sanitizeUTMParams(searchParams: Record<string, string | undefined>): UTMParams {
  const sanitize = (val: string | undefined): string | undefined => {
    if (!val) return undefined;
    // Remove caracteres perigosos, limita tamanho
    return val.replace(/[<>"'`\\]/g, '').slice(0, 100) || undefined;
  };

  return {
    source:      sanitize(searchParams['ref']),
    utmSource:   sanitize(searchParams['utm_source']),
    utmMedium:   sanitize(searchParams['utm_medium']),
    utmCampaign: sanitize(searchParams['utm_campaign']),
  };
}

// ---------------------------------------------------------------------------
// Geração de arquivo .ICS (Adicionar à Agenda)
// ---------------------------------------------------------------------------
export interface EventForICS {
  title: string;
  description?: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  city?: string | null;
}

/**
 * Gera o conteúdo de um arquivo .ics para "Adicionar à Agenda".
 * Compatível com Google Calendar, Apple Calendar, Outlook.
 */
export function generateICSContent(event: EventForICS, confirmationCode: string): string {
  const formatICSDate = (date: string, time: string): string => {
    // Converte YYYY-MM-DD + HH:MM:SS → 20261124T190000
    const dateClean = date.replace(/-/g, '');
    const timeClean = time.replace(/:/g, '').slice(0, 6);
    return `${dateClean}T${timeClean}`;
  };

  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const dtStart = formatICSDate(event.event_date, event.start_time);
  const dtEnd = event.end_time
    ? formatICSDate(event.event_date, event.end_time)
    : formatICSDate(event.event_date, '23:00:00');

  const location = [event.venue_name, event.venue_address, event.city]
    .filter(Boolean)
    .join(', ');

  const description = [
    event.description ?? '',
    `Código de confirmação: ${confirmationCode}`,
  ]
    .filter(Boolean)
    .join('\\n\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Conexão Maçônica//RSVP//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `DTSTAMP:${now}`,
    `UID:${confirmationCode}@conexaomasonica.com.br`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Dispara o download de um arquivo .ics no browser.
 * Deve ser chamado somente no client-side.
 */
export function downloadICSFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Compartilhamento
// ---------------------------------------------------------------------------
/**
 * Constrói URL de compartilhamento do evento com UTMs pré-populados.
 */
export function buildShareUrl(slug: string, ref: string): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}/eventos/${slug}`
      : `/eventos/${slug}`;
  return `${base}?ref=${encodeURIComponent(ref)}`;
}

/**
 * Compartilha via Web Share API com fallback para copiar link.
 * Retorna true se compartilhou, false se apenas copiou.
 */
export async function shareOrCopy(
  title: string,
  text: string,
  url: string
): Promise<{ shared: boolean; copied: boolean }> {
  if (typeof window === 'undefined') return { shared: false, copied: false };

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { shared: true, copied: false };
    } catch {
      // Usuário cancelou ou erro — cai no fallback
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { shared: false, copied: true };
  } catch {
    // Fallback final: selecionar texto
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return { shared: false, copied: true };
  }
}

// ---------------------------------------------------------------------------
// Exportação CSV (server-side, sem dependência externa)
// ---------------------------------------------------------------------------
const CSV_HEADERS = [
  'Código',
  'Nome Completo',
  'WhatsApp',
  'E-mail',
  'Tipo de Participante',
  'Loja / Potência',
  'Empresa / Profissão',
  'Cidade',
  'Presença',
  'Origem',
  'UTM Source',
  'UTM Campaign',
  'Check-in Realizado',
  'Data de Inscrição',
];

const ATTENDEE_TYPE_LABELS: Record<string, string> = {
  macom:     'Maçom',
  cunhada:   'Cunhada',
  familiar:  'Familiar',
  convidado: 'Convidado',
};

const ATTENDANCE_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  declined:  'Não comparecerá',
};

function escapeCSVField(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Envolve em aspas duplas se contiver vírgula, aspas ou nova linha
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleString('pt-BR', {
      timeZone: 'America/Bahia',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Gera o conteúdo CSV de participantes.
 * Sem dependências externas — apenas string manipulation.
 */
export function buildCSVContent(
  items: AdminRegistrationItem[],
  _eventTitle: string
): string {
  const rows = [
    CSV_HEADERS.join(','),
    ...items.map((r) =>
      [
        escapeCSVField(r.confirmation_code),
        escapeCSVField(r.full_name),
        escapeCSVField(r.whatsapp),
        escapeCSVField(r.email),
        escapeCSVField(ATTENDEE_TYPE_LABELS[r.attendee_type] ?? r.attendee_type),
        escapeCSVField(r.masonic_organization),
        escapeCSVField(r.company_name),
        escapeCSVField(r.city),
        escapeCSVField(ATTENDANCE_LABELS[r.attendance_status] ?? r.attendance_status),
        escapeCSVField(r.source),
        escapeCSVField(r.utm_source),
        escapeCSVField(r.utm_campaign),
        escapeCSVField(r.checked_in_at ? formatDateBR(r.checked_in_at) : ''),
        escapeCSVField(formatDateBR(r.created_at)),
      ].join(',')
    ),
  ];

  // BOM UTF-8 para compatibilidade com Excel
  return '\uFEFF' + rows.join('\r\n');
}
