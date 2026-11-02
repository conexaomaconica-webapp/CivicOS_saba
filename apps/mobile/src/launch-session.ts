const MOBILE_STORAGE_KEY_SESSION = 'cm_mobile_launch_shown';
const MOBILE_STORAGE_KEY_PERMANENT = 'cm_mobile_launch_last_seen_ts';

let launchClaimed = false;

export function claimColdLaunch(reducedMotion: boolean): boolean {
  if (reducedMotion || launchClaimed) return false;

  if (typeof window !== 'undefined') {
    try {
      // Limpa chaves legadas de bloqueio para garantir que toda inicialização a frio funcione
      window.sessionStorage?.removeItem(MOBILE_STORAGE_KEY_SESSION);
      window.localStorage?.removeItem(MOBILE_STORAGE_KEY_PERMANENT);
    } catch {}
  }

  launchClaimed = true;
  return true;
}

export function resetLaunchSessionForTesting(): void {
  launchClaimed = false;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.removeItem(MOBILE_STORAGE_KEY_SESSION);
      window.localStorage?.removeItem(MOBILE_STORAGE_KEY_PERMANENT);
    } catch {}
  }
}
