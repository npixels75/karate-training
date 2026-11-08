import { buildSession, buildPool, Player } from './engine.js';
import { unlock, sounds } from './audio.js';
import { listPrograms, saveProgram, deleteProgram, MAX_PROGRAMS } from './storage.js';
import { keepAwake, enterFullscreen, exitFullscreen } from './screen.js';
import { DEFAULTS, PRESETS, describe, fmtTime } from './programs.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Construit un élément DOM sans innerHTML (les noms de programmes sont saisis par l'utilisateur).
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat().filter((c) => c != null));
  return el;
}

const state = {
  library: null,
  userPrograms: [],
  editing: null,
  run: null, // séance en cours
};

function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- Accueil
function renderHome() {
  const list = $('#program-list');
  list.replaceChildren();
  const all = [...PRESETS, ...state.userPrograms];
  for (const p of all) {
    list.append(h('article', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h3', {}, p.name),
        p.preset ? h('span', { class: 'badge' }, 'Prédéfini') : null),
      h('p', { class: 'card-desc' }, describe(p)),
      h('div', { class: 'card-actions' },
        h('button', { class: 'btn primary', onclick: () => startSession(p) }, '▶ Démarrer'),
        h('button', { class: 'btn ghost', onclick: () => openEditor(p) }, p.preset ? 'Personnaliser' : 'Modifier'))));
  }
  const n = state.userPrograms.length;
  $('#btn-new').disabled = n >= MAX_PROGRAMS;
  $('#slots-info').textContent = `${n} / ${MAX_PROGRAMS} programmes personnels enregistrés`;
}

// ---------------------------------------------------------------- Éditeur
const form = $('#form');

function buildPickers() {
  const { library } = state;
  const picker = $('#attack-picker');
  for (const [cat, label] of Object.entries(library.categories)) {
    const attacks = library.attacks.filter((a) => a.category === cat);
    if (!attacks.length) continue;
    const chips = h('div', { class: 'chips' }, attacks.map((a) =>
      h('label', { class: 'chip' }, h('input', { type: 'checkbox', name: 'attacks', value: a.id }), h('span', {}, a.nameJp))));
    const toggle = h('button', {
      type: 'button',
      class: 'link',
      onclick: () => {
        const boxes = $$('input', chips);
        const allOn = boxes.every((b) => b.checked);
        boxes.forEach((b) => { b.checked = !allOn; });
        validate();
      },
    }, 'tout / rien');
    picker.append(h('div', { class: 'sublabel' }, label, ' ', toggle), chips);
  }
  $('#level-picker').append(...Object.entries(library.levels).map(([id, label]) =>
    h('label', { class: 'chip' }, h('input', { type: 'checkbox', name: 'levels', value: id }), h('span', {}, label))));
}

function setSeg(name, value) {
  $$(`.seg[data-name="${name}"] button`).forEach((b) => b.classList.toggle('on', b.value === value));
  if (name === 'mode') {
    $$('[data-show]').forEach((el) => { el.hidden = el.dataset.show !== `mode=${value}`; });
  }
}
const getSeg = (name) => $(`.seg[data-name="${name}"] button.on`)?.value;

function fillForm(p) {
  form.name.value = p.name;
  for (const k of ['interval', 'intervalMin', 'intervalMax', 'display', 'rounds', 'roundDuration', 'rest']) form[k].value = p[k];
  ['mode', 'side', 'sound'].forEach((k) => setSeg(k, p[k]));
  $$('input[name="attacks"]', form).forEach((b) => { b.checked = p.attacks.includes(b.value); });
  $$('input[name="levels"]', form).forEach((b) => { b.checked = p.levels.includes(b.value); });
  form.showName.checked = p.showName;
  validate();
}

