// Sons synthétisés avec Web Audio (aucun fichier, aucune latence de chargement).
// unlock() doit être appelé depuis un geste utilisateur (bouton Démarrer).

let ctx = null;
let master = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  // Son silencieux : débloque l'audio sur iOS.
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  g.gain.value = 0;
  o.connect(g).connect(master);
  o.start();
  o.stop(ctx.currentTime + 0.01);
}

function tone(freq, dur, { type = 'sine', vol = 0.5, at = 0, attack = 0.005 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sounds = {
  count: () => tone(660, 0.15, { type: 'square', vol: 0.25 }),
  start: () => tone(990, 0.45, { type: 'square', vol: 0.3 }),
  attack: () => tone(1400, 0.07, { type: 'triangle', vol: 0.45 }),
  roundEnd: () => {
    // Gong : partiels inharmoniques à décroissance lente.
    [[180, 0.5], [362, 0.3], [544, 0.18], [811, 0.1]].forEach(([f, v]) => tone(f, 2.2, { vol: v, attack: 0.01 }));
  },
  end: () => {
    sounds.roundEnd();
    tone(880, 0.25, { type: 'square', vol: 0.2, at: 0.3 });
    tone(1175, 0.4, { type: 'square', vol: 0.2, at: 0.6 });
  },
};
