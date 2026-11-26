// =============================================================================
//  PARTIE — enchaînement des combats sur des étages infinis. Logique pure,
//  utilisée par l'UI comme par les scripts de simulation.
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Run = (function () {
  function create(seed) {
    const B = G.BALANCE;
    return {
      seed,
      rng: G.RNG.create(seed),
      floor: 1,
      player: { hp: B.PLAYER_HP, maxHp: B.PLAYER_HP },
      grimoire: [G.Spells.create(B.STARTING_SPELL)],
      dead: false,
      lastResult: null,
    };
  }

  // Joue le combat de l'étage courant. Chaque étage a son propre générateur
  // dérivé de la graine : les choix faits entre les combats ne modifient pas
  // les tirages des combats suivants.
  function fight(run, opts = {}) {
    const B = G.BALANCE;
    const result = G.Combat.run({
      grimoire: run.grimoire,
      player: run.player,
      floor: run.floor,
      rng: run.rng.fork('etage-' + run.floor),
      snapshots: opts.snapshots,
    });
    run.lastResult = result;

    if (result.won) {
      run.floor++;
      // PV max ×PLAYER_HP_GROWTH par étage ; puis soin entre deux combats.
      const maxHp = Math.round(run.player.maxHp * B.PLAYER_HP_GROWTH);
      const hp = result.player.hp + (maxHp - run.player.maxHp);
      run.player.maxHp = maxHp;
      run.player.hp = Math.min(maxHp, Math.round(hp + maxHp * B.HEAL_BETWEEN_FIGHTS));
    } else {
      run.player.hp = 0;
      run.dead = true;
    }
    return result;
  }

  // --- Récompenses -------------------------------------------------------------

  // Contenu proposable : seulement ce qui est implémenté (un modificateur non
  // codé ne ferait rien), sauf si OFFER_UNIMPLEMENTED est activé.
  function pools() {
    const B = G.BALANCE;
    const ok = (impl) => B.OFFER_UNIMPLEMENTED || impl;
    return {
      mods: G.DATA.modificateurs.filter(m => ok(G.Modifiers.isImplemented(m.name))).map(m => m.name),
      cores: G.DATA.sorts.filter(s => ok(G.Spells.isImplemented(s.name))).map(s => s.name),
    };
  }

  // Tire REWARD_CHOICES récompenses distinctes. Chaque carte a
  // CORE_REWARD_CHANCE d'être un nouveau sort, sinon c'est un modificateur.
  // Le générateur est dérivé de la graine et de l'étage : même graine et mêmes
  // choix, donc mêmes récompenses.
  function rollRewards(run) {
    const B = G.BALANCE;
    const rng = run.rng.fork('recompense-' + run.floor);
    const { mods, cores } = pools();
    const rewards = [];
    const seen = new Set();
    let guard = 0;
    while (rewards.length < B.REWARD_CHOICES && guard++ < 200) {
      const isCore = cores.length && rng.chance(B.CORE_REWARD_CHANCE);
      const pool = isCore ? cores : mods;
      if (!pool.length) continue;
      const name = rng.pick(pool);
      const key = (isCore ? 'core:' : 'mod:') + name;
      if (seen.has(key)) continue;
      seen.add(key);
      rewards.push({ kind: isCore ? 'core' : 'mod', name });
    }
    return rewards;
  }

  // --- Modifications du grimoire (validées ici, pas dans l'UI) -----------------

  // Pose (ou remplace) un modificateur. Renvoie false si c'est interdit.
  function placeMod(run, spellIdx, slotIdx, modName) {
    const spell = run.grimoire[spellIdx];
    if (!spell || slotIdx < 0 || slotIdx >= spell.slots.length) return false;
    if (!G.Spells.canPlace(spell, modName, slotIdx)) return false;
    spell.slots[slotIdx] = modName;
    return true;
  }

  function canAddSpell(run) { return run.grimoire.length < G.BALANCE.MAX_SPELLS; }

  // Ajoute un nouveau sort (slots vides) en fin de grimoire.
  function addSpell(run, coreName) {
    if (!canAddSpell(run)) return false;
    run.grimoire.push(G.Spells.create(coreName));
    return true;
  }

  // Remplace le noyau d'un sort existant. Ses modificateurs sont conservés,
  // sinon un nouveau noyau ne vaudrait presque jamais la perte d'un sort équipé.
  function replaceCore(run, spellIdx, coreName) {
    const spell = run.grimoire[spellIdx];
    if (!spell) return false;
    spell.core = coreName;
    return true;
  }

  // Déplace un sort dans le grimoire (l'ordre de lancer compte).
  function moveSpell(run, from, to) {
    const g = run.grimoire;
    if (from < 0 || from >= g.length || to < 0 || to >= g.length || from === to) return false;
    const [spell] = g.splice(from, 1);
    g.splice(to, 0, spell);
    return true;
  }

  return { create, fight, rollRewards, placeMod, canAddSpell, addSpell, replaceCore, moveSpell };
})();
