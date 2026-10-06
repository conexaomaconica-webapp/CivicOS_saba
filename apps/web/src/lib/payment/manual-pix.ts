import QRCode from 'qrcode';
import { buildStaticPixPayload, sanitizeTxid } from '@/lib/payment/pix-brcode';

/**
 * PIX manual (alternativa enquanto a conta do Asaas não é aprovada). Só servidor.
 *
 * Variáveis de ambiente:
 *   MANUAL_PIX_KEY   chave Pix da conta que vai receber (CNPJ, e-mail, telefone ou chave aleatória)
 *   MANUAL_PIX_NAME  nome do recebedor, como no banco (até 25 caracteres)
 *   MANUAL_PIX_CITY  cidade do recebedor (até 15 caracteres)
 * Sem as três, o recurso fica desligado e o comportamento não muda.
 */
export interface ManualPixConfig {
  key: string;
  name: string;
  city: string;
}

export function getManualPixConfig(): ManualPixConfig | null {
  const key = (process.env.MANUAL_PIX_KEY || '').trim();
  const name = (process.env.MANUAL_PIX_NAME || '').trim();
  const city = (process.env.MANUAL_PIX_CITY || '').trim();
  return key && name && city ? { key, name, city } : null;
}

/** O Asaas recusa PIX enquanto a conta não é aprovada: "...sua conta precisa estar aprovada" (invalid_billingType). */
export function isAccountNotApprovedError(message: string | undefined): boolean {
  const text = String(message || '').toLowerCase();
  return /conta.*(aprova|an[aá]lise|pendente)|account.*(approved|pending)/.test(text) && /pix/.test(text);
}

export interface ManualPixCharge {
  paymentId: string;
  txid: string;
  pixCopiaECola: string;
  qrCodeBase64: string;
}

/** Gera o Pix copia-e-cola e a imagem do QR (data URL) para o valor da fatura. O valor vem sempre do servidor. */
export async function buildManualPixCharge(params: { invoiceId: string; amountCents: number }): Promise<ManualPixCharge | null> {
  const config = getManualPixConfig();
  if (!config) return null;
  // Identificador curto e rastreável a partir da fatura (aparece no comprovante de alguns bancos).
  const txid = sanitizeTxid(`CM${params.invoiceId.replace(/-/g, '')}`);
  const pixCopiaECola = buildStaticPixPayload({
    key: config.key,
    name: config.name,
    city: config.city,
    amountCents: params.amountCents,
    txid,
  });
  const qrCodeBase64 = await QRCode.toDataURL(pixCopiaECola, { margin: 1, width: 320, errorCorrectionLevel: 'M' });
  return { paymentId: `manual_pix_${txid}`, txid, pixCopiaECola, qrCodeBase64 };
}
