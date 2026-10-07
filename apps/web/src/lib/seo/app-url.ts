// Domínio canônico: com www (o domínio sem www redireciona para ele). NEXT_PUBLIC_APP_URL pode sobrescrever.
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.conexaomaconica.com.br').replace(/\/+$/, '');

export function getAppUrl(): string {
  return APP_URL;
}

export function appUrl(path: string): string {
  return `${APP_URL}${path}`;
}