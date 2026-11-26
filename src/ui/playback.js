// =============================================================================
//  LECTURE DU COMBAT (UI) — le combat est déjà calculé. On affiche ses lignes
//  de log une par une, à la vitesse choisie, en animant l'arène.
//    ×1 : lisible · ×4 : rapide · instantané (»), log complet d'un coup
// =============================================================================
var G = globalThis.G = globalThis.G || {};
G.UI = G.UI || {};

G.UI.Playback = (function () {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const SPEED_KEY = 'grimoire.speed';
  const SPEEDS = { '1': 1, '4': 4, 'instant': Infinity };

  // Durée d'affichage de chaque ligne à ×1, en ms, selon le type d'événement.
  const DELAYS = { turn: 380, hit: 240, detail: 150, status_tick: 220, enemy_attack: 320, enemy_frozen: 300, default: 220 };

  let speed = '1';
  try { speed = localStorage.getItem(SPEED_KEY) || '1'; } catch (e) { /* pas de stockage */ }
  if (!SPEEDS[speed]) speed = '1';

  let current = null; // lecture en cours

  function lineHtml(l) {
    return `<span class="${l.cls || ''}">${G.Log.colorize(esc(l.text))}</span>`;
  }

  // Effets visuels d'une ligne (pas en mode instantané).
  function animate(l) {
    const ev = l.ev;
    if (!ev) return;
    if (ev.type === 'hit' && !ev.miss && ev.damage > 0) {
      G.UI.Arena.shakeEnemy(l.big);
      G.UI.Arena.pop(G.Log.formatNumber(ev.damage), l.big ? 'pop-big' : '');
    } else if (ev.type === 'status_tick' || ev.type === 'status_trigger') {
      G.UI.Arena.pop(G.Log.formatNumber(ev.damage), 'st-' + (ev.status || 'curse'));
    } else if (ev.type === 'enemy_attack' && !ev.missed && ev.damage > 0) {
      G.UI.Arena.hurtPlayer();
    }
  }

  // Démarre la lecture. opts : { logEl, lines, onDone }
  function play(opts) {
    stop();
    const p = { ...opts, i: 0, timer: null, done: false };
    current = p;
    p.logEl.innerHTML = '';
    schedule(p, 0);
    return p;
  }

  function schedule(p, delay) {
    p.timer = setTimeout(() => step(p), delay);
  }

  function step(p) {
    if (p !== current || p.done) return;
    if (SPEEDS[speed] === Infinity) { finish(p); return; }
    const l = p.lines[p.i++];
    p.logEl.insertAdjacentHTML('beforeend', lineHtml(l) + '\n');
    p.logEl.scrollTop = p.logEl.scrollHeight;
    if (l.ev && l.ev.snap) G.UI.Arena.update(l.ev.snap);
    animate(l);
    if (p.i >= p.lines.length) { end(p); return; }
    const next = p.lines[p.i];
    const base = DELAYS[next.ev && next.ev.type] || DELAYS.default;
    schedule(p, base / SPEEDS[speed]);
  }

  // Affiche tout ce qui reste d'un coup.
  function finish(p) {
    if (!p || p.done) return;
    clearTimeout(p.timer);
    const rest = p.lines.slice(p.i);
    p.logEl.insertAdjacentHTML('beforeend', rest.map(lineHtml).join('\n') + (rest.length ? '\n' : ''));
    p.i = p.lines.length;
    p.logEl.scrollTop = p.logEl.scrollHeight;
    const last = [...p.lines].reverse().find(l => l.ev && l.ev.snap);
    if (last) G.UI.Arena.update(last.ev.snap);
    end(p);
  }

  function end(p) {
    p.done = true;
    if (current === p) current = null;
    if (p.onDone) p.onDone();
  }

  function stop() {
    if (current) { clearTimeout(current.timer); current.done = true; current = null; }
  }

  function isPlaying() { return !!current; }
  function skip() { if (current) finish(current); }

  function getSpeed() { return speed; }
  function setSpeed(s) {
    if (!SPEEDS[s]) return;
    speed = s;
    try { localStorage.setItem(SPEED_KEY, s); } catch (e) { /* pas de stockage */ }
    if (current && SPEEDS[s] === Infinity) finish(current);
  }

  return { play, stop, skip, isPlaying, getSpeed, setSpeed, lineHtml };
})();
