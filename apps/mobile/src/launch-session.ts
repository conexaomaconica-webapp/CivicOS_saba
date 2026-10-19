let launchClaimed = false;

export function claimColdLaunch(reducedMotion: boolean) {
  if (reducedMotion || launchClaimed) return false;
  launchClaimed = true;
  return true;
}