function readForm() {
  const num = (k, min, max) => Math.min(max, Math.max(min, parseFloat(form[k].value) || DEFAULTS[k]));
  return {
    ...state.editing,
    name: form.name.value.trim(),
    mode: getSeg('mode'),
    interval: num('interval', 0.5, 10),
    intervalMin: num('intervalMin', 0.5, 10),
    intervalMax: num('intervalMax', 0.5, 10),
    display: num('display', 0.3, 3),
    rounds: Math.round(num('rounds', 1, 12)),
    roundDuration: Math.round(num('roundDuration', 10, 600)),
    rest: Math.round(num('rest', 0, 300)),
    attacks: $$('input[name="attacks"]:checked', form).map((b) => b.value),
    levels: $$('input[name="levels"]:checked', form).map((b) => b.value),
    side: getSeg('side'),
    sound: getSeg('sound'),
    showName: form.showName.checked,
  };
}

// Renvoie un message d'erreur bloquant, ou null. Affiche aussi les avertissements.
function validate() {
  const p = readForm();
  $('output[data-for="display"]').textContent = p.display.toFixed(1);
  const minGap = p.mode === 'regular' ? p.interval : p.intervalMin;
  const warn = $('#rhythm-warn');
  warn.hidden = minGap >= p.display + 0.25;
  warn.textContent = `L'intervalle (${minGap} s) est trop court pour la durée d'affichage : les attaques seront espacées d'au moins ${(p.display + 0.25).toFixed(2)} s.`;

  let err = null;
  if (p.mode === 'random' && p.intervalMax < p.intervalMin) err = 'Le maximum doit être supérieur ou égal au minimum.';
  else if (!buildPool(p, state.library).length) err = 'Sélectionnez au moins une attaque disponible dans les niveaux choisis.';
  const box = $('#form-error');
  box.hidden = !err;
  box.textContent = err || '';
  return err;
}

function openEditor(p) {
  const isNew = !p || p.preset;
  state.editing = p?.preset
    ? { ...p, id: undefined, preset: false, createdAt: undefined, name: `${p.name} (perso)` }
    : { ...DEFAULTS, ...(p || {}) };
  $('#editor-title').textContent = isNew ? 'Nouveau programme' : 'Modifier le programme';
  $('[data-action="delete"]', form).hidden = isNew;
  fillForm(state.editing);
  show('editor');
}

form.addEventListener('input', validate);
form.addEventListener('submit', (e) => e.preventDefault());
$$('.seg').forEach((seg) => seg.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  setSeg(seg.dataset.name, b.value);
  validate();
}));

form.addEventListener('click', async (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'delete') {
    if (!confirm(`Supprimer « ${state.editing.name} » ?`)) return;
    await deleteProgram(state.editing.id);
    return goHome();
  }
  if (validate()) return;
  const p = readForm();
  if (action === 'try') return startSession({ ...p, name: p.name || 'Séance libre' });
  if (action === 'save') {
    if (!p.name) {
      $('#form-error').hidden = false;
      $('#form-error').textContent = 'Donnez un nom au programme.';
      form.name.focus();
      return;
    }
    if (!p.id && state.userPrograms.length >= MAX_PROGRAMS) {
      $('#form-error').hidden = false;
      $('#form-error').textContent = `Maximum ${MAX_PROGRAMS} programmes : supprimez-en un d'abord.`;
      return;
    }
    await saveProgram(p);
    goHome();
  }
});
$('#editor [data-action="back"]').addEventListener('click', () => goHome());

async function goHome() {
  state.userPrograms = await listPrograms();
  renderHome();
  show('home');
}

// ---------------------------------------------------------------- Médias
const mediaCache = new Map();

function mediaEl(m) {
  if (mediaCache.has(m.src)) return mediaCache.get(m.src);
  let el;
  if (m.type === 'video') {
    el = h('video', { src: m.src, muted: true, playsinline: true, preload: 'auto' });
    el.muted = true;
  } else {
    el = h('img', { src: m.src, alt: '', draggable: 'false' });
  }
  mediaCache.set(m.src, el);
  return el;
}

function preload(list) {
  return Promise.all(list.map((m) => {
    const el = mediaEl(m);
    if (el.tagName === 'IMG') return el.decode?.().catch(() => {});
    return Promise.resolve();
  }));
}

