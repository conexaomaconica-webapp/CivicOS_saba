/** Tipos da tela "Contas de anunciantes e membros" (admin). */

export type AccountBusinessLink = {
  id: string;
  name: string;
  slug: string | null;
  /** dono = businesses.owner_id; equipe = linha ativa em business_members. */
  relation: 'dono' | 'equipe';
  teamRole?: string;
};

/** Conta de acesso que é dona ou equipe de uma empresa, mas NÃO tem linha em profiles (cadastros antigos). */
export type AccountMissingProfile = {
  userId: string;
  loginEmail: string;
  name: string;
  /** dono = businesses.owner_id; equipe = linha ativa em business_members. */
  relation: 'dono' | 'equipe';
  businesses: Array<{ id: string; name: string }>;
};

export type AccountListItem = {
  id: string;
  name: string;
  /** E-mail de LOGIN (vem do cadastro de acesso, não do cadastro da empresa). */
  loginEmail: string;
  phone: string | null;
  role: string;
  createdAt: string;
  lastSignInAt: string | null;
  blocked: boolean;
  /** Troca de senha obrigatória: pendente, expirada ou nenhuma. */
  passwordChange: 'none' | 'pending' | 'expired';
  /** Origem da troca pendente: senha temporária de conta (admin) ou de representante comercial. */
  passwordChangeKind: 'conta' | 'representante' | null;
  businesses: AccountBusinessLink[];
};
