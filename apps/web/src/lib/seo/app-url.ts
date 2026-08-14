const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://conexaomaconica.com.br';

export function getAppUrl(): string {
  return APP_URL;
}

export function appUrl(path: string): string {
  return `${APP_URL}${path}`;
}