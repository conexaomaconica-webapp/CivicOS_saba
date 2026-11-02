export type MobileBenefitItem = {
  id: string;
  title: string;
  description?: string;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  discount_code?: string | null;
  benefit_type?: string | null;
  badge_text?: string | null;
  valid_until?: string | null;
  rules?: string | null;
};

export type MobileBenefitRedemption = {
  id: string;
  benefitId: string;
  businessId?: string;
  businessName: string;
  businessSlug: string;
  businessWhatsapp?: string | null;
  title: string;
  description: string;
  discountPercentage?: number | null;
  badgeText?: string | null;
  code: string;
  redeemedAt: string;
  expiresAt: string | null;
  userEmail?: string;
  userName?: string;
};

const STORAGE_KEY = 'cm_mobile_benefit_redemptions';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {}
  return null;
}

export function loadRedeemedBenefits(): MobileBenefitRedemption[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getRedeemedBenefit(benefitId: string): MobileBenefitRedemption | undefined {
  if (!benefitId) return undefined;
  const list = loadRedeemedBenefits();
  return list.find((item) => item.benefitId === benefitId);
}

export function generateVoucherCode(customCode?: string | null): string {
  if (customCode && customCode.trim()) {
    return customCode.trim().toUpperCase();
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CM-BEN-${rand}`;
}

export function formatVoucherExpiration(value?: string | null): string {
  if (!value) return 'Consulte as condições da oferta';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return value || 'Consulte as condições da oferta';
  }
}

export function redeemBenefit({
  benefit,
  businessName,
  businessSlug,
  businessId,
  businessWhatsapp,
  user,
}: {
  benefit: MobileBenefitItem;
  businessName: string;
  businessSlug: string;
  businessId?: string;
  businessWhatsapp?: string | null;
  user?: { id?: string; name?: string; email?: string } | null;
}): MobileBenefitRedemption {
  const existing = getRedeemedBenefit(benefit.id);
  if (existing) {
    return existing;
  }

  // Define validade: usa a data do benefício ou 30 dias a partir de hoje
  let expiresAt: string;
  if (benefit.valid_until) {
    expiresAt = benefit.valid_until;
  } else {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    expiresAt = expiry.toISOString();
  }

  const code = generateVoucherCode(benefit.discount_code);
  const redemption: MobileBenefitRedemption = {
    id: 'redem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    benefitId: benefit.id,
    businessId,
    businessName: businessName.trim() || 'Empresa Parceira',
    businessSlug,
    businessWhatsapp: businessWhatsapp || null,
    title: benefit.title.trim(),
    description: (benefit.description || '').trim(),
    discountPercentage: benefit.discount_percentage ?? null,
    badgeText: benefit.badge_text || benefit.benefit_type || 'Oferta Exclusiva',
    code,
    redeemedAt: new Date().toISOString(),
    expiresAt,
    userEmail: user?.email,
    userName: user?.name,
  };

  try {
    const storage = getStorage();
    if (storage) {
      const list = loadRedeemedBenefits();
      list.unshift(redemption);
      storage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch {}

  return redemption;
}

export async function renderBenefitCardCanvas(
  voucher: MobileBenefitRedemption
): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) return null;

  // 1. Fundo Gradiente Vinho Conexão (#4B161B para #22070C)
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, '#4B161B');
  gradient.addColorStop(1, '#22070C');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Moldura Dourada (#C9A227)
  context.strokeStyle = '#C9A227';
  context.lineWidth = 8;
  context.strokeRect(42, 42, 996, 1266);

  // 3. Logo Oficial ou Fallback Tipográfico
  try {
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = '/logoconexao_red.png';
    await new Promise<void>((resolve, reject) => {
      logo.onload = () => resolve();
      logo.onerror = () => reject();
    });
    context.drawImage(logo, 390, 90, 300, 150);
  } catch {
    context.fillStyle = '#E7C65D';
    context.font = 'bold 40px Georgia, serif';
    context.textAlign = 'center';
    context.fillText('CONEXÃO MAÇÔNICA', 540, 160);
  }

  // 4. Header do Cupom
  context.textAlign = 'center';
  context.fillStyle = '#E7C65D';
  context.font = 'bold 34px Arial, sans-serif';
  context.fillText('BENEFÍCIO RESGATADO', 540, 300);

  // 5. Nome da Empresa
  context.fillStyle = '#FFFFFF';
  context.font = 'bold 50px Georgia, serif';
  context.fillText(voucher.businessName.slice(0, 36), 540, 390);

  // 6. Título do Benefício
  context.font = 'bold 42px Arial, sans-serif';
  context.fillStyle = '#F3EEDD';
  context.fillText(voucher.title.slice(0, 42), 540, 500);

  // 7. Selo de Desconto se aplicável
  if (voucher.discountPercentage) {
    context.fillStyle = '#E7C65D';
    context.font = 'bold 60px Arial, sans-serif';
    context.fillText(`${voucher.discountPercentage}% Desconto`, 540, 600);
  }

  // 8. Descrição curta
  context.fillStyle = '#FFFFFF';
  context.font = '26px Arial, sans-serif';
  const descPreview = voucher.description ? voucher.description.slice(0, 70) : 'Condição exclusiva para membros da rede.';
  context.fillText(descPreview, 540, 690);

  // 9. Caixa branca para o código de resgate
  context.fillStyle = '#FDFBF7';
  context.fillRect(145, 760, 790, 220);

  context.fillStyle = '#4B161B';
  context.font = 'bold 28px Arial, sans-serif';
  context.fillText('CÓDIGO DE UTILIZAÇÃO', 540, 825);

  context.font = 'bold 68px monospace';
  context.fillText(voucher.code, 540, 925);

  // 10. Data de Validade e Instruções
  context.fillStyle = '#E7C65D';
  context.font = 'bold 28px Arial, sans-serif';
  context.fillText(`Validade: ${formatVoucherExpiration(voucher.expiresAt)}`, 540, 1060);

  context.fillStyle = '#F3EEDD';
  context.font = '24px Arial, sans-serif';
  context.fillText('Apresente este código no estabelecimento.', 540, 1150);
  context.fillText('Uso pessoal e sujeito às condições da oferta.', 540, 1190);

  return canvas;
}

export async function downloadBenefitVoucher(voucher: MobileBenefitRedemption): Promise<boolean> {
  try {
    const canvas = await renderBenefitCardCanvas(voucher);
    if (!canvas) return false;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `beneficio-${voucher.code}.png`;
    link.href = dataUrl;
    link.click();
    return true;
  } catch {
    return false;
  }
}
