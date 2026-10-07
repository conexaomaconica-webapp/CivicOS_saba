/**
 * Erros das funções do banco chegam como "CODIGO_TECNICO: mensagem em português". A tela mostra só a mensagem; o código
 * fica disponível para a lógica (ex.: UNAUTHORIZED leva ao login) e nunca aparece para o usuário.
 */
export function splitErrorCode(raw: unknown, fallback: string): { code: string | null; message: string } {
  const text = typeof raw === 'string' ? raw.trim() : raw instanceof Error ? raw.message.trim() : '';
  const match = /^([A-Z][A-Z0-9_]{2,}):\s*([\s\S]+)$/.exec(text);
  if (match) return { code: match[1]!, message: match[2]!.trim() };
  return { code: null, message: text || fallback };
}