// Média d'une attaque : un fichier propre au côté s'il existe, sinon miroir du côté droit.
function mediaFor(attack, level, side) {
  const own = attack.media[`${level}-${side}`];
  if (own) return { m: own, mirror: false };
  return { m: attack.media[level], mirror: side === 'gauche' };
}

function showMedia(m, mirror = false) {
  const box = $('#media');
  const el = mediaEl(m);
  if (box.firstChild !== el) box.replaceChildren(el);
  box.classList.toggle('mirror', mirror);
  if (el.tagName === 'VIDEO') { el.currentTime = 0; el.play().catch(() => {}); }
}

// ---------------------------------------------------------------- Séance
const attackById = (id) => state.library.attacks.find((a) => a.id === id);

function setOverlay(text, cls = '') {
  const o = $('#overlay');
  o.className = `overlay ${cls}`;
  o.textContent = text;
}

async function startSession(program, seed) {
  // Appels liés au geste utilisateur d'abord (audio, plein écran).
  unlock();
  enterFullscreen();
  keepAwake(true);

  let session;
  try {
    session = buildSession(program, state.library, seed);
  } catch (e) {
    alert(e.message);
    return;
  }
  const pool = buildPool(program, state.library);
  await preload([state.library.guard, ...pool.flatMap((p) => p.levels.map((l) => p.attack.media[l]))]);

  const run = {
    program,
    session,
    phase: { type: 'countdown', until: 3 },
    round: 1,
    stats: { attacks: 0, byAttack: {}, bySide: {}, byLevel: {}, roundsDone: 0 },
    completed: false,
  };
  state.run = run;
  showMedia(state.library.guard);
  $('#attack-name').textContent = '';
  setOverlay('Prêt', 'big');
  updateHud(0);
  show('session');

  run.player = new Player(session, {
    onEvent: (ev, latest) => handleEvent(run, ev, latest),
    onTick: (t) => updateHud(t),
  });
  run.player.start();
}

function play(run, name, latest) {
  if (!latest || run.program.sound === 'off') return;
  if (name === 'attack' && run.program.sound !== 'all') return;
  sounds[name]();
}

function handleEvent(run, ev, latest) {
  const p = run.program;
  switch (ev.type) {
    case 'count':
      setOverlay(String(ev.n), 'big count');
      play(run, 'count', latest);
      break;
    case 'roundStart':
      run.round = ev.round;
      run.phase = { type: 'round', until: ev.t + p.roundDuration };
      setOverlay('Hajime !', 'flash');
      showMedia(state.library.guard);
      play(run, 'start', latest);
      break;
    case 'attack': {
      const a = attackById(ev.attackId);
      const { m, mirror } = mediaFor(a, ev.level, ev.side);
      showMedia(m, mirror);
      if (p.showName) {
        $('#attack-name').replaceChildren(
          h('strong', {}, a.nameJp),
          h('span', {}, `${state.library.levels[ev.level]} · ${ev.side}`));
      }
      $('#stage').classList.add('attacking');
      const s = run.stats;
      s.attacks++;
      s.byAttack[a.id] = (s.byAttack[a.id] || 0) + 1;
      s.bySide[ev.side] = (s.bySide[ev.side] || 0) + 1;
      s.byLevel[ev.level] = (s.byLevel[ev.level] || 0) + 1;
      if (!$('#overlay').classList.contains('flash')) setOverlay('');
      play(run, 'attack', latest);
      break;
    }
    case 'guard':
      showMedia(state.library.guard);
      $('#attack-name').textContent = '';
      $('#stage').classList.remove('attacking');
      break;
    case 'roundEnd':
      run.stats.roundsDone = ev.round;
      showMedia(state.library.guard);
      $('#attack-name').textContent = '';
      $('#stage').classList.remove('attacking');
      setOverlay('Yame !', 'big');
      play(run, 'roundEnd', latest);
      break;
    case 'rest':
      run.phase = { type: 'rest', until: ev.until };
      setTimeout(() => { if (state.run === run && run.phase.type === 'rest') setOverlay('Repos', 'big rest'); }, 1200);
      break;
    case 'end':
      run.completed = true;
      play(run, 'end', latest);
      finishSession();
      break;
  }
}

