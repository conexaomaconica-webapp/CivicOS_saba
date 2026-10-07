import { describe, expect, it } from 'vitest';
import { classifyContactClick } from '../src/lib/analytics/contact-click';
import { classifyVisitOrigin, isVisitOrigin } from '../src/lib/analytics/visit-origin';

const host = 'conexaomaconica.com.br';

describe('clique em link de contato', () => {
  it('classifica WhatsApp, telefone, Instagram, redes, rota e site', () => {
    expect(classifyContactClick('https://wa.me/5575999998888?text=oi', host)).toBe('whatsapp_click');
    expect(classifyContactClick('https://api.whatsapp.com/send?phone=5575999998888', host)).toBe('whatsapp_click');
    expect(classifyContactClick('tel:+5575999998888', host)).toBe('phone_click');
    expect(classifyContactClick('https://www.instagram.com/exemplo', host)).toBe('instagram_click');
    expect(classifyContactClick('https://facebook.com/exemplo', host)).toBe('social_click');
    expect(classifyContactClick('https://www.youtube.com/@exemplo', host)).toBe('social_click');
    expect(classifyContactClick('https://www.google.com/maps/dir/?api=1&destination=x', host)).toBe('directions_click');
    expect(classifyContactClick('https://maps.app.goo.gl/abc', host)).toBe('directions_click');
    expect(classifyContactClick('https://exemplo.com.br', host)).toBe('website_click');
  });

  it('indicar por WhatsApp (sem número) é compartilhamento, não contato', () => {
    expect(classifyContactClick('https://wa.me/?text=veja', host)).toBe('share');
  });

  it('ignora e-mail, âncora, link interno e esquemas perigosos', () => {
    expect(classifyContactClick('mailto:a@b.com', host)).toBeNull();
    expect(classifyContactClick('#planos', host)).toBeNull();
    expect(classifyContactClick('/guia/outra-empresa', host)).toBeNull();
    expect(classifyContactClick('https://conexaomaconica.com.br/guia/x', host)).toBeNull();
    expect(classifyContactClick('javascript:alert(1)', host)).toBeNull();
    expect(classifyContactClick(null, host)).toBeNull();
  });
});

describe('origem da visita', () => {
  const classify = (referrer: string | null, search = '') => classifyVisitOrigin({ referrer, search, ownHost: host });

  it('Google e outros buscadores', () => {
    expect(classify('https://www.google.com/')).toBe('organic_google');
    expect(classify('https://www.google.com.br/search?q=otica')).toBe('organic_google');
    expect(classify('https://www.bing.com/')).toBe('organic_search');
    expect(classify('https://duckduckgo.com/')).toBe('organic_search');
  });

  it('assistentes de IA, redes sociais e outros sites', () => {
    expect(classify('https://chatgpt.com/')).toBe('ai_search');
    expect(classify('https://l.instagram.com/?u=x')).toBe('social');
    expect(classify('https://t.co/abc')).toBe('social');
    expect(classify('https://blog.exemplo.com.br/post')).toBe('referral');
  });

  it('QR, compartilhamento, e-mail e campanha pelos parâmetros UTM', () => {
    expect(classify(null, '?utm_source=qr')).toBe('qr');
    expect(classify(null, '?utm_medium=share')).toBe('share');
    expect(classify(null, '?utm_medium=email&utm_source=newsletter')).toBe('email');
    expect(classify('https://www.google.com/', '?utm_medium=cpc&utm_source=google')).toBe('campaign');
  });

  it('sem referrer é direto; vindo do próprio site é diretório', () => {
    expect(classify(null)).toBe('direct');
    expect(classify('')).toBe('direct');
    expect(classify('https://conexaomaconica.com.br/guia')).toBe('directory');
    expect(classify('https://www.conexaomaconica.com.br/guia')).toBe('directory');
  });

  it('valida valores aceitos pela API', () => {
    expect(isVisitOrigin('organic_google')).toBe(true);
    expect(isVisitOrigin('qualquer-coisa')).toBe(false);
    expect(isVisitOrigin(undefined)).toBe(false);
  });
});
