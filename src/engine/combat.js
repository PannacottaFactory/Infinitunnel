// =============================================================================
//  COMBAT — logique pure, sans DOM. Produit une liste d'événements que l'UI
//  transforme en lignes de log (ou qu'un script Node analyse).
//
//  Déroulé d'un tour :
//   1. début du tour : le bouclier retombe à 0, effets de début de tour
//      (Barrière, Compte à rebours…), hooks onTurnStart
//   2. les sorts du grimoire sont lancés dans l'ordre. Les relances passent
//      par une FILE D'ATTENTE (pas de récursion) : une relance est insérée en
//      tête de file, donc résolue juste après le lancer qui l'a demandée.
//   3. les statuts de l'ennemi agissent (brûlure, poison…)
//   4. l'ennemi attaque (sauf s'il est gelé ; le saignement agit à ce moment)
//   5. fin du tour : hooks onTurnEnd
//
//  Formule d'un coup :
//    brut   = dégâts de base du noyau
//             × (1 + somme des « +X % »)               (Puissance, Élan, Par brûlure…)
//             × produit des « ×N » du lancer           (Sacrifice, Fracture, Préparation…)
//             × variance (±20 %) × croissance par coup  (Avalanche…)
//             × multiplicateurs conditionnels          (Si brûle → ×2, Exécution…)
//             × critique (×2 de base, +1 Brutalité / Létalité, +25 %/exposition)
//    → « dégâts de référence » du coup (base de la puissance des statuts)
//    final  = (brut + marques) × choc × présage × brisure × fragilité  (+ fêlure)
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Combat = (function () {
  const B = () => G.BALANCE;
  const clamp01 = x => Math.max(0, Math.min(1, x));

  // --- Hasard avec Chance / Constance -------------------------------------------

  // Tirage favorable (critique, relance, gel…). Avec Chance : tiré deux fois.
  function good(c, cast, p) {
    p = clamp01(p);
    if (cast && cast.luck) return c.rng.chance(p) || c.rng.chance(p);
    return c.rng.chance(p);
  }
  // Tirage défavorable (raté…). Avec Chance : il faut rater deux fois.
  function bad(c, cast, p) {
    p = clamp01(p);
    if (cast && cast.luck) return c.rng.chance(p) && c.rng.chance(p);
    return c.rng.chance(p);
  }
  // Multiplicateur aléatoire de dégâts dans [min, max].
  // Constance : jamais sous la moyenne. Chance : meilleur de deux tirages.
  function randMult(c, cast, min, max) {
    if (cast && cast.constance) min = (min + max) / 2;
    let x = c.rng.range(min, max);
    if (cast && cast.luck) x = Math.max(x, c.rng.range(min, max));
    return x;
  }

  // --- Dégâts, soins, morts ------------------------------------------------------

  // Inflige des dégâts à l'ennemi. La fragilité s'applique à toutes les
  // sources ; la fêlure seulement aux coups (opts.hit).
  function damageEnemy(c, amount, opts = {}) {
    if (!(amount > 0) || c.enemy.hp <= 0) return 0;
    let dmg = amount * G.Statuses.takenMult(c.enemy);
    if (opts.hit) {
      const cracks = G.Statuses.stacks(c.enemy, 'crack');
      if (cracks) dmg += c.enemy.hp * Math.min(1, cracks * B().STATUS.CRACK_PER_STACK);
    }
    dmg = Math.max(1, Math.round(dmg));
    c.enemy.hp = Math.max(0, c.enemy.hp - dmg);
    c.stats.damageDealt += dmg;
    if (opts.hit) c.stats.biggestHit = Math.max(c.stats.biggestHit, dmg);
    return dmg;
  }

  // Soigne le joueur (Sanctuaire ×2, Martyr ×0,5). Renvoie le soin réel.
  function healPlayer(c, amount, source) {
    if (!(amount > 0)) return 0;
    amount *= Math.pow(2, c.passive('Sanctuaire')) * Math.pow(0.5, c.passive('Martyr'));
    const p = c.player;
    const healed = Math.max(0, Math.min(p.maxHp - p.hp, Math.round(amount)));
    p.hp += healed;
    c.turnState.healed += healed;
    c.stats.healed += healed;
    if (p.hp >= p.maxHp * 0.25) c.flags.below25 = false;
    return healed;
  }

  // Le joueur perd des PV.
  //  opts.fromEnemy : attaque ennemie (bouclier, Peau de pierre, Épines…)
  //  opts.cost      : coût d'un sort, qui ne peut pas tuer (reste à 1 PV au minimum)
  function hurtPlayer(c, amount, opts = {}) {
    const p = c.player;
    let dmg = amount;
    if (opts.fromEnemy) {
      dmg *= Math.pow(0.9, c.passive('Peau de pierre')) * (1 + 0.15 * c.passive('Fragile'));
    }
    dmg = Math.max(0, Math.round(dmg));
    let absorbed = 0;
    if (opts.fromEnemy && p.shield > 0) {
      absorbed = Math.min(p.shield, dmg);
      p.shield -= absorbed;
    }
    const lost = Math.min(p.hp - (opts.cost ? 1 : 0), dmg - absorbed);
    const real = Math.max(0, lost);
    p.hp -= real;
    c.stats.damageTaken += real;
    c.turnState.hpLost += real;

    if (opts.fromEnemy) {
      c.flags.wasHitCombat = true;
      c.turnState.wasHit = true;
      c.stats.hitsTaken++;
      // Lien de douleur, Épines : l'ennemi encaisse une part des dégâts reçus.
      const links = G.Statuses.stacks(c.enemy, 'link');
      if (links && real > 0) {
        const d = damageEnemy(c, real * links * B().STATUS.LINK_PER_STACK);
        c.emit({ type: 'passive', mod: 'Lien de douleur', kind: 'reflect', amount: d, enemyHp: c.enemy.hp });
      }
      const thorns = c.passive('Épines');
      if (thorns && real > 0) {
        const d = damageEnemy(c, real * 0.30 * thorns);
        c.emit({ type: 'passive', mod: 'Épines', kind: 'reflect', amount: d, enemyHp: c.enemy.hp });
      }
      const grudge = c.passive('Rancune');
      if (grudge) {
        const r = G.Statuses.apply(c, 'mark', grudge, c.lastRef);
        c.emit({ type: 'passive', mod: 'Rancune', kind: 'status', status: 'mark', added: r.added, total: r.total });
      }
      for (let k = 0; k < c.passive('Contre-givre'); k++) {
        if (c.rng.chance(0.20)) {
          G.Statuses.apply(c, 'freeze', 1, 0, { freezeDuration: 1 });
          c.emit({ type: 'passive', mod: 'Contre-givre', kind: 'status', status: 'freeze', added: 1, total: 1 });
          break;
        }
      }
    }

    // Passage sous 25 % des PV : Cicatrices (+5 % permanent).
    if (p.hp > 0 && p.hp < p.maxHp * 0.25 && !c.flags.below25) {
      c.flags.below25 = true;
      for (const spell of c.grimoire) {
        if (spell.slots.includes('Cicatrices')) {
          spell.growth.scars = (spell.growth.scars || 0) + 1;
          c.emit({ type: 'passive', mod: 'Cicatrices', kind: 'growth', value: spell.growth.scars });
        }
      }
    }
    // Sang-froid : sous 30 % des PV, bouclier de 15 % (une fois par combat).
    const sf = c.passive('Sang-froid');
    if (sf && !c.flags.sangFroid && p.hp > 0 && p.hp < p.maxHp * 0.30) {
      c.flags.sangFroid = true;
      p.shield += Math.round(p.maxHp * 0.15 * sf);
      c.emit({ type: 'passive', mod: 'Sang-froid', kind: 'shield', amount: Math.round(p.maxHp * 0.15 * sf), shield: p.shield });
    }
    // Mort évitée : Ténacité (reste à 1 PV), puis Seconde chance (revient à 20 %).
    if (p.hp <= 0) {
      if (c.passive('Ténacité') && !c.flags.tenacity) {
        c.flags.tenacity = true;
        p.hp = 1;
        c.emit({ type: 'passive', mod: 'Ténacité', kind: 'survive', hp: p.hp, maxHp: p.maxHp });
      } else if (c.passive('Seconde chance') && !c.flags.secondChance) {
        c.flags.secondChance = true;
        p.hp = Math.max(1, Math.round(p.maxHp * 0.20));
        c.emit({ type: 'passive', mod: 'Seconde chance', kind: 'survive', hp: p.hp, maxHp: p.maxHp });
      }
    }
    return { lost: real, absorbed };
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
  // on arrête de lancer des sorts pour ce tour.
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

  // --- Hooks ----------------------------------------------------------------------

  // Noyau (slot -1) puis modificateurs de gauche à droite.
  //  - Miroir prend le handler du modificateur au même slot du sort précédent.
  //  - Égoïsme sur un autre sort désactive les effets « Entre sorts ».
  function buildHookList(c, idx) {
    const spell = c.grimoire[idx];
    const list = [{ name: spell.core, mod: spell.core, slot: -1, isCore: true, handler: G.Spells.def(spell.core) }];
    const egoOthers = c.grimoire.some((s, j) => j !== idx && s.slots.includes('Égoïsme'));
    for (const m of G.Spells.mods(spell)) {
      let name = m.name;
      let handler = G.Modifiers.get(m.name);
      let disabled = false;
      if (m.name === 'Miroir') {
        const prev = c.grimoire[idx - 1];
        const target = prev && prev.slots[m.slot];
        if (target && target !== 'Miroir') { handler = G.Modifiers.get(target); name = 'Miroir ' + target; }
        else handler = {};
      }
      const data = G.Modifiers.data(m.name);
      if (egoOthers && data && data.category === 'Entre sorts') { handler = {}; disabled = true; }
      list.push({ name, mod: m.name, slot: m.slot, isCore: false, handler, disabled });
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
    c.hookLists.forEach((list, idx) => {
      for (const m of list) {
        if (m.handler && m.handler[hook]) m.handler[hook](c, ...args, idx, m);
      }
    });
  }

  function freshNextCast() {
    return { mult: 1, addPct: 0, forceCrit: false, statusMult: 1, critHooks: [], detonate: false, used: false };
  }

  // --- Lancer d'un sort -------------------------------------------------------------

  function castSpell(c, req) {
    if (!tick(c)) return null;
    const spell = c.grimoire[req.spell];
    const coreDef = G.Spells.def(spell.core) || {};
    const tierMult = coreDef.tier ? B().DAMAGE_TIERS[coreDef.tier] : 0;

    c.castCounts[req.spell] = (c.castCounts[req.spell] || 0) + 1;
    const cast = {
      spellIndex: req.spell,
      spell,
      core: spell.core,
      symbol: G.Spells.symbol(spell.core),
      recast: req.recast,
      depth: req.depth,
      by: req.by || null,
      power: req.powerMult || 1,       // puissance des relances (Reflet, Écho majeur)
      castNo: c.castCounts[req.spell],  // nombre de lancers de ce sort dans le combat
      firstOfTurn: c.turnState.casts === 0,
      prev: c.lastCast,                 // lancer précédent (pour « sort précédent »)
      hookList: c.hookLists[req.spell],
      baseDamage: B().BASE_DAMAGE * tierMult,
      refBase: B().BASE_DAMAGE * (coreDef.refTier ? B().DAMAGE_TIERS[coreDef.refTier] : tierMult),
      hitsBase: coreDef.hits || 1,
      hitsMult: 1,
      addPct: 0,       // somme des « +X % »
      mult: 1,         // produit des « ×N »
      critChance: coreDef.critChance != null ? coreDef.critChance : B().BASE_CRIT_CHANCE,
      critMult: coreDef.critMult || B().CRIT_MULT,
      missChance: coreDef.miss || 0,
      freezeChance: coreDef.freeze || 0,
      freezeDuration: B().STATUS.FREEZE_DURATION,
      shockBonus: B().STATUS.SHOCK_BONUS,
      hitGrowth: 1,    // chaque coup fait ×hitGrowth de plus que le précédent
      statusMult: 1,   // multiplicateur des statuts appliqués
      statusAdd: 0,    // cumuls ajoutés à chaque application
      noMiss: !!coreDef.noMiss,
      forceCrit: false,
      extraCritHooks: [],
      pendingBonus: [],
      misses: 0,
      hitsLanded: 0,
      crits: 0,
      totalDamage: 0,
      appliedStatuses: {},
      appliedAny: false,
      pendingRecasts: [],
      pctNotes: [],    // « +X % » à journaliser sous le 1er coup
      flags: {},
    };
    c.turnState.casts++;

    c.emit({
      type: 'cast', spell: cast.spellIndex, core: cast.core, symbol: cast.symbol,
      recast: cast.recast, depth: cast.depth, by: cast.by, power: cast.power,
    });
    if (!G.Spells.isImplemented(spell.core)) c.detail(spell.core, 'unimpl', {});
    for (const m of cast.hookList) {
      if (!m.isCore && !G.Modifiers.isImplemented(m.mod)) c.detail(m.name, 'unimpl', {});
      if (m.disabled) c.detail(m.name, 'disabled', {});
    }

    // Effets « sur le sort suivant » laissés par le lancer précédent.
    const nx = c.nextCast;
    if (nx.used) {
      cast.mult *= nx.mult;
      cast.addPct += nx.addPct;
      cast.forceCrit = nx.forceCrit;
      cast.statusMult *= nx.statusMult;
      cast.extraCritHooks = nx.critHooks;
      if (nx.mult !== 1 || nx.addPct) c.detail('sort précédent', 'next_used', { mult: nx.mult * (1 + nx.addPct) });
      if (nx.forceCrit) c.detail('Relais', 'force_crit', {});
      if (nx.detonate) detonate(c, cast);
      c.nextCast = freshNextCast();
    }
    // Avarice sur un autre sort : −20 % par exemplaire.
    const avarice = c.grimoire.reduce((n, s, j) => n + (j === cast.spellIndex ? 0 : s.slots.filter(x => x === 'Avarice').length), 0);
    if (avarice) cast.mult *= Math.pow(0.8, avarice);
    cast.mult *= cast.power;
    // SURCHARGE : les relances en trop renforcent les lancers suivants du tour.
    cast.mult *= c.turnState.surcharge;

    // onCast, de gauche à droite. Vide : les « +X % » de ses modificateurs ×1,5.
    for (const m of cast.hookList) {
      if (!m.handler || !m.handler.onCast) continue;
      const before = cast.addPct;
      m.handler.onCast(c, cast, m);
      if (cast.modPower && !m.isCore) cast.addPct = before + (cast.addPct - before) * cast.modPower;
      if (!m.isCore && cast.addPct !== before) cast.pctNotes.push([m.name, cast.addPct - before]);
    }
    if (c.over) return cast;

    let extra = 0;
    for (const m of cast.hookList) {
      if (m.handler && m.handler.extraHits) extra += m.handler.extraHits(c, cast, m);
    }
    const hits = coreDef.noHit ? 0 : Math.max(1, Math.round(cast.hitsBase * cast.hitsMult) + extra);
    cast.hits = hits;
    // Dégâts nominaux : référence des statuts appliqués hors d'un coup qui touche.
    cast.refDamage = cast.refBase * (1 + cast.addPct) * cast.mult;

    for (let h = 1; h <= hits && !c.over; h++) {
      if (!tick(c)) break;
      resolveHit(c, cast, h, hits, null);
      // Coups bonus (Doublé, Ricochet) : résolus juste après le coup qui les crée.
      while (cast.pendingBonus.length && !c.over) {
        if (!tick(c)) break;
        resolveHit(c, cast, h, hits, cast.pendingBonus.shift());
      }
    }

    if (!c.over) callHooks(cast.hookList, 'afterCast', c, cast);

    // Rayon : série de tours consécutifs où le sort touche.
    const st = c.spellState[cast.spellIndex];
    if (cast.hitsLanded > 0 && st.lastHitTurn !== c.turn) {
      st.streak = st.lastHitTurn === c.turn - 1 ? st.streak + 1 : 0;
      st.lastHitTurn = c.turn;
    }
    // Expérience : +1 % permanent par lancer.
    if (spell.slots.includes('Expérience')) spell.growth.exp = (spell.growth.exp || 0) + 1;

    c.lastCast = cast;
    return cast;
  }

  // Détonateur : consomme les brûlures et inflige leurs dégâts d'un coup.
  function detonate(c, cast) {
    const burn = G.Statuses.consume(c.enemy, 'burn');
    if (!burn.stacks) return;
    const dmg = damageEnemy(c, burn.potency);
    c.emit({ type: 'trigger', key: 'detonate', value: burn.stacks, damage: dmg, enemyHp: c.enemy.hp });
    checkEnemyDeath(c);
  }

  function resolveHit(c, cast, no, of, bonus) {
    const enemy = c.enemy;
    const hit = {
      no, of, bonus, damage: 0, refDamage: 0, crit: false, miss: false,
      addPct: 0, flat: 0, critChance: cast.critChance, forceCrit: cast.forceCrit, critMultAdd: 0,
    };
    const base = {
      type: 'hit', spell: cast.spellIndex, core: cast.core, symbol: cast.symbol,
      recast: cast.recast, depth: cast.depth, no, of, bonus: bonus ? bonus.label : null,
    };

    // Raté ?
    const missChance = cast.noMiss ? 0 : cast.missChance;
    if (missChance > 0 && bad(c, cast, missChance)) {
      hit.miss = true;
      cast.misses++;
      c.emit({ ...base, miss: true, damage: 0, enemyHp: enemy.hp, enemyMaxHp: enemy.maxHp });
      callHooks(cast.hookList, 'onMiss', c, cast, hit);
      return hit;
    }

    for (const m of cast.hookList) {
      if (!m.handler || !m.handler.beforeHit) continue;
      const before = hit.addPct;
      m.handler.beforeHit(c, cast, hit, m);
      if (cast.modPower && !m.isCore) hit.addPct = before + (hit.addPct - before) * cast.modPower;
      if (hit.addPct !== before && no === 1 && !bonus) cast.pctNotes.push([m.name, hit.addPct - before]);
    }

    // Un sort sans dégâts (Miasme, Sceau…) calcule quand même un « coup »
    // à partir de son palier de référence : bonus, multiplicateurs et
    // critiques renforcent alors les statuts qu'il applique.
    const dealsDamage = cast.baseDamage > 0;
    const V = B().DAMAGE_VARIANCE;
    let raw = (dealsDamage ? cast.baseDamage : cast.refBase) * (1 + cast.addPct + hit.addPct) * cast.mult
      * randMult(c, cast, 1 - V, 1 + V)
      * Math.pow(cast.hitGrowth, no - 1)
      * (bonus ? bonus.mult : 1);
    if (dealsDamage) raw += hit.flat;

    // Multiplicateurs conditionnels, de gauche à droite (journalisés après le coup).
    const multDetails = [];
    for (const m of cast.hookList) {
      if (m.handler && m.handler.multiplier) {
        let x = m.handler.multiplier(c, cast, hit, m);
        if (cast.modPower && !m.isCore && x > 1) x = 1 + (x - 1) * cast.modPower; // Vide
        if (x !== 1 && x != null) { raw *= x; multDetails.push({ name: m.name, mult: x }); }
      }
    }

    // Critique.
    let p = hit.critChance;
    if (cast.allOrNothing) p *= 2;
    hit.crit = hit.forceCrit || good(c, cast, p);
    if (hit.crit) {
      const exposure = G.Statuses.stacks(enemy, 'exposure') * B().STATUS.EXPOSURE_PER_STACK;
      raw *= cast.critMult + hit.critMultAdd + exposure;
      cast.crits++;
      c.stats.crits++;
    } else if (cast.allOrNothing) {
      raw = 0;
    }
    if (cast.demesure && raw > 0) raw = Math.pow(10, Math.ceil(Math.log10(raw)));

    hit.refDamage = raw;

    let extraMult = 1;
    const notes = [];
    if (dealsDamage && raw > 0) {
      let dmg = raw + G.Statuses.markBonus(c);
      const shock = G.Statuses.consumeShock(enemy);
      if (shock > 1) { extraMult *= shock; notes.push(['Choc', 'shock_used', { bonus: shock - 1 }]); }
      if (enemy.omenReady) { enemy.omenReady = false; extraMult *= B().STATUS.OMEN_MULT; notes.push(['Présage', 'mult', { mult: B().STATUS.OMEN_MULT }]); }
      if (enemy.nextHitMult) { extraMult *= enemy.nextHitMult; notes.push(['Brisure', 'mult', { mult: enemy.nextHitMult }]); enemy.nextHitMult = 0; }
      hit.damage = damageEnemy(c, dmg * extraMult, { hit: true });
      cast.hitsLanded++;
    }
    cast.totalDamage += hit.damage;
    if (hit.refDamage > 0) c.lastRef = hit.refDamage;

    c.emit({
      ...base, miss: false, crit: hit.crit, damage: hit.damage, noDamage: !dealsDamage,
      enemyHp: enemy.hp, enemyMaxHp: enemy.maxHp,
    });
    if (no === 1 && !bonus) for (const [name, pct] of cast.pctNotes) c.detail(name, 'pct', { pct });
    for (const d of multDetails) c.detail(d.name, 'mult', { mult: d.mult });
    for (const [mod, kind, data] of notes) c.detail(mod, kind, data);

    if (checkEnemyDeath(c)) {
      callHooks(cast.hookList, 'onKill', c, cast, hit);
      return hit;
    }

    callHooks(cast.hookList, 'onHit', c, cast, hit);
    if (hit.crit && !c.over) {
      callHooks(cast.hookList, 'onCrit', c, cast, hit);
      callHooks(cast.extraCritHooks, 'onCrit', c, cast, hit); // Conduit
    }

    // Gel : un seul tirage par coup, avec la chance cumulée du noyau et des mods.
    if (!c.over && cast.freezeChance > 0) {
      const src = { name: cast.hookList.some(m => m.mod === 'Gel') ? 'Gel' : cast.core };
      if (good(c, cast, cast.freezeChance)) {
        G.Modifiers.applyStatus(c, cast, hit, src, 'freeze', 1);
      } else if (cast.flags.freezeFailShock) {
        G.Modifiers.applyStatus(c, cast, hit, { name: 'Givre conducteur' }, 'shock', 1);
      }
    }

    // Doublé / Ricochet : un coup normal peut en créer un autre.
    if (!bonus && !c.over) {
      for (let k = 0; k < (cast.flags.double || 0); k++) {
        if (good(c, cast, 0.25)) { cast.pendingBonus.push({ mult: 1, label: 'double' }); break; }
      }
      for (let k = 0; k < (cast.flags.ricochet || 0); k++) {
        if (good(c, cast, 0.40)) { cast.pendingBonus.push({ mult: 0.5, label: 'ricochet' }); break; }
      }
    }

    checkEnemyDeath(c);
    return hit;
  }

  // --- Attaque ennemie --------------------------------------------------------------

  function enemyAttack(c) {
    const enemy = c.enemy;
    const name = enemy.name;
    const frozen = enemy.statuses.freeze;
    if (frozen && frozen.stacks > 0) {
      frozen.stacks--;
      if (frozen.stacks <= 0) G.Statuses.remove(enemy, 'freeze');
      c.emit({ type: 'enemy_frozen', enemy: name, remaining: frozen.stacks });
      return;
    }
    if (c.rng.chance(G.Statuses.fearChance(enemy))) {
      c.emit({ type: 'enemy_skip', enemy: name, reason: 'fear' });
      return;
    }

    // Le saignement frappe l'ennemi au moment où il attaque.
    const bleedDmg = G.Statuses.bleedTick(c);
    const transfusion = c.passive('Transfusion');
    if (transfusion && bleedDmg > 0) {
      const h = healPlayer(c, bleedDmg * 0.30 * transfusion);
      c.emit({ type: 'passive', mod: 'Transfusion', kind: 'heal', amount: h, hp: c.player.hp, maxHp: c.player.maxHp });
    }
    if (checkEnemyDeath(c)) return;

    const miss = (reason) => c.emit({ type: 'enemy_attack', enemy: name, missed: true, reason, damage: 0,
      playerHp: c.player.hp, playerMaxHp: c.player.maxHp });

    // Mauvais œil : pendant 2 tours, une attaque sur deux rate (50 %).
    if (enemy.evilEye > 0) {
      enemy.evilEye--;
      if (c.rng.chance(0.5)) { miss('evil_eye'); return; }
    }
    // Mirage : la première attaque du combat rate.
    if (c.passive('Mirage') && !c.flags.mirage) { c.flags.mirage = true; miss('mirage'); return; }
    if (c.rng.chance(G.Statuses.enemyMissChance(enemy))) { miss('numb'); return; }
    const dodge = Math.min(B().DODGE_MAX, 0.10 * c.passive('Esquive'));
    if (dodge && c.rng.chance(dodge)) { miss('dodge'); return; }

    const V = B().ENEMY_ATK_VARIANCE;
    let damage = enemy.atk * c.rng.range(1 - V, 1 + V) * G.Statuses.enemyDamageMult(c);
    // Épuisement (Faiblesse ≥ 10) : une seule attaque à 1 dégât.
    if (enemy.exhausted > 0) { enemy.exhausted--; damage = 1; }
    damage = Math.max(1, Math.round(damage));

    // Parade : renvoie entièrement l'attaque.
    const parry = Math.min(B().DODGE_MAX, 0.15 * c.passive('Parade'));
    if (parry && c.rng.chance(parry)) {
      const d = damageEnemy(c, damage);
      c.emit({ type: 'passive', mod: 'Parade', kind: 'reflect', amount: d, enemyHp: enemy.hp });
      checkEnemyDeath(c);
      return;
    }

    const attack = { damage };
    callGlobalHooks(c, 'onEnemyAttack', attack);
    const res = hurtPlayer(c, attack.damage, { fromEnemy: true });
    c.emit({ type: 'enemy_attack', enemy: name, missed: false, damage: res.lost,
      absorbed: res.absorbed, playerHp: c.player.hp, playerMaxHp: c.player.maxHp });
    checkEnemyDeath(c);
    checkPlayerDeath(c);
  }

  // --- Tour ----------------------------------------------------------------------------

  function runTurn(c) {
    const prev = c.turnState;
    c.prevTurn = prev
      ? { wasHit: prev.wasHit, hpLost: prev.hpLost, lostPct: prev.hpLost / c.player.maxHp, anyMiss: prev.anyMiss }
      : { wasHit: false, hpLost: 0, lostPct: 0 };
    c.turnsUnhit = prev && !prev.wasHit ? c.turnsUnhit + 1 : 0;
    c.turn++;
    c.turnState = { recasts: 0, overflow: 0, surcharge: 1, actions: 0, healed: 0, hpLost: 0,
      wasHit: false, casts: 0, safetyHit: false };
    c.emit({ type: 'turn', turn: c.turn });

    const p = c.player;
    p.shield = 0;
    const barrier = c.passive('Barrière');
    if (barrier) {
      p.shield += Math.round(p.maxHp * 0.05 * barrier);
      c.emit({ type: 'passive', mod: 'Barrière', kind: 'shield', amount: Math.round(p.maxHp * 0.05 * barrier), shield: p.shield });
    }
    const countdown = c.passive('Compte à rebours');
    if (countdown) {
      const r = hurtPlayer(c, p.maxHp * 0.05 * countdown, { cost: true });
      c.emit({ type: 'passive', mod: 'Compte à rebours', kind: 'cost', amount: r.lost, hp: p.hp, maxHp: p.maxHp });
    }

    callGlobalHooks(c, 'onTurnStart');

    // File d'attente des lancers. Chaque sort du grimoire y est ajouté à son
    // tour ; ses relances sont insérées EN TÊTE et passent avant le suivant.
    for (let i = 0; i < c.grimoire.length && !c.over; i++) {
      const queue = [{ spell: i, recast: false, depth: 0 }];
      while (queue.length && !c.over && !c.turnState.safetyHit) {
        const cast = castSpell(c, queue.shift());
        if (cast && cast.misses) c.turnState.anyMiss = true;
        if (cast && cast.pendingRecasts.length) queue.unshift(...cast.pendingRecasts);
      }
    }
    if (checkEnemyDeath(c) || checkPlayerDeath(c)) return;

    G.Statuses.tickEndOfTurn(c);
    if (c.over) return;

    // Brûlure sur toi (Immolation) : % de tes PV max, perd 1 cumul par tour.
    if (p.burn > 0) {
      const r = hurtPlayer(c, p.maxHp * B().SELF_BURN_PER_STACK * p.burn, {});
      c.emit({ type: 'self_burn', stacks: p.burn, damage: r.lost, playerHp: p.hp, playerMaxHp: p.maxHp });
      p.burn--;
      if (checkPlayerDeath(c)) return;
    }

    enemyAttack(c);
    if (c.over) return;

    callGlobalHooks(c, 'onTurnEnd');
  }

  // --- Combat complet ------------------------------------------------------------------

  // opts : { grimoire, player: {hp, maxHp}, floor, rng, meta?, snapshots? }
  // meta : état persistant de la partie (ennemis vaincus, statuts vus,
  // statuts transmis par Contamination…), modifié par le combat.
  // Renvoie { won, turns, events, player, enemy, stats }.
  function run(opts) {
    const events = [];
    for (const s of opts.grimoire) s.growth = s.growth || {};
    const c = {
      rng: opts.rng,
      floor: opts.floor,
      grimoire: opts.grimoire,
      meta: opts.meta || { kills: 0, statusesSeen: {} },
      player: { hp: opts.player.hp, maxHp: opts.player.maxHp, shield: 0, burn: 0 },
      enemy: G.Enemies.create(opts.floor, opts.rng),
      turn: 0,
      over: false,
      won: false,
      events,
      castCounts: [],
      spellState: opts.grimoire.map(() => ({ streak: 0, lastHitTurn: -9 })),
      nextCast: freshNextCast(),
      lastCast: null,
      lastRef: B().BASE_DAMAGE,
      turnsUnhit: 0,
      prevTurn: null,
      flags: {},
      stats: { damageDealt: 0, biggestHit: 0, damageTaken: 0, hitsTaken: 0, crits: 0, healed: 0 },
      turnState: null,
    };

    // Nombre d'exemplaires d'un modificateur dans tout le grimoire (effets passifs).
    const passiveCounts = {};
    for (const s of c.grimoire) for (const n of s.slots) if (n) passiveCounts[n] = (passiveCounts[n] || 0) + 1;
    c.passive = name => passiveCounts[name] || 0;
    c.hookLists = c.grimoire.map((_, i) => buildHookList(c, i));

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
    c.requestRecast = (spellIndex, cast, by, powerMult) => {
      if (spellIndex < 0 || spellIndex >= c.grimoire.length) return false;
      const ts = c.turnState;
      if (ts.recasts >= B().MAX_RECASTS_PER_TURN) {
        ts.overflow++;
        ts.surcharge *= B().SURCHARGE_MULT;
        c.emit({ type: 'surcharge', by, count: ts.overflow, mult: ts.surcharge });
        return false;
      }
      ts.recasts++;
      cast.pendingRecasts.push({ spell: spellIndex, recast: true, depth: cast.depth + 1, by, powerMult });
      c.detail(by, 'recast', { target: c.grimoire[spellIndex].core, spell: spellIndex, self: spellIndex === cast.spellIndex });
      return true;
    };
    c.good = (cast, p) => good(c, cast, p);
    c.randMult = (cast, a, b) => randMult(c, cast, a, b);

    // Contamination : une partie des statuts de l'ennemi précédent est transmise.
    if (c.meta.carry) {
      for (const id in c.meta.carry) c.enemy.statuses[id] = { ...c.meta.carry[id], ticks: 0, locked: 0 };
      c.meta.carry = null;
    }

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

    if (c.won) onVictory(c);
    c.emit({ type: 'combat_end', won: c.won, turns: c.turn, stats: c.stats });
    return { won: c.won, turns: c.turn, events, player: c.player, enemy: c.enemy, stats: c.stats };
  }

  // Effets de croissance à la fin d'un combat gagné.
  function onVictory(c) {
    c.meta.kills = (c.meta.kills || 0) + 1;
    for (const spell of c.grimoire) {
      const count = name => spell.slots.filter(s => s === name).length;
      // +1 par victoire ; chaque exemplaire du modificateur lit ce compteur.
      if (count('Trophée')) spell.growth.trophy = (spell.growth.trophy || 0) + 1;
      if (count('Maturation')) spell.growth.maturation = (spell.growth.maturation || 0) + 1;
    }
    const festin = c.passive('Festin');
    if (festin) c.meta.festin = (c.meta.festin || 0) + festin;
    // Contamination : 10 % des statuts (par exemplaire) passent à l'ennemi suivant.
    const conta = c.passive('Contamination');
    if (conta) {
      const carry = {};
      for (const [id, st] of Object.entries(c.enemy.statuses)) {
        if (id === 'freeze' || id === 'shock') continue;
        const n = Math.round(st.stacks * 0.10 * conta);
        if (n > 0) carry[id] = { stacks: n, potency: st.potency * n / st.stacks };
      }
      c.meta.carry = carry;
    }
  }

  return { run, damageEnemy, healPlayer, hurtPlayer, checkEnemyDeath, checkPlayerDeath, freshNextCast };
})();
