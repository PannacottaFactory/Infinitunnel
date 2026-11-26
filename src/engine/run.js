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
      refresh: G.BALANCE.REFRESH_START, // jetons pour relancer les récompenses
      rewardRolls: 0,                   // tirages déjà faits à cet étage
      // État persistant entre les combats (ennemis vaincus, statuts déjà
      // appliqués, statuts transmis par Contamination, PV max de Festin…).
      meta: { kills: 0, statusesSeen: {}, festin: 0, carry: null },
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
      meta: run.meta,
      snapshots: opts.snapshots,
    });
    run.lastResult = result;

    if (result.won) {
      run.floor++;
      run.refresh += G.BALANCE.REFRESH_PER_VICTORY;
      run.rewardRolls = 0;
      // PV max ×PLAYER_HP_GROWTH par étage ; puis soin entre deux combats.
      // Festin : +5 % de PV max permanent par exemplaire et par ennemi vaincu.
      const festin = Math.pow(1.05, run.meta.festin || 0);
      run.meta.festin = 0;
      const maxHp = Math.round(run.player.maxHp * B.PLAYER_HP_GROWTH * festin);
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
  // Le générateur est dérivé de la graine, de l'étage et du numéro de tirage :
  // même graine et mêmes choix, donc mêmes récompenses.
  // exclude : récompenses à ne pas reproposer (celles d'avant un refresh).
  function rollRewards(run, exclude = []) {
    const B = G.BALANCE;
    const rng = run.rng.fork('recompense-' + run.floor + '-' + run.rewardRolls);
    run.rewardRolls++;
    const { mods, cores } = pools();
    const rewards = [];
    const seen = new Set(exclude.map(r => r.kind + ':' + r.name));
    let guard = 0;
    while (rewards.length < B.REWARD_CHOICES && guard++ < 200) {
      const isCore = cores.length && rng.chance(B.CORE_REWARD_CHANCE);
      const pool = isCore ? cores : mods;
      if (!pool.length) continue;
      const name = rng.pick(pool);
      const key = (isCore ? 'core:' : 'mod:') + name;
      if (seen.has(key) && guard > 150) { seen.delete(key); } // pool trop petit : on autorise les doublons de l'ancien tirage
      if (seen.has(key)) continue;
      seen.add(key);
      rewards.push({ kind: isCore ? 'core' : 'mod', name });
    }
    return rewards;
  }

  // Refresh : dépense 1 jeton pour tirer 3 nouvelles récompenses (différentes
  // des précédentes). Renvoie null s'il n'y a plus de jeton.
  function refreshRewards(run, current) {
    if (run.refresh <= 0) return null;
    run.refresh--;
    return rollRewards(run, current);
  }

  // Passer la récompense rapporte des jetons de refresh.
  function skipReward(run) {
    run.refresh += G.BALANCE.REFRESH_ON_SKIP;
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

  return { create, fight, rollRewards, refreshRewards, skipReward, placeMod, canAddSpell, addSpell, replaceCore, moveSpell };
})();
