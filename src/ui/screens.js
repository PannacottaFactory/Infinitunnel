// =============================================================================
//  ÉCRANS (UI) — navigation entre écrans, barre d'état, record, mort.
// =============================================================================
var G = globalThis.G = globalThis.G || {};
G.UI = G.UI || {};

G.UI.Screens = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const RECORD_KEY = 'grimoire.record';

  // --- Record (étage max atteint), sauvegardé dans localStorage ----------------
  function loadRecord() {
    try { return JSON.parse(localStorage.getItem(RECORD_KEY)) || { floor: 0 }; }
    catch (e) { return { floor: 0 }; }
  }
  // Renvoie true si c'est un nouveau record.
  function submitRecord(run) {
    const rec = loadRecord();
    if (run.floor <= rec.floor) return false;
    const entry = {
      floor: run.floor,
      seed: run.seed,
      date: new Date().toISOString().slice(0, 10),
      grimoire: run.grimoire.map(s => ({ core: s.core, slots: s.slots.slice() })),
    };
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(entry)); } catch (e) { /* stockage indisponible */ }
    return true;
  }

  // --- Navigation ------------------------------------------------------------------
  function show(name) {
    document.querySelectorAll('[data-screen]').forEach(el => {
      el.hidden = el.dataset.screen !== name;
    });
  }

  function statusBar(run) {
    const f = G.Log.formatNumber;
    const rec = loadRecord();
    const parts = [];
    if (run) {
      parts.push(`ÉTAGE <b>${run.floor}</b>`);
      parts.push(`PV <b class="hp">${f(run.player.hp)}/${f(run.player.maxHp)}</b>`);
    }
    parts.push(`RECORD <b>${rec.floor || '—'}</b>`);
    if (run) parts.push(`graine <span class="tip-dim">${esc(run.seed)}</span>`);
    $('status').innerHTML = parts.join('  │  ');
  }

  function renderStart() {
    const rec = loadRecord();
    $('start-record').innerHTML = rec.floor
      ? `Record : étage <b>${rec.floor}</b> (graine ${esc(rec.seed)}, ${esc(rec.date)})<br>` +
        rec.grimoire.map((s, i) => `<span class="tip-dim">${G.Log.roman(i + 1)}. ${esc(G.Spells.symbol(s.core))} ${esc(s.core)} ` +
          s.slots.map(n => '[' + esc(n || ' · ') + ']').join(' ') + '</span>').join('<br>')
      : 'Aucun record pour l\'instant.';
  }

  function renderDeath(run, isRecord) {
    const r = run.lastResult;
    $('death-info').innerHTML =
      `<div class="death-title">☠ MORT À L'ÉTAGE ${run.floor}</div>` +
      (isRecord ? `<div class="new-record">★ NOUVEAU RECORD ★</div>` : `<div class="tip-dim">Record : étage ${loadRecord().floor}</div>`) +
      `<div>Tué par ${esc(r.enemy.name)} au tour ${r.turns}.</div>` +
      `<div class="tip-dim">Graine : ${esc(run.seed)}</div>`;
  }

  // --- Cadres ASCII ------------------------------------------------------------------
  // Transforme chaque <div class="frame" data-title="…"> en cadre ╔═╗║╚╝.
  // Les bords sont des colonnes de caractères coupées à la bonne taille par
  // overflow:hidden, ce qui leur permet de suivre n'importe quelle largeur ou hauteur.
  // Un enfant .frame-controls est déplacé dans la barre de titre, à droite.
  const H_FILL = '═'.repeat(400);
  const V_FILL = '║'.repeat(300);
  function initFrames(rootEl) {
    (rootEl || document).querySelectorAll('.frame:not([data-framed])').forEach(el => {
      el.dataset.framed = '1';
      const body = document.createElement('div');
      body.className = 'frame-body';
      while (el.firstChild) body.appendChild(el.firstChild);
      const controls = body.querySelector(':scope > .frame-controls');
      el.innerHTML =
        `<span class="fc">╔</span>` +
        `<span class="fe fe-h"><i>${H_FILL}</i><span class="ft">═ <span class="ft-text"></span> </span><span class="fctl"></span></span>` +
        `<span class="fc">╗</span>` +
        `<span class="fe fe-v"><i>${V_FILL}</i></span>` +
        `<span class="fe fe-v fe-right"><i>${V_FILL}</i></span>` +
        `<span class="fc">╚</span><span class="fe fe-h"><i>${H_FILL}</i></span><span class="fc">╝</span>`;
      // Le corps se place entre les deux bords verticaux.
      el.insertBefore(body, el.querySelector('.fe-right'));
      if (controls) el.querySelector('.fctl').appendChild(controls);
      setTitle(el, el.dataset.title || '');
    });
  }
  function setTitle(el, text) {
    const t = el.querySelector('.ft-text');
    if (t) t.textContent = text;
  }

  // --- Record battu en cours de partie : flash discret + bandeau ------------------
  function flashRecord(floor) {
    document.body.classList.remove('flash-record');
    void document.body.offsetWidth;
    document.body.classList.add('flash-record');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `★ NOUVEAU RECORD — étage ${floor} ★`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  return { show, statusBar, renderStart, renderDeath, loadRecord, submitRecord, initFrames, setTitle, flashRecord };
})();
