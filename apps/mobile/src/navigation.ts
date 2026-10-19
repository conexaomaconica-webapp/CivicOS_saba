export const routes = ['inicio', 'beneficios', 'empresas', 'lojas', 'mais'] as const;

export type Route = (typeof routes)[number];

export const routeLabels: Record<Route, string> = {
  inicio: 'Início',
  beneficios: 'Benefícios',
  empresas: 'Empresas',
  lojas: 'Lojas',
  mais: 'Mais',
};

export function routeFromHash(hash: string): Route {
  const candidate = hash.replace(/^#\/?/, '').split('/')[0];
  return routes.includes(candidate as Route) ? (candidate as Route) : 'inicio';
}

export function routeHref(route: Route): string {
  return `#/${route}`;
}
