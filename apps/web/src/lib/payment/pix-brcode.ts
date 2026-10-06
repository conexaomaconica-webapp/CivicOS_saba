/**
 * PIX estático (BR Code / "copia e cola") conforme o Manual de Padrões para Iniciação do Pix do Banco Central.
 * Código puro, sem dependências: gera o texto do QR para uma chave Pix, com valor e identificador (txid).
 * O pagamento cai direto na conta da chave; não há consulta automática de recebimento (a baixa é conferida pela equipe).
 */

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16Ccitt(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Texto aceito pelo BR Code: maiúsculas, sem acento, só letras, números e espaço, no tamanho máximo do campo. */
export function sanitizePixText(text: string, max: number): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Identificador da transação: 1 a 25 letras/números (sem símbolos). */
export function sanitizeTxid(txid: string): string {
  return String(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
}

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

export interface StaticPixInput {
  /** Chave Pix de destino (CNPJ, e-mail, telefone, EVP...). Usada exatamente como cadastrada no banco. */
  key: string;
  /** Nome do recebedor (até 25 caracteres). */
  name: string;
  /** Cidade do recebedor (até 15 caracteres). */
  city: string;
  amountCents: number;
  txid: string;
}

export function buildStaticPixPayload(input: StaticPixInput): string {
  const key = String(input.key || '').trim();
  if (!key) throw new Error('Chave Pix não informada.');
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) throw new Error('Valor do Pix inválido.');

  const amount = (Math.round(input.amountCents) / 100).toFixed(2);
  const merchantAccount = field('00', 'br.gov.bcb.pix') + field('01', key);

  const withoutCrc =
    field('00', '01') +
    field('01', '11') +
    field('26', merchantAccount) +
    field('52', '0000') +
    field('53', '986') +
    field('54', amount) +
    field('58', 'BR') +
    field('59', sanitizePixText(input.name, 25) || 'RECEBEDOR') +
    field('60', sanitizePixText(input.city, 15) || 'BRASIL') +
    field('62', field('05', sanitizeTxid(input.txid))) +
    '6304';

  return withoutCrc + crc16Ccitt(withoutCrc);
}
