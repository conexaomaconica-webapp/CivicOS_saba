import { afterEach, describe, expect, it, vi } from 'vitest';
import { brandedEmailHtml, escapeHtml, isEmailConfigured, sendEmail } from '../src/lib/email/send-email';

const mail = { to: 'a@b.com', subject: 'Oi', html: '<p>oi</p>', text: 'oi' };

describe('envio de e-mail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sem chave ou remetente não envia e não lança erro', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('MAIL_FROM', '');
    expect(isEmailConfigured()).toBe(false);
    expect(await sendEmail(mail)).toEqual({ sent: false, reason: 'not_configured' });
  });

  it('envia pela API do Resend com a chave no cabeçalho', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('MAIL_FROM', 'Conexão <c@x.com>');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'msg-1' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendEmail(mail)).toEqual({ sent: true, id: 'msg-1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect((init as any).headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse((init as any).body).to).toEqual(['a@b.com']);
  });

  it('recusa do provedor e falha de rede viram resultado, nunca exceção', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('MAIL_FROM', 'c@x.com');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => 'domínio não verificado' }));
    expect(await sendEmail(mail)).toMatchObject({ sent: false, reason: 'rejected' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await sendEmail(mail)).toMatchObject({ sent: false, reason: 'network' });
  });

  it('o HTML escapa texto e usa só cor hexadecimal válida', () => {
    expect(escapeHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    const html = brandedEmailHtml({
      brandName: '<script>x</script>', primaryColor: 'red;background:url(x)', heading: 'Oi', paragraphs: ['<i>a</i>'],
      buttonLabel: 'Abrir', buttonUrl: 'https://x.com/a?b="c"',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<i>a</i>');
    expect(html).toContain('#5d1523');
    expect(html).not.toContain('url(x)');
  });
});
