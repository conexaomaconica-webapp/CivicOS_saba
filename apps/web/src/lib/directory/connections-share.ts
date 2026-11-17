/** Utilidades da página individual de conexão e do compartilhamento (sem dependências de servidor). */

export type ConnectionKind = 'compra' | 'servico' | 'parceria' | 'visita';

export type ShareableConnection = {
  id: string;
  connection_type: ConnectionKind;
  item_description: string | null;
  message: string | null;
  photo_url: string | null;
  member_first_name: string;
  business_name: string;
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** O identificador público é o id (UUID) da conexão: valida o formato ANTES de consultar o banco. */
export function isConnectionId(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value);
}

export const connectionPath = (id: string): string => `/conexoes/${id}`;

export const CONNECTION_TYPE_NAME: Record<ConnectionKind, string> = {
  compra: 'Compra',
  servico: 'Serviço',
  parceria: 'Parceria',
  visita: 'Visita',
};

const VERB: Record<ConnectionKind, { verb: string; preposition: string }> = {
  compra: { verb: 'comprou', preposition: 'em' },
  servico: { verb: 'contratou', preposition: 'em' },
  parceria: { verb: 'firmou parceria', preposition: 'com' },
  visita: { verb: 'visitou', preposition: '' },
};

const clean = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

/** "João comprou pães artesanais em Padaria São José" (texto simples, para título, descrição e WhatsApp). */
export function connectionSentence(item: Pick<ShareableConnection, 'connection_type' | 'item_description' | 'member_first_name' | 'business_name'>): string {
  const v = VERB[item.connection_type] ?? VERB.compra;
  return [clean(item.member_first_name), v.verb, clean(item.item_description), v.preposition, clean(item.business_name)].filter(Boolean).join(' ');
}

const truncate = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

export type ConnectionPageMetadata = {
  title: string;
  description: string;
  imageUrl: string;
  imageIsPhoto: boolean;
};

/**
 * Metadados da página: título contextual, descrição (depoimento autorizado ou frase padrão) e imagem de prévia.
 * A imagem de prévia é SEMPRE a institucional (a foto aprovada para o mural não tem autorização para redes sociais).
 * `fallbackImageUrl` deve ser absoluta.
 */
export function buildConnectionMetadata(item: ShareableConnection, fallbackImageUrl: string): ConnectionPageMetadata {
  const typeName = CONNECTION_TYPE_NAME[item.connection_type] ?? 'Conexão';
  const business = clean(item.business_name);
  const title = `${typeName} em ${business} | Mural de Conexões | Conexão Maçônica`;
  const message = clean(item.message);
  const description = message
    ? truncate(`“${message}” ${connectionSentence(item)}. Conexão confirmada pela empresa.`, 200)
    : truncate(`${connectionSentence(item)}. Conexão confirmada pela empresa na rede Conexão Maçônica.`, 200);
  // Decisão de privacidade: a foto do mural NÃO vira imagem de prévia (a autorização cobre o mural, não redes sociais).
  return { title, description, imageUrl: fallbackImageUrl, imageIsPhoto: false };
}

/** Texto do compartilhamento: contextual, com a empresa e o endereço da conexão. */
export function buildShareText(item: Pick<ShareableConnection, 'connection_type' | 'item_description' | 'member_first_name' | 'business_name'>, url: string): string {
  return `${connectionSentence(item)}: uma conexão confirmada na Conexão Maçônica.\n${url}`;
}

export function buildWhatsAppShareUrl(item: Pick<ShareableConnection, 'connection_type' | 'item_description' | 'member_first_name' | 'business_name'>, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildShareText(item, url))}`;
}
