/**
 * Constantes e funções puras do convite de cadastro, seguras para componentes de navegador (sem módulos de servidor).
 */

export const MASONIC_RELATIONS = ['mason', 'mason_spouse', 'mason_family'] as const;
export type MasonicRelation = (typeof MASONIC_RELATIONS)[number];

export const MASONIC_RELATION_LABEL: Record<MasonicRelation, string> = {
  mason: 'Maçom',
  mason_spouse: 'Cunhada (esposa de maçom)',
  mason_family: 'Sobrinho(a) / familiar de maçom',
};

/** Mensagem pronta (WhatsApp, e-mail ou qualquer conversa) com o link do convite. */
export function buildInviteShareMessage(params: { name?: string | null; link: string; daysLeft: number }): string {
  const greeting = params.name?.trim() ? `Olá, ${params.name.trim()}!` : 'Olá!';
  const validity = params.daysLeft <= 1 ? 'válido até amanhã' : `válido por ${params.daysLeft} dias`;
  return `${greeting} Aqui é da equipe da Conexão Maçônica. Para cadastrar a sua empresa no Guia, preencha seus dados neste link (leva poucos minutos):

${params.link}

O link é pessoal e de uso único, e ${validity}. Nada é publicado antes de a nossa equipe conferir as informações.`;
}
