// =============================================================================
//  MAIN — boucle de jeu :
//    titre → combat → (victoire) récompense → préparation → combat → …
//                   → (défaite) mort + record
// =============================================================================
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const Screens = G.UI.Screens;
  const Playback = G.UI.Playback;

  let run = null;
  let screen = 'start';
  let phase = null; // dans l'écran de jeu : 'combat' | 'reward' | 'prep'

  // --- Navigation -------------------------------------------------------------------

  // Retire le focus d'un bouton qui va disparaître (sinon Entrée le déclencherait).
  const blur = () => { if (document.activeElement) document.activeElement.blur(); };

  function goto(name) {
    blur();
    screen = name;
    Screens.show(name);
    Screens.statusBar(run);
  }

  function setPhase(p) {
    blur();
    phase = p;
    document.querySelectorAll('[data-phase]').forEach(el => { el.hidden = el.dataset.phase !== p; });
    Screens.statusBar(run);
  }

  // Grimoire : réordonnable sauf pendant le combat et les placements.
  function renderGrimoire(opts = { mode: 'view', reorder: true }) {
    const o = { ...opts };
    if (o.reorder) {
      o.onMove = (from, to) => { G.Run.moveSpell(run, from, to); renderGrimoire(opts); };
    }
    G.UI.Grimoire.render($('grimoire-panel'), run, o);
  }

  // --- Partie ------------------------------------------------------------------------

  function startRun(seed) {
    Playback.stop();
    run = G.Run.create(seed || G.RNG.randomSeed());
    run.recordAtStart = Screens.loadRecord().floor || 0;
    run.recordFlashed = false;
    goto('game');
    fight();
  }

  function fight() {
    G.UI.Rewards.cancel();
    const result = G.Run.fight(run);
    setPhase('combat');
    renderGrimoire({ mode: 'view' });
    Screens.setTitle($('log-frame'), 'JOURNAL — ÉTAGE ' + result.events[0].floor);
    G.UI.Arena.setup($('arena'), result.events[0]);
    // Record battu pendant la partie ? (record = étage le plus profond atteint)
    const recordBroken = result.won && run.floor > run.recordAtStart && !run.recordFlashed;
    if (result.won) Screens.submitRecord(run);

    $('btn-continue').textContent = 'Passer ⏎';
    Playback.play({
      logEl: $('log'),
      lines: G.Log.toLines(result.events),
      onDone: () => {
        $('btn-continue').textContent = result.won ? 'Récompense ⏎' : 'Bilan ⏎';
        Screens.statusBar(run);
        if (recordBroken && run.recordAtStart > 0) {
          run.recordFlashed = true;
          Screens.flashRecord(run.floor);
        }
      },
    });
  }

  // Bouton principal du combat : d'abord « passer » l'animation, puis continuer.
  function continueCombat() {
    if (Playback.isPlaying()) { Playback.skip(); return; }
    afterCombat();
  }

  function afterCombat() {
    if (run.dead) {
      Screens.submitRecord(run);
      const isRecord = run.floor > run.recordAtStart;
      Screens.renderDeath(run, isRecord);
      if (isRecord) Screens.flashRecord(run.floor);
      $('death-log').hidden = true;
      G.UI.Grimoire.render($('death-grimoire'), run, { mode: 'view' });
      goto('death');
      return;
    }
    setPhase('reward');
    G.UI.Rewards.start({
      run,
      container: $('reward-panel'),
      renderGrimoire,
      onChange: () => Screens.statusBar(run),
      onDone: () => { setPhase('prep'); renderGrimoire(); },
    });
  }

  // --- Vitesse -----------------------------------------------------------------------

  function renderSpeed() {
    document.querySelectorAll('[data-speed]').forEach(b => {
      b.classList.toggle('active', b.dataset.speed === Playback.getSpeed());
    });
  }
  document.querySelectorAll('[data-speed]').forEach(b => {
    b.onclick = () => { Playback.setSpeed(b.dataset.speed); renderSpeed(); b.blur(); };
  });

  // --- Boutons et clavier -----------------------------------------------------------

  $('btn-start').onclick = () => startRun($('seed').value.trim());
  $('btn-continue').onclick = continueCombat;
  $('btn-fight').onclick = fight;
  $('btn-again').onclick = () => startRun();
  $('btn-replay').onclick = () => startRun(run.seed);
  $('btn-log').onclick = () => {
    const el = $('death-log');
    el.hidden = !el.hidden;
    if (!el.hidden) {
      el.innerHTML = G.Log.toLines(run.lastResult.events).map(Playback.lineHtml).join('\n');
      el.scrollTop = el.scrollHeight;
    }
  };

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return; // le bouton gère déjà Entrée
    if (screen === 'start') $('btn-start').click();
    else if (screen === 'death') $('btn-again').click();
    else if (screen === 'game' && phase === 'combat') continueCombat();
    else if (screen === 'game' && phase === 'prep') fight();
  });

  Screens.initFrames();
  renderSpeed();
  Screens.renderStart();
  goto('start');
})();
