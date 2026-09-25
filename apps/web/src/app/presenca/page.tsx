import { redirect } from 'next/navigation';

/**
 * Rota curta /presenca → redireciona para o evento ativo de lançamento.
 * Futuro: resolver dinamicamente o evento marcado como "featured" ou "primary".
 */
export default function PresencaRedirectPage() {
  redirect('/eventos/conexao-empresarial-2026');
}
