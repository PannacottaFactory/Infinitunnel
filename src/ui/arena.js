// =============================================================================
//  ARÈNE (UI) — l'ennemi et le joueur, barres de PV en ASCII, statuts.
//  Mise à jour à partir des instantanés (ev.snap) portés par les événements.
// =============================================================================
var G = globalThis.G = globalThis.G || {};
G.UI = G.UI || {};

G.UI.Arena = (function () {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const f = n => G.Log.formatNumber(n);
  const BAR = 22; // largeur des barres, en caractères

  // Icône et ordre d'affichage des statuts (la couleur vient de la classe st-xxx).
  const ICONS = {
    burn: '♨', poison: '☣', bleed: '♦', freeze: '❄', shock: 'ϟ', fragile: '✕',
    weak: '↓', numb: '≈', mark: '✚', curse: '✠', ash: '∴', corrosion: '⊘', crack: '⌇',
    combustible: '▲', fear: '!', frostbite: '✻', omen: '☉', link: '∞', exposure: '◎',
  };

  let root = null;
  let enemyInfo = null;

  function bar(hp, max, cls) {
    const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
    let full = Math.round(ratio * BAR);
    if (hp > 0 && full === 0) full = 1; // encore en vie : au moins un cran
    return `<span class="bar ${cls}">${'█'.repeat(full)}</span><span class="bar-empty">${'░'.repeat(BAR - full)}</span>`;
  }

  function statusesHtml(st) {
    const ids = Object.keys(st || {});
    if (!ids.length) return '<span class="tip-dim">aucun statut</span>';
    return ids.map(id => {
      const d = G.Statuses.DEFS[id];
      const label = d ? d.name : id;
      const icon = ICONS[id] || label[0];
      const n = (id === 'freeze' || id === 'shock') && st[id] <= 1 ? '' : st[id];
      return `<span class="badge st-${id}" title="${esc(label)}">${icon}${n}</span>`;
    }).join(' ');
  }

  // Prépare l'arène pour un nouveau combat (événement combat_start).
  function setup(el, startEv) {
    root = el;
    enemyInfo = startEv.enemy;
    root.innerHTML =
      `<div class="enemy-box">` +
        `<div class="enemy-sym" id="ar-sym">${esc(enemyInfo.symbol)}</div>` +
        `<div class="enemy-name">${esc(enemyInfo.name)}</div>` +
        `<div class="tip-dim">étage ${startEv.floor} · ATK ${f(enemyInfo.atk)}</div>` +
        `<div class="hp-line">PV <span id="ar-ehp"></span></div>` +
        `<div class="hp-num" id="ar-ehp-n"></div>` +
        `<div id="ar-st" class="statuses"></div>` +
        `<div id="ar-pops" class="pops"></div>` +
      `</div>` +
      `<div class="arena-sep">─────────── ⚔ ───────────</div>` +
      `<div class="player-box" id="ar-player">` +
        `<div><span class="player-sym">@</span> Toi <span class="tip-dim" id="ar-turn"></span></div>` +
        `<div class="hp-line">PV <span id="ar-php"></span></div>` +
        `<div class="hp-num" id="ar-php-n"></div>` +
      `</div>`;
    update({
      turn: 0, eHp: enemyInfo.hp, eMax: enemyInfo.maxHp,
      pHp: startEv.player.hp, pMax: startEv.player.maxHp, shield: 0, st: {},
    });
  }

  function update(s) {
    if (!root || !s) return;
    const $ = id => root.querySelector('#' + id);
    $('ar-ehp').innerHTML = bar(s.eHp, s.eMax, 'bar-enemy');
    $('ar-ehp-n').textContent = f(s.eHp) + ' / ' + f(s.eMax);
    $('ar-st').innerHTML = statusesHtml(s.st);
    const low = s.pHp <= s.pMax * 0.25 ? ' bar-low' : '';
    $('ar-php').innerHTML = bar(s.pHp, s.pMax, 'bar-player' + low);
    $('ar-php-n').innerHTML = f(s.pHp) + ' / ' + f(s.pMax) +
      (s.shield > 0 ? ` <span class="shield">⛨ ${f(s.shield)}</span>` : '');
    $('ar-turn').textContent = s.turn ? '· tour ' + s.turn : '';
  }

  // Relance une animation CSS même si la classe est déjà présente.
  function retrigger(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // force le recalcul pour redémarrer l'animation
    el.classList.add(cls);
  }

  function shakeEnemy(big) { if (root) retrigger(root.querySelector('#ar-sym'), big ? 'shake-big' : 'shake'); }
  function hurtPlayer() { if (root) retrigger(root.querySelector('#ar-player'), 'hurt'); }

  // Chiffre flottant au-dessus de l'ennemi.
  function pop(text, cls) {
    if (!root) return;
    const box = root.querySelector('#ar-pops');
    const el = document.createElement('span');
    el.className = 'pop ' + (cls || '');
    el.textContent = text;
    el.style.left = (10 + Math.random() * 70) + '%';
    box.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  return { setup, update, shakeEnemy, hurtPlayer, pop, ICONS };
})();
