// Moteur de séance : calcule à l'avance la liste des événements à partir des
// paramètres et d'une graine aléatoire (une même graine rejoue la même séance),
// puis les joue en temps réel avec requestAnimationFrame.

export const COUNTDOWN = 3; // secondes de compte à rebours avant chaque round
const MIN_GAP = 0.25; // écart minimal entre fin d'une attaque et la suivante (s)

// PRNG déterministe (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newSeed = () => (Math.random() * 2 ** 32) >>> 0;

// Liste des combinaisons (attaque, niveau, côté) autorisées par les paramètres.
export function buildPool(params, library) {
  const sides = params.side === 'both' ? ['droite', 'gauche'] : [params.side];
  const pool = [];
  for (const a of library.attacks) {
    if (!params.attacks.includes(a.id)) continue;
    const levels = a.levels.filter((l) => params.levels.includes(l));
    if (levels.length) pool.push({ attack: a, levels, sides });
  }
  return pool;
}

// Écart (début à début) entre deux attaques.
function nextGap(params, rand) {
  const minGap = params.display + MIN_GAP;
  const g = params.mode === 'random'
    ? params.intervalMin + rand() * Math.max(0, params.intervalMax - params.intervalMin)
    : params.interval;
  return Math.max(g, minGap);
}

export function buildSession(params, library, seed = newSeed()) {
  const rand = rng(seed);
  const pool = buildPool(params, library);
  if (!pool.length) throw new Error('Aucune attaque ne correspond aux réglages (attaques / niveaux).');
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const events = [];
  let t = 0;
  let last = null;
  for (let r = 1; r <= params.rounds; r++) {
    // Compte à rebours : au départ, ou pendant les dernières secondes du repos.
    const countFrom = r === 1 ? t : t - COUNTDOWN;
    if (r === 1 || params.rest >= COUNTDOWN + 1) {
      for (let i = 0; i < COUNTDOWN; i++) events.push({ t: countFrom + i, type: 'count', n: COUNTDOWN - i, round: r });
    }
    if (r === 1) t += COUNTDOWN;

    const roundStart = t;
    const roundEnd = t + params.roundDuration;
    events.push({ t: roundStart, type: 'roundStart', round: r });

    let at = roundStart + Math.min(nextGap(params, rand), 2); // première attaque rapide
    while (at + params.display <= roundEnd - 0.2) {
      let choice;
      for (let tries = 0; tries < 3; tries++) {
        const p = pick(pool);
        choice = { attackId: p.attack.id, level: pick(p.levels), side: pick(p.sides) };
        if (!last || choice.attackId !== last.attackId || choice.level !== last.level || choice.side !== last.side) break;
      }
      last = choice;
      events.push({ t: at, type: 'attack', round: r, dur: params.display, ...choice });
      events.push({ t: at + params.display, type: 'guard', round: r });
      at += nextGap(params, rand);
    }

    events.push({ t: roundEnd, type: 'roundEnd', round: r });
    t = roundEnd;
    if (r < params.rounds) {
      events.push({ t, type: 'rest', round: r, until: t + params.rest });
      t += params.rest;
    }
  }
  events.push({ t, type: 'end' });
  events.sort((a, b) => a.t - b.t);
  return { seed, events, duration: t };
}

// Lecteur temps réel. onEvent(ev, isLatest) est appelé pour chaque événement
// échu ; isLatest=false si plusieurs événements tombent dans la même frame
// (ex. retour d'onglet) afin de ne jouer que le dernier son.
export class Player {
  constructor(session, { onEvent, onTick }) {
    this.session = session;
    this.onEvent = onEvent;
    this.onTick = onTick;
    this.idx = 0;
    this.running = false;
    this.paused = false;
    this.offset = 0; // temps écoulé accumulé avant la dernière reprise (s)
    this.t0 = 0;
    this._loop = this._loop.bind(this);
  }

  get elapsed() {
    return this.paused || !this.running ? this.offset : this.offset + (performance.now() - this.t0) / 1000;
  }

  start() {
    this.running = true;
    this.paused = false;
    this.t0 = performance.now();
    requestAnimationFrame(this._loop);
  }

  pause() {
    if (!this.running || this.paused) return;
    this.offset = this.elapsed;
    this.paused = true;
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.t0 = performance.now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.offset = this.elapsed;
    this.running = false;
  }

  _loop() {
    if (!this.running || this.paused) return;
    const now = this.elapsed;
    const evs = this.session.events;
    const due = [];
    while (this.idx < evs.length && evs[this.idx].t <= now) due.push(evs[this.idx++]);
    due.forEach((ev, i) => this.onEvent(ev, i === due.length - 1));
    if (!this.running) return; // stoppé par un événement (fin)
    this.onTick(now);
    requestAnimationFrame(this._loop);
  }
}
