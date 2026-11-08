// Plein écran, verrouillage paysage et Wake Lock (écran toujours allumé).

let wakeLock = null;
let wantLock = false;

async function requestWakeLock() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    console.warn('Wake Lock refusé', e);
  }
}

// Le verrou est relâché quand l'onglet passe en arrière-plan : on le redemande au retour.
document.addEventListener('visibilitychange', () => {
  if (wantLock && document.visibilityState === 'visible' && !wakeLock) requestWakeLock();
});

export async function keepAwake(on) {
  wantLock = on;
  if (on) await requestWakeLock();
  else if (wakeLock) { await wakeLock.release().catch(() => {}); wakeLock = null; }
}

export const wakeLockSupported = () => 'wakeLock' in navigator;

export async function enterFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
    try { await req.call(el, { navigationUI: 'hide' }); } catch { /* refusé ou non supporté (iPhone) */ }
  }
  try { await screen.orientation?.lock?.('landscape'); } catch { /* non supporté */ }
}

export async function exitFullscreen() {
  try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) {
    try { await exit.call(document); } catch { /* ignore */ }
  }
}