function updateHud(t) {
  const run = state.run;
  if (!run) return;
  const p = run.program;
  $('#hud-round').textContent = `Round ${run.round} / ${p.rounds}`;
  const { phase } = run;
  const remaining = phase.until - t;
  $('#hud-time').textContent = phase.type === 'rest' ? `Repos ${fmtTime(remaining)}` : fmtTime(phase.type === 'round' ? remaining : p.roundDuration);
  // Le message « Hajime ! » s'efface après un court instant.
  const o = $('#overlay');
  if (o.classList.contains('flash') && phase.type === 'round' && p.roundDuration - remaining > 0.8) setOverlay('');
}

function togglePause() {
  const run = state.run;
  if (!run) return;
  if (run.player.paused) {
    unlock();
    run.player.resume();
    setOverlay('');
    $('#btn-pause').textContent = '❚❚';
  } else {
    run.player.pause();
    setOverlay('Pause\ntouchez pour reprendre', 'big paused');
    $('#btn-pause').textContent = '▶';
  }
}

$('#stage').addEventListener('click', togglePause);
$('#btn-pause').addEventListener('click', togglePause);
$('#btn-stop').addEventListener('click', () => finishSession());
document.addEventListener('keydown', (e) => {
  if (!$('#session').classList.contains('active')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.run && !state.run.player.paused) togglePause();
});

function finishSession() {
  const run = state.run;
  if (!run) return;
  run.player.stop();
  state.run = null;
  keepAwake(false);
  exitFullscreen();
  $('#btn-pause').textContent = '❚❚';
  $('#stage').classList.remove('attacking');
  renderSummary(run);
  show('summary');
}

// ---------------------------------------------------------------- Résumé
function renderSummary(run) {
  const { stats: s, program: p } = run;
  $('#sum-title').textContent = `${p.name}${run.completed ? '' : ' · interrompue'}`;
  const stat = (value, label) => h('div', { class: 'stat' }, h('strong', {}, String(value)), h('span', {}, label));
  $('#sum-stats').replaceChildren(
    stat(s.attacks, 'attaques'),
    stat(`${s.roundsDone} / ${p.rounds}`, 'rounds'),
    stat(fmtTime(run.player.elapsed), 'durée totale'));

  const bars = (title, entries) => {
    const max = Math.max(1, ...entries.map(([, n]) => n));
    return h('div', { class: 'breakdown' }, h('h3', {}, title), entries.map(([label, n]) =>
      h('div', { class: 'bar-row' },
        h('span', { class: 'bar-label' }, label),
        h('span', { class: 'bar' }, h('span', { style: `width:${(n / max) * 100}%` })),
        h('span', { class: 'bar-n' }, String(n)))));
  };
  const lib = state.library;
  const byAttack = Object.entries(s.byAttack).sort((a, b) => b[1] - a[1]).map(([id, n]) => [attackById(id).nameJp, n]);
  const byLevel = Object.keys(lib.levels).filter((l) => s.byLevel[l]).map((l) => [lib.levels[l], s.byLevel[l]]);
  const bySide = ['droite', 'gauche'].filter((x) => s.bySide[x]).map((x) => [x[0].toUpperCase() + x.slice(1), s.bySide[x]]);
  $('#sum-breakdown').replaceChildren(
    ...(s.attacks ? [bars('Par attaque', byAttack), bars('Par niveau', byLevel), bars('Par côté', bySide)] : []));

  state.lastRun = run;
}

$('#summary').addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  const last = state.lastRun;
  if (action === 'replay') startSession(last.program, last.session.seed);
  else if (action === 'again') startSession(last.program);
  else if (action === 'home') goHome();
});

$('#btn-new').addEventListener('click', () => openEditor(null));

// ---------------------------------------------------------------- Démarrage
async function init() {
  state.library = await fetch('data/attacks.json').then((r) => r.json());
  buildPickers();
  await goHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
}

init();
