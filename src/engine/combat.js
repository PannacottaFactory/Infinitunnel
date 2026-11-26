// =============================================================================
//  COMBAT — logique pure, sans DOM. Produit une liste d'événements que l'UI
//  transforme en lignes de log (ou qu'un script Node analyse).
//
//  Déroulé d'un tour :
//   1. début du tour : hooks onTurnStart
//   2. les sorts du grimoire sont lancés dans l'ordre. Les relances passent
//      par une FILE D'ATTENTE (pas de récursion) : une relance est insérée en
//      tête de file, donc résolue immédiatement après le lancer qui l'a
//      demandée, avant le sort suivant du grimoire.
//   3. les statuts de l'ennemi agissent (brûlure, poison)
//   4. l'ennemi attaque (sauf s'il est gelé ; le saignement agit à ce moment)
//   5. fin du tour : hooks onTurnEnd
//  La mort de l'ennemi est vérifiée après chaque source de dégâts, celle du
//  joueur après chaque attaque reçue.
//
//  Formule d'un coup :
//    brut   = BASE_DAMAGE × palier du noyau
//             × (1 + somme des « +X % »)          (Puissance…)
//             × produit des « ×N » du lancer       (Sacrifice, Fracture, Préparation…)
//             × variance (±20 %)
//             × multiplicateurs conditionnels     (Si brûle → ×2, Exécution…)
//             × critique (×2)
//    → « dégâts de référence » du coup (base de la puissance des statuts)
//    final  = (brut + bonus des marques) × choc × fragilité
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Combat = (function () {
  const B = () => G.BALANCE;
  const clamp01 = x => Math.max(0, Math.min(1, x));

  // --- Dégâts et morts --------------------------------------------------------

  // Inflige des dégâts à l'ennemi (la fragilité s'applique à toutes les
  // sources). Renvoie les dégâts réellement comptés.
  function damageEnemy(c, amount) {
    if (!(amount > 0)) return 0;
    const dmg = Math.max(1, Math.round(amount * G.Statuses.takenMult(c.enemy)));
    c.enemy.hp = Math.max(0, c.enemy.hp - dmg);
    c.stats.damageDealt += dmg;
    c.stats.biggestHit = Math.max(c.stats.biggestHit, dmg);
    return dmg;
  }

  function checkEnemyDeath(c) {
    if (c.over) return true;
    if (c.enemy.hp <= 0) {
      c.over = true;
      c.won = true;
      c.emit({ type: 'enemy_dead', enemy: c.enemy.name });
    }
    return c.over;
  }

  function checkPlayerDeath(c) {
    if (c.over) return true;
    if (c.player.hp <= 0) {
      c.player.hp = 0;
      c.over = true;
      c.won = false;
      c.emit({ type: 'player_dead' });
    }
    return c.over;
  }

  // Garde-fou global : au-delà de MAX_ACTIONS_PER_TURN actions dans un tour,
  // on arrête de lancer des sorts pour ce tour. Le navigateur ne plante jamais.
  function tick(c) {
    c.turnState.actions++;
    if (c.turnState.actions > B().MAX_ACTIONS_PER_TURN) {
      if (!c.turnState.safetyHit) {
        c.turnState.safetyHit = true;
        c.emit({ type: 'safety', limit: B().MAX_ACTIONS_PER_TURN });
      }
      return false;
    }
    return true;
  }

  // --- Itération des hooks ----------------------------------------------------

  // Noyau (slot -1) puis modificateurs de gauche à droite.
  function hookList(spell) {
    const list = [{ name: spell.core, slot: -1, isCore: true, handler: G.Spells.def(spell.core) }];
    for (const m of G.Spells.mods(spell)) {
      list.push({ name: m.name, slot: m.slot, isCore: false, handler: G.Modifiers.get(m.name) });
    }
    return list;
  }

  function callHooks(list, hook, ...args) {
    for (const m of list) {
      if (m.handler && m.handler[hook]) m.handler[hook](...args, m);
    }
  }

  // Hooks hors lancer : tous les modificateurs de tout le grimoire.
  function callGlobalHooks(c, hook, ...args) {
    c.grimoire.forEach((spell, idx) => {
      for (const m of hookList(spell)) {
        if (m.handler && m.handler[hook]) m.handler[hook](c, ...args, idx, m);
      }
    });
  }

  // --- Lancer d'un sort -------------------------------------------------------

  function castSpell(c, req) {
    if (!tick(c)) return null;
    const spell = c.grimoire[req.spell];
    const coreDef = G.Spells.def(spell.core);
    const tierMult = coreDef && coreDef.tier ? B().DAMAGE_TIERS[coreDef.tier] : 0;

    c.castCounts[req.spell] = (c.castCounts[req.spell] || 0) + 1;
    const cast = {
      spellIndex: req.spell,
      spell,
      core: spell.core,
      symbol: G.Spells.symbol(spell.core),
      recast: req.recast,
      depth: req.depth,
      by: req.by || null,
      castNo: c.castCounts[req.spell],
      hookList: hookList(spell),
      baseDamage: B().BASE_DAMAGE * tierMult,
      hitsBase: (coreDef && coreDef.hits) || 1,
      hitsMult: 1,
      addPct: 0,       // somme des « +X % »
      mult: 1,         // produit des « ×N »
      critChance: B().BASE_CRIT_CHANCE,
      critMult: B().CRIT_MULT,
      missChance: (coreDef && coreDef.miss) || 0,
      freezeChance: (coreDef && coreDef.freeze) || 0,
      noMiss: false,
      misses: 0,
      crits: 0,
      totalDamage: 0,
      appliedStatuses: {},
      pendingRecasts: [],
    };

    c.emit({
      type: 'cast', spell: cast.spellIndex, core: cast.core, symbol: cast.symbol,
      recast: cast.recast, depth: cast.depth, by: cast.by,
    });
    if (!coreDef) c.detail(spell.core, 'unimpl', {});
    for (const m of cast.hookList) if (!m.isCore && !m.handler) c.detail(m.name, 'unimpl', {});

    // Bonus en attente pour « le prochain lancer » (Préparation…).
    if (c.nextCastMult !== 1) {
      cast.mult *= c.nextCastMult;
      c.detail('Préparation', 'next_used', { mult: c.nextCastMult });
      c.nextCastMult = 1;
    }
    // SURCHARGE : les relances en trop renforcent les lancers suivants du tour.
    cast.mult *= c.turnState.surcharge;

    callHooks(cast.hookList, 'onCast', c, cast);

    let extra = 0;
    for (const m of cast.hookList) {
      if (m.handler && m.handler.extraHits) extra += m.handler.extraHits(c, cast, m);
    }
    const hits = Math.max(1, Math.round(cast.hitsBase * cast.hitsMult) + extra);
    cast.hits = hits;
    // Dégâts nominaux (sans variance) : référence des statuts appliqués hors coup.
    cast.refDamage = cast.baseDamage * (1 + cast.addPct) * cast.mult;

    for (let h = 1; h <= hits && !c.over; h++) {
      if (!tick(c)) break;
      resolveHit(c, cast, h, hits);
    }

    if (!c.over) callHooks(cast.hookList, 'afterCast', c, cast);
    c.lastCast = cast;
    return cast;
  }

  function resolveHit(c, cast, no, of) {
    const enemy = c.enemy;
    const hit = { no, of, damage: 0, refDamage: 0, crit: false, miss: false };
    const base = {
      type: 'hit', spell: cast.spellIndex, core: cast.core, symbol: cast.symbol,
      recast: cast.recast, depth: cast.depth, no, of,
    };

    // Raté ?
    const missChance = cast.noMiss ? 0 : clamp01(cast.missChance);
    if (missChance > 0 && c.rng.chance(missChance)) {
      hit.miss = true;
      cast.misses++;
      c.emit({ ...base, miss: true, damage: 0, enemyHp: enemy.hp, enemyMaxHp: enemy.maxHp });
      callHooks(cast.hookList, 'onMiss', c, cast, hit);
      return hit;
    }

    const V = B().DAMAGE_VARIANCE;
    let raw = cast.baseDamage * (1 + cast.addPct) * cast.mult * c.rng.range(1 - V, 1 + V);

    // Multiplicateurs conditionnels, de gauche à droite (journalisés après le coup).
    const multDetails = [];
    for (const m of cast.hookList) {
      if (m.handler && m.handler.multiplier) {
        const x = m.handler.multiplier(c, cast, hit, m);
        if (x !== 1) { raw *= x; multDetails.push({ name: m.name, mult: x }); }
      }
    }

    if (c.rng.chance(clamp01(cast.critChance))) {
      hit.crit = true;
      cast.crits++;
      raw *= cast.critMult;
    }
    hit.refDamage = raw;

    let shockMult = 1;
    if (cast.baseDamage > 0) {
      let dmg = raw + G.Statuses.markBonus(enemy);
      shockMult = G.Statuses.consumeShock(enemy);
      hit.damage = damageEnemy(c, dmg * shockMult);
    }
    cast.totalDamage += hit.damage;

    c.emit({ ...base, miss: false, crit: hit.crit, damage: hit.damage, enemyHp: enemy.hp, enemyMaxHp: enemy.maxHp });
    for (const d of multDetails) c.detail(d.name, 'mult', { mult: d.mult });
    if (shockMult > 1) c.detail('Choc', 'shock_used', { bonus: shockMult - 1 });

    if (checkEnemyDeath(c)) {
      callHooks(cast.hookList, 'onKill', c, cast, hit);
      return hit;
    }

    callHooks(cast.hookList, 'onHit', c, cast, hit);
    if (hit.crit) callHooks(cast.hookList, 'onCrit', c, cast, hit);

    // Gel : un seul tirage par coup, avec la chance cumulée du noyau et des mods.
    if (!c.over && cast.freezeChance > 0 && c.rng.chance(clamp01(cast.freezeChance))) {
      const hasGelMod = cast.hookList.some(m => m.name === 'Gel');
      G.Modifiers.applyStatus(c, cast, hit, { name: hasGelMod ? 'Gel' : cast.core }, 'freeze',
        B().STATUS.FREEZE_DURATION);
    }

    checkEnemyDeath(c);
    return hit;
  }

  // --- Attaque ennemie --------------------------------------------------------

  function enemyAttack(c) {
    const enemy = c.enemy;
    const frozen = enemy.statuses.freeze;
    if (frozen && frozen.stacks > 0) {
      frozen.stacks--;
      if (frozen.stacks <= 0) G.Statuses.remove(enemy, 'freeze');
      c.emit({ type: 'enemy_frozen', enemy: enemy.name, remaining: frozen.stacks });
      return;
    }

    // Le saignement frappe l'ennemi au moment où il attaque.
    G.Statuses.onEnemyAttack(c);
    if (checkEnemyDeath(c)) return;

    if (c.rng.chance(G.Statuses.enemyMissChance(enemy))) {
      c.emit({ type: 'enemy_attack', enemy: enemy.name, missed: true, damage: 0,
        playerHp: c.player.hp, playerMaxHp: c.player.maxHp });
      return;
    }

    const V = B().ENEMY_ATK_VARIANCE;
    const attack = {
      damage: Math.max(1, Math.round(enemy.atk * c.rng.range(1 - V, 1 + V) * G.Statuses.enemyDamageMult(enemy))),
      absorbed: 0,
    };
    callGlobalHooks(c, 'onEnemyAttack', attack);

    // Le bouclier absorbe en premier.
    if (c.player.shield > 0) {
      attack.absorbed = Math.min(c.player.shield, attack.damage);
      c.player.shield -= attack.absorbed;
    }
    const lost = attack.damage - attack.absorbed;
    c.player.hp = Math.max(0, c.player.hp - lost);
    c.turnState.damageTaken += lost;
    c.emit({ type: 'enemy_attack', enemy: enemy.name, missed: false, damage: lost,
      absorbed: attack.absorbed, playerHp: c.player.hp, playerMaxHp: c.player.maxHp });
    checkPlayerDeath(c);
  }

  // --- Tour -------------------------------------------------------------------

  function runTurn(c) {
    c.turn++;
    c.turnState = { recasts: 0, overflow: 0, surcharge: 1, actions: 0, healed: 0, damageTaken: 0, safetyHit: false };
    c.emit({ type: 'turn', turn: c.turn });

    callGlobalHooks(c, 'onTurnStart');

    // File d'attente des lancers. Chaque sort du grimoire y est ajouté à son
    // tour ; ses relances sont insérées EN TÊTE et passent avant le suivant.
    for (let i = 0; i < c.grimoire.length && !c.over; i++) {
      const queue = [{ spell: i, recast: false, depth: 0 }];
      while (queue.length && !c.over && !c.turnState.safetyHit) {
        const cast = castSpell(c, queue.shift());
        if (cast && cast.pendingRecasts.length) queue.unshift(...cast.pendingRecasts);
      }
    }
    if (c.over) return;

    G.Statuses.tickEndOfTurn(c);
    if (c.over) return;

    enemyAttack(c);
    if (c.over) return;

    callGlobalHooks(c, 'onTurnEnd');
  }

  // --- Combat complet ---------------------------------------------------------

  // opts : { grimoire, player: {hp, maxHp}, floor, rng, snapshots? }
  // Renvoie { won, turns, events, player, enemy, stats }. Le combat est
  // calculé d'un coup ; l'UI rejoue ensuite les événements à la vitesse voulue.
  function run(opts) {
    const events = [];
    const c = {
      rng: opts.rng,
      floor: opts.floor,
      grimoire: opts.grimoire,
      player: { hp: opts.player.hp, maxHp: opts.player.maxHp, shield: 0 },
      enemy: G.Enemies.create(opts.floor, opts.rng),
      turn: 0,
      over: false,
      won: false,
      events,
      castCounts: [],
      nextCastMult: 1,
      lastCast: null,
      stats: { damageDealt: 0, biggestHit: 0 },
      turnState: null,
    };
    // Chaque événement porte un instantané de l'état (PV, statuts), pour que
    // l'UI anime les barres ligne par ligne. Désactivable (opts.snapshots =
    // false) pour les simulations de masse.
    const snapshots = opts.snapshots !== false;
    const snap = () => {
      const st = {};
      for (const id in c.enemy.statuses) if (c.enemy.statuses[id].stacks > 0) st[id] = c.enemy.statuses[id].stacks;
      return {
        turn: c.turn, eHp: c.enemy.hp, eMax: c.enemy.maxHp,
        pHp: c.player.hp, pMax: c.player.maxHp, shield: c.player.shield, st,
      };
    };
    c.emit = ev => { if (snapshots) ev.snap = snap(); events.push(ev); };
    c.detail = (mod, kind, data) => c.emit({ type: 'detail', mod, kind, ...data });

    // Demande une relance du sort `spellIndex`, déclenchée par `cast`.
    c.requestRecast = (spellIndex, cast, by) => {
      const ts = c.turnState;
      if (ts.recasts >= B().MAX_RECASTS_PER_TURN) {
        ts.overflow++;
        ts.surcharge *= B().SURCHARGE_MULT;
        c.emit({ type: 'surcharge', by, count: ts.overflow, mult: ts.surcharge });
        return false;
      }
      ts.recasts++;
      cast.pendingRecasts.push({ spell: spellIndex, recast: true, depth: cast.depth + 1, by });
      c.detail(by, 'recast', { target: c.grimoire[spellIndex].core, spell: spellIndex });
      return true;
    };

    c.emit({
      type: 'combat_start', floor: c.floor,
      enemy: { name: c.enemy.name, symbol: c.enemy.symbol, hp: c.enemy.hp, maxHp: c.enemy.maxHp, atk: c.enemy.atk },
      player: { hp: c.player.hp, maxHp: c.player.maxHp },
    });

    while (!c.over) {
      if (c.turn >= B().MAX_TURNS_PER_COMBAT) {
        c.over = true;
        c.won = false;
        c.emit({ type: 'exhausted', turns: c.turn });
        break;
      }
      runTurn(c);
    }

    c.emit({ type: 'combat_end', won: c.won, turns: c.turn, stats: c.stats });
    return { won: c.won, turns: c.turn, events, player: c.player, enemy: c.enemy, stats: c.stats };
  }

  return { run, damageEnemy, checkEnemyDeath, checkPlayerDeath };
})();
