export interface RegistrationFields {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * CRIT-TRN-023 — real-time, per-field validation messages.
 */
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Informe seu nome completo.';
  }
  if (trimmed.length < 3) {
    return 'O nome deve ter pelo menos 3 caracteres.';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Informe seu e-mail.';
  }
  if (!EMAIL_RE.test(trimmed)) {
    return 'E-mail inválido. Verifique o formato.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Informe uma senha.';
  }
  if (password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Confirme sua senha.';
  }
  if (password !== confirmPassword) {
    return 'As senhas não coincidem.';
  }
  return null;
}

export function validateRegistration(fields: RegistrationFields): RegistrationErrors {
  const errors: RegistrationErrors = {};

  const name = validateName(fields.name);
  if (name) errors.name = name;

  const email = validateEmail(fields.email);
  if (email) errors.email = email;

  const password = validatePassword(fields.password);
  if (password) errors.password = password;

  const confirmPassword = validateConfirmPassword(fields.password, fields.confirmPassword);
  if (confirmPassword) errors.confirmPassword = confirmPassword;

  return errors;
}

export function hasErrors(errors: RegistrationErrors): boolean {
  return Boolean(
    errors.name ||
    errors.email ||
    errors.password ||
    errors.confirmPassword,
  );
}