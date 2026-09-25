import QRCode from 'qrcode';

/**
 * Gera Data URL em formato PNG (alta resolução para impressão/banners/cards)
 */
export async function generateQRCodeDataURL(
  text: string,
  width: number = 1000
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('[QRCode] Erro ao gerar PNG DataURL:', err);
    throw err;
  }
}

/**
 * Gera SVG string limpa do QR Code
 */
export async function generateQRCodeSVG(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('[QRCode] Erro ao gerar SVG:', err);
    throw err;
  }
}

/**
 * Baixar QR Code em formato PNG de alta resolução (1200px)
 */
export async function downloadQRCodePNG(text: string, filename: string): Promise<void> {
  const dataUrl = await generateQRCodeDataURL(text, 1200);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Baixar QR Code em formato SVG (vetorial)
 */
export async function downloadQRCodeSVG(text: string, filename: string): Promise<void> {
  const svgString = await generateQRCodeSVG(text);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
