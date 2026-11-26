// =============================================================================
//  RÉCOMPENSES (UI) — choix d'une carte parmi 3, puis placement :
//   - modificateur : on clique un slot du grimoire (un slot plein est remplacé)
//   - nouveau sort : ajouté en fin de grimoire s'il reste de la place, sinon
//     on clique le noyau d'un sort à remplacer (ses modificateurs sont gardés)
//  La logique (validation, modification) est dans G.Run ; ici, que l'affichage.
// =============================================================================
var G = globalThis.G = globalThis.G || {};
G.UI = G.UI || {};

G.UI.Rewards = (function () {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ctx : { run, container, renderGrimoire(opts), onDone() }
  function start(ctx) {
    const rewards = G.Run.rollRewards(ctx.run);
    showCards(ctx, rewards);
  }

  function cardHtml(r, i) {
    if (r.kind === 'core') {
      const s = G.Spells.data(r.name);
      return `<div class="card core-card" data-card="${i}">` +
        `<div class="card-key">${i + 1}</div><div class="card-kind">NOUVEAU SORT</div>` +
        `<div class="card-name">${esc(s.symbol)} ${esc(s.name)}</div><div class="card-text">${G.Log.colorize(esc(s.effect))}</div></div>`;
    }
    const m = G.Modifiers.data(r.name);
    return `<div class="card" data-card="${i}">` +
      `<div class="card-key">${i + 1}</div><div class="card-kind">${esc(m.category)}</div>` +
      `<div class="card-name">[${esc(m.name)}]</div><div class="card-text">${G.Log.colorize(esc(m.effect))}</div>` +
      (m.notes ? `<div class="card-note">${esc(m.notes)}</div>` : '') + '</div>';
  }

  function showCards(ctx, rewards) {
    ctx.renderGrimoire({ mode: 'view', reorder: true });
    ctx.container.innerHTML =
      `<div class="panel-title">VICTOIRE — choisis une récompense</div>` +
      `<div class="cards">${rewards.map(cardHtml).join('')}</div>` +
      `<div class="actions"><button data-skip>Passer (aucune récompense)</button>` +
      `<span class="tip-dim">  Touches 1-3 pour choisir. Les ▲▼ du grimoire changent l'ordre des sorts.</span></div>`;

    const choose = i => {
      const r = rewards[i];
      if (!r) return;
      if (r.kind === 'mod') placeMod(ctx, rewards, r.name);
      else placeCore(ctx, rewards, r.name);
    };
    ctx.container.querySelectorAll('[data-card]').forEach(el => { el.onclick = () => choose(+el.dataset.card); });
    ctx.container.querySelector('[data-skip]').onclick = () => finish(ctx);
    setKeys(e => { if (e.key >= '1' && e.key <= '9') choose(+e.key - 1); });
  }

  function placeMod(ctx, rewards, modName) {
    const m = G.Modifiers.data(modName);
    ctx.container.innerHTML =
      `<div class="panel-title">Où poser [${esc(m.name)}] ?</div>` +
      `<div class="card-text">${G.Log.colorize(esc(m.effect))}</div>` +
      `<div class="tip-dim">Clique un slot du grimoire. Un slot occupé sera remplacé.</div>` +
      `<div class="actions"><button data-back>← Retour aux récompenses (Échap)</button></div>`;
    ctx.renderGrimoire({
      mode: 'placeMod', mod: modName,
      onSlot: (s, k) => { if (G.Run.placeMod(ctx.run, s, k, modName)) finish(ctx); },
    });
    ctx.container.querySelector('[data-back]').onclick = () => showCards(ctx, rewards);
    setKeys(e => { if (e.key === 'Escape') showCards(ctx, rewards); });
  }

  function placeCore(ctx, rewards, coreName) {
    if (G.Run.canAddSpell(ctx.run)) {
      G.Run.addSpell(ctx.run, coreName);
      finish(ctx);
      return;
    }
    const s = G.Spells.data(coreName);
    ctx.container.innerHTML =
      `<div class="panel-title">Grimoire plein : quel sort remplacer par ${esc(s.symbol)} ${esc(s.name)} ?</div>` +
      `<div class="card-text">${G.Log.colorize(esc(s.effect))}</div>` +
      `<div class="tip-dim">Clique le noyau d'un sort. Ses modificateurs sont conservés.</div>` +
      `<div class="actions"><button data-back>← Retour aux récompenses (Échap)</button></div>`;
    ctx.renderGrimoire({
      mode: 'replaceCore', core: coreName,
      onCore: (i) => { G.Run.replaceCore(ctx.run, i, coreName); finish(ctx); },
    });
    ctx.container.querySelector('[data-back]').onclick = () => showCards(ctx, rewards);
    setKeys(e => { if (e.key === 'Escape') showCards(ctx, rewards); });
  }

  function finish(ctx) {
    setKeys(null);
    ctx.onDone();
  }

  // Un seul gestionnaire clavier actif à la fois pour cet écran.
  let keyHandler = null;
  function setKeys(fn) {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = fn;
    if (fn) document.addEventListener('keydown', fn);
  }

  return { start, cancel: () => setKeys(null) };
})();
