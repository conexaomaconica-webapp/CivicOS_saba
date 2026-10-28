const MOBILE_STORAGE_KEY_SESSION = 'cm_mobile_launch_shown';
const MOBILE_STORAGE_KEY_PERMANENT = 'cm_mobile_launch_last_seen_ts';
const MOBILE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

let launchClaimed = false;

export function claimColdLaunch(reducedMotion: boolean): boolean {
  if (reducedMotion || launchClaimed) return false;

  if (typeof window !== 'undefined') {
    try {
      if (window.sessionStorage?.getItem(MOBILE_STORAGE_KEY_SESSION) === '1') {
        return false;
      }
      const lastSeen = window.localStorage?.getItem(MOBILE_STORAGE_KEY_PERMANENT);
      if (lastSeen && Date.now() - Number(lastSeen) < MOBILE_COOLDOWN_MS) {
        return false;
      }
      window.sessionStorage?.setItem(MOBILE_STORAGE_KEY_SESSION, '1');
      window.localStorage?.setItem(MOBILE_STORAGE_KEY_PERMANENT, String(Date.now()));
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


