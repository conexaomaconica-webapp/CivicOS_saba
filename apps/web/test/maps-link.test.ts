import { describe, expect, it } from 'vitest';
import { isAllowedMapsLink, parseCoordinatesText } from '../src/lib/geo/maps-link';

describe('parseCoordinatesText: coordenadas coladas pelo administrador', () => {
  it.each([
    ['-12.2578934, -38.9598047', { latitude: -12.2578934, longitude: -38.9598047 }],
    ['-12.2578934,-38.9598047', { latitude: -12.2578934, longitude: -38.9598047 }],
    ['  -12.25 -38.95  ', { latitude: -12.25, longitude: -38.95 }],
    ['-12,2578; -38,9598', { latitude: -12.2578, longitude: -38.9598 }],
  ])('par "%s"', (text, expected) => {
    expect(parseCoordinatesText(text)).toEqual(expected);
  });

  it.each([
    ['https://www.google.com/maps/place/Av.+Get%C3%BAlio+Vargas/@-12.2558713,-38.9492709,17z/data=!3m1!4b1', { latitude: -12.2558713, longitude: -38.9492709 }],
    ['https://www.google.com/maps?q=-12.25,-38.95', { latitude: -12.25, longitude: -38.95 }],
    ['https://www.google.com/maps/search/?api=1&query=-12.25%2C-38.95', { latitude: -12.25, longitude: -38.95 }],
    ['https://www.google.com/maps/place/Empresa/data=!4m2!3m1!1s0x0:0x0!3d-12.2601!4d-38.9701', { latitude: -12.2601, longitude: -38.9701 }],
    ['https://maps.google.com/?ll=-12.25,-38.95&z=15', { latitude: -12.25, longitude: -38.95 }],
  ])('link do Google Maps %#', (url, expected) => {
    expect(parseCoordinatesText(url)).toEqual(expected);
  });

  it('o ponto exato (!3d/!4d) vale mais que o centro do mapa (@)', () => {
    const url = 'https://www.google.com/maps/place/X/@-12.30,-38.90,15z/data=!3d-12.2601!4d-38.9701';
    expect(parseCoordinatesText(url)).toEqual({ latitude: -12.2601, longitude: -38.9701 });
  });

  it('rejeita pontos fora do Brasil, texto qualquer e entrada vazia', () => {
    expect(parseCoordinatesText('40.7128, -74.0060')).toBeNull(); // Nova York
    expect(parseCoordinatesText('Rua das Flores, 123')).toBeNull();
    expect(parseCoordinatesText('')).toBeNull();
    expect(parseCoordinatesText(null)).toBeNull();
    expect(parseCoordinatesText('https://site-qualquer.com/@-12.25,-38.95')).toBeNull(); // só links do Google
  });
});

describe('isAllowedMapsLink: o servidor só segue links do Google Maps', () => {
  it('aceita hosts do Google (https)', () => {
    for (const url of ['https://maps.app.goo.gl/abc123', 'https://www.google.com/maps/place/X', 'https://goo.gl/maps/abc', 'https://www.google.com.br/maps']) {
      expect(isAllowedMapsLink(url)).toBe(true);
    }
  });

  it('recusa http, outros hosts, endereços internos e lixo', () => {
    for (const url of [
      'http://maps.app.goo.gl/abc', 'https://evil.example.com/maps', 'https://google.com.evil.com/x', 'https://127.0.0.1/maps',
      'https://localhost/maps', 'https://169.254.169.254/latest/meta-data', 'file:///etc/passwd', 'não é url', '',
    ]) {
      expect(isAllowedMapsLink(url)).toBe(false);
    }
  });
});
