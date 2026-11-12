/**
 * Chave de ativação do Módulo Comercial Nacional (camada de aplicação).
 * Desativada por padrão. A ativação REAL exige também commercial_settings.module_enabled = true no banco
 * para o tenant (camada de dados): as duas chaves precisam estar ligadas.
 */
export function isCommercialModuleEnvEnabled(): boolean {
  return process.env.FEATURE_COMMERCIAL_MODULE_ENABLED === 'true';
}

/** Rotas da área do representante (login obrigatório; 404 quando o módulo está desativado). */
export function isRepresentativePath(pathname: string): boolean {
  return pathname === '/representante' || pathname.startsWith('/representante/');
}
