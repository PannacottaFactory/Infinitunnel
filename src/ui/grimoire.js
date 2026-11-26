// =============================================================================
//  GRIMOIRE (UI) — affiche les sorts sous forme de lignes :
//    I.  ✦ Trait   [Brûlure] [Brûlure] [Si brûle → ×2]
//  Survol d'un noyau ou d'un modificateur : infobulle avec son effet.
//
//  Modes :
//    view        : simple affichage, avec ▲▼ pour réordonner si onMove est fourni
//    placeMod    : chaque slot est cliquable pour poser opts.mod
//    replaceCore : chaque noyau est cliquable pour être remplacé par opts.core
// =============================================================================
var G = globalThis.G = globalThis.G || {};
G.UI = G.UI || {};

G.UI.Grimoire = (function () {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  // --- Infobulle partagée (tout élément avec data-tip) --------------------------
  let tooltip = null;
  function initTooltip() {
    if (tooltip) return;
    tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    document.body.appendChild(tooltip);
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) { tooltip.style.display = 'none'; return; }
      tooltip.innerHTML = el.dataset.tip;
      tooltip.style.display = 'block';
    });
    document.addEventListener('mousemove', e => {
      if (tooltip.style.display !== 'block') return;
      const pad = 14;
      const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
      let x = e.clientX + pad, y = e.clientY + pad;
      if (x + w > window.innerWidth) x = e.clientX - w - pad;
      if (y + h > window.innerHeight) y = e.clientY - h - pad;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    });
  }

  // Texte d'infobulle (HTML déjà échappé) pour un modificateur ou un noyau.
  function modTip(name) {
    const m = G.Modifiers.data(name);
    if (!m) return esc(name);
    const impl = G.Modifiers.isImplemented(name);
    return `<b>${esc(m.name)}</b> <span class="tip-cat">${esc(m.category)}</span><br>${G.Log.colorize(esc(m.effect))}` +
      (m.limit != null ? `<br><span class="tip-dim">Limite : ${m.limit} par sort</span>` : '') +
      (m.notes ? `<br><span class="tip-dim">${esc(m.notes)}</span>` : '') +
      (impl ? '' : '<br><span class="tip-unimpl">non implémenté : ne fait rien</span>');
  }
  function coreTip(name) {
    const s = G.Spells.data(name);
    if (!s) return esc(name);
    const impl = G.Spells.isImplemented(name);
    return `<b>${esc(s.symbol)} ${esc(s.name)}</b> <span class="tip-cat">Noyau</span><br>${G.Log.colorize(esc(s.effect))}` +
      (s.notes ? `<br><span class="tip-dim">${esc(s.notes)}</span>` : '') +
      (impl ? '' : '<br><span class="tip-unimpl">non implémenté : ne fait rien</span>');
  }

  function slotHtml(spell, si, slot, opts) {
    const name = spell.slots[slot];
    const cls = ['slot'];
    let attrs = '';
    if (name) {
      if (!G.Modifiers.isImplemented(name)) cls.push('unimpl');
      attrs += ` data-tip="${esc(modTip(name))}"`;
    } else cls.push('empty');
    if (opts.mode === 'placeMod') {
      if (G.Spells.canPlace(spell, opts.mod, slot)) {
        cls.push('pickable');
        attrs += ` data-pick-slot="${si},${slot}"`;
      } else cls.push('forbidden');
    }
    const label = name && G.Modifiers.isImplemented(name) ? G.Log.colorize(esc(name)) : esc(name || '· vide ·');
    const branch = slot === spell.slots.length - 1 ? '└ ' : '├ ';
    return `<div class="slot-line"><span class="branch">${branch}</span>` +
      `<span class="${cls.join(' ')}"${attrs}>${label}</span></div>`;
  }

  // Un sort = un bloc vertical :
  //   I.  ✦ Trait        ▲▼
  //       ├ Brûlure
  //       ├ Brûlure
  //       └ Si brûle → ×2
  function render(container, run, opts = {}) {
    initTooltip();
    const B = G.BALANCE;
    const g = run.grimoire;

    const blocks = g.map((spell, si) => {
      const num = (G.Log.roman(si + 1) + '.').padEnd(4, ' ');
      const coreCls = ['core'];
      let coreAttrs = ` data-tip="${esc(coreTip(spell.core))}"`;
      if (!G.Spells.isImplemented(spell.core)) coreCls.push('unimpl');
      if (opts.mode === 'replaceCore') { coreCls.push('pickable'); coreAttrs += ` data-pick-core="${si}"`; }
      const move = opts.onMove
        ? `<span class="move">` +
          `<button data-move="${si},-1"${si === 0 ? ' disabled' : ''} title="Monter">▲</button>` +
          `<button data-move="${si},1"${si === g.length - 1 ? ' disabled' : ''} title="Descendre">▼</button></span>`
        : '';
      const slots = spell.slots.map((_, k) => slotHtml(spell, si, k, opts)).join('');
      return `<div class="spell-block">` +
        `<div class="spell-head"><span class="num">${num}</span>` +
        `<span class="${coreCls.join(' ')}"${coreAttrs}><span class="core-sym">${esc(G.Spells.symbol(spell.core))}</span> ${esc(spell.core)}</span>${move}</div>` +
        `<div class="spell-slots">${slots}</div></div>`;
    });
    for (let i = g.length; i < B.MAX_SPELLS; i++) {
      blocks.push(`<div class="spell-block free"><span class="num">${(G.Log.roman(i + 1) + '.').padEnd(4, ' ')}</span>— libre —</div>`);
    }

    container.innerHTML = blocks.join('');

    container.querySelectorAll('[data-pick-slot]').forEach(el => {
      el.onclick = () => { const [s, k] = el.dataset.pickSlot.split(',').map(Number); opts.onSlot(s, k); };
    });
    container.querySelectorAll('[data-pick-core]').forEach(el => {
      el.onclick = () => opts.onCore(+el.dataset.pickCore);
    });
    container.querySelectorAll('[data-move]').forEach(el => {
      el.onclick = () => { const [s, d] = el.dataset.move.split(',').map(Number); opts.onMove(s, s + d); };
    });
  }

  return { render, modTip, coreTip };
})();
