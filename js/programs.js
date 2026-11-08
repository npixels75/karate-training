// Programmes prédéfinis et valeurs par défaut.

const ALL = ['oi-zuki', 'gyaku-zuki', 'kizami-zuki', 'uraken-uchi', 'mae-geri', 'mawashi-geri',
  'yoko-geri-kekomi', 'ushiro-geri', 'ura-mawashi-geri', 'eri-tori'];

export const DEFAULTS = {
  name: '',
  mode: 'random', // 'regular' | 'random'
  interval: 3, // s, mode régulier (début à début)
  intervalMin: 1.5, // s, mode aléatoire
  intervalMax: 4,
  display: 1, // s, durée d'affichage de l'attaque
  rounds: 3,
  roundDuration: 120, // s
  rest: 30, // s
  attacks: ALL,
  levels: ['jodan', 'chudan', 'gedan'],
  side: 'both', // 'both' | 'droite' | 'gauche'
  sound: 'signals', // 'signals' | 'all' | 'off'
  showName: true,
};

export const PRESETS = [
  {
    ...DEFAULTS,
    id: 'preset-echauffement',
    preset: true,
    name: 'Échauffement',
    mode: 'regular',
    interval: 4,
    display: 1.5,
    rounds: 2,
    roundDuration: 90,
    rest: 30,
    attacks: ['oi-zuki', 'gyaku-zuki', 'kizami-zuki', 'mae-geri'],
    levels: ['chudan'],
  },
  {
    ...DEFAULTS,
    id: 'preset-kumite',
    preset: true,
    name: 'Kumite 3×2 min',
    mode: 'random',
    intervalMin: 1.5,
    intervalMax: 4,
    display: 0.8,
    rounds: 3,
    roundDuration: 120,
    rest: 45,
  },
  {
    ...DEFAULTS,
    id: 'preset-reflexes-jodan',
    preset: true,
    name: 'Réflexes jodan',
    mode: 'random',
    intervalMin: 1,
    intervalMax: 2.5,
    display: 0.5,
    rounds: 4,
    roundDuration: 60,
    rest: 30,
    levels: ['jodan'],
  },
];

export const fmtTime = (s) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function describe(p) {
  const rhythm = p.mode === 'regular' ? `toutes les ${p.interval} s` : `${p.intervalMin}–${p.intervalMax} s aléatoire`;
  return `${p.rounds} × ${fmtTime(p.roundDuration)} · repos ${fmtTime(p.rest)} · ${rhythm} · affichage ${p.display} s`;
}
