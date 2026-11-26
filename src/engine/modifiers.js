// =============================================================================
//  MODIFICATEURS — un handler par modificateur, indexé par son nom exact
//  (tel qu'il apparaît dans data.js). Classés comme dans le CSV.
//
//  Hooks disponibles (tous optionnels). `self` = { name, slot, isCore } :
//  le modificateur lui-même (le noyau a slot = -1).
//
//   Pendant un lancer (noyau puis slots, de gauche à droite) :
//    onCast(c, cast, self)                 début du lancer : réglages, coûts
//    extraHits(c, cast, self) → n          coups en plus (ou en moins)
//    beforeHit(c, cast, hit, self)         avant chaque coup : hit.addPct,
//                                          hit.critChance, hit.forceCrit, hit.flat
//    multiplier(c, cast, hit, self) → ×    multiplicateur conditionnel (journalisé)
//    onHit(c, cast, hit, self)             après chaque coup qui touche
//    onCrit / onMiss / onKill(c, cast, hit, self)
//    afterCast(c, cast, self)              fin du lancer : relances, « sort suivant »
//    statusAmount(c, cast, id, n, self) → n    modifie les statuts appliqués
//    convert(c, cast, {id, n}, self) → [{id, n}…]  convertit un statut appliqué
//    onStatusApplied(c, cast, id, n, self)
//
//   Hors lancer (pour chaque modificateur du grimoire) :
//    onTurnStart(c, spellIdx, self), onTurnEnd(c, spellIdx, self),
//    onEnemyAttack(c, attack, spellIdx, self)
//
//  Les effets globaux (« les brûlures de l'ennemi ne baissent plus »…) sont
//  marqués `passive: true` et lus ailleurs via c.passive(nom).
//  Un modificateur du CSV sans handler est « non implémenté » : il ne fait rien.
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Modifiers = (function () {
  const St = () => G.Statuses;
  const has = (c, id) => St().has(c.enemy, id);
  const stacks = (c, id) => St().stacks(c.enemy, id);
  const hpRatio = c => c.player.hp / c.player.maxHp;
  const firstHit = hit => hit.no === 1 && !hit.bonus;

  // --- Utilitaires partagés ---------------------------------------------------------

  // Applique un statut depuis un lancer : quantité (statusAmount, Catalyseur,
  // Virulence…), conversions (Combustion toxique, Alchimie…), puis journal.
  function applyStatus(c, cast, hit, self, statusId, amount) {
    let n = amount;
    if (cast) {
      for (const m of cast.hookList) {
        if (m.handler && m.handler.statusAmount) n = m.handler.statusAmount(c, cast, statusId, n, m);
      }
      n = n * cast.statusMult + cast.statusAdd;
      if (cast.modPower && !self.isCore) n *= cast.modPower; // Vide
    }
    n = Math.max(0, Math.round(n));
    if (n <= 0) return;

    let entries = [{ id: statusId, n }];
    if (cast) {
      for (const m of cast.hookList) {
        if (m.handler && m.handler.convert) {
          entries = entries.flatMap(e => m.handler.convert(c, cast, e, m) || [e]);
        }
      }
    }

    const ref = hit && hit.refDamage > 0 ? hit.refDamage : (cast ? cast.refDamage : c.lastRef);
    for (const e of entries) {
      if (!(e.n > 0)) continue;
      const res = St().apply(c, e.id, e.n, ref, cast ? {
        shockBonus: cast.shockBonus, freezeDuration: cast.freezeDuration, locked: cast.persist,
      } : {});
      c.meta.statusesSeen = c.meta.statusesSeen || {};
      c.meta.statusesSeen[e.id] = true;
      c.detail(self.name, 'status', { status: e.id, added: res.added, total: res.total });
      if (cast) {
        cast.appliedStatuses[e.id] = (cast.appliedStatuses[e.id] || 0) + e.n;
        cast.appliedAny = true;
        for (const m of cast.hookList) {
          if (m.handler && m.handler.onStatusApplied) m.handler.onStatusApplied(c, cast, e.id, e.n, m);
        }
      }
    }
  }

  function heal(c, self, amount) {
    const h = G.Combat.healPlayer(c, amount);
    c.detail(self.name, 'heal', { amount: h, hp: c.player.hp, maxHp: c.player.maxHp });
  }
  function shield(c, self, amount) {
    const a = Math.max(0, Math.round(amount));
    c.player.shield += a;
    c.detail(self.name, 'shield', { amount: a, shield: c.player.shield });
  }
  // Coût en PV d'un sort : ne peut pas tuer.
  function cost(c, self, amount) {
    const r = G.Combat.hurtPlayer(c, amount, { cost: true });
    c.detail(self.name, 'cost', { amount: r.lost, hp: c.player.hp, maxHp: c.player.maxHp });
  }
  // Effets « sur le prochain lancer ».
  function next(c) { c.nextCast.used = true; return c.nextCast; }

  function randomStatuses(c, count) {
    const pool = St().RANDOM_POOL.slice();
    const out = [];
    for (let i = 0; i < count && pool.length; i++) out.push(pool.splice(Math.floor(c.rng.next() * pool.length), 1)[0]);
    return out;
  }

  // Fabrique : « Applique n cumul(s) du statut id » à chaque coup.
  const status = (id, n = 1) => ({
    appliesStatus: true,
    onHit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, id, n),
  });
  // Fabrique : multiplicateur sous condition.
  const multIf = (cond, x) => ({ multiplier: (c, cast, hit) => cond(c, cast, hit) ? x : 1 });
  // Fabrique : « +X % par … » (additif avec les autres +X %).
  const pctPer = (fn) => ({ beforeHit: (c, cast, hit) => { hit.addPct += fn(c, cast, hit); } });
  // Fabrique : relance d'un sort (décalage 0 = lui-même, +1 = suivant, −1 = précédent).
  const recastChance = (chanceFn, offset = 0) => ({
    afterCast(c, cast, self) {
      if (c.good(cast, chanceFn(c, cast))) c.requestRecast(cast.spellIndex + offset, cast, self.name);
    },
  });
  // Effet global lu ailleurs (combat.js / statuses.js).
  const PASSIVE = { passive: true };

  // Seuils qui consomment un statut et déclenchent un effet.
  function consumeNote(c, self, id, extra = {}) {
    const r = St().consume(c.enemy, id);
    if (r.stacks) c.detail(self.name, 'consume', { status: id, stacks: r.stacks, ...extra });
    return r;
  }

  const H = {
    // =============================================================== Statut
    'Brûlure': status('burn'),
    'Saignement': status('bleed'),
    'Poison': status('poison'),
    // Gel : +15 % de chance de geler à chaque coup (s'additionne au noyau et
    // aux autres Gel ; un seul tirage par coup, voir combat.js).
    'Gel': { appliesStatus: true, onCast: (c, cast) => { cast.freezeChance += G.BALANCE.STATUS.FREEZE_CHANCE_PER_MOD; } },
    // Choc : appliqué après le coup, donc consommé par le coup SUIVANT.
    'Choc': status('shock'),
    'Fragilité': status('fragile'),
    'Faiblesse': status('weak'),
    'Engourdissement': status('numb'),
    'Marque': status('mark'),
    'Malédiction': status('curse'),
    'Statut aléatoire': {
      appliesStatus: true,
      onHit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, c.rng.pick(St().RANDOM_POOL), 2),
    },
    'Exposition': status('exposure'),
    'Lien de douleur': status('link'),
    'Cendres': status('ash'),
    'Corrosion': status('corrosion'),
    'Fêlure': status('crack'),
    'Combustible': status('combustible'),
    'Peur': status('fear'),
    'Gelure': status('frostbite'),
    'Hémophilie': PASSIVE,
    'Statut double': {
      appliesStatus: true,
      onHit(c, cast, hit, self) {
        for (const id of randomStatuses(c, 2)) applyStatus(c, cast, hit, self, id, 1);
      },
    },
    'Présage': status('omen'),

    // ============================================== Amplification de statut
    'Brasier':         { statusAmount: (c, cast, id, n) => id === 'burn' ? n * 2 : n },
    'Hémorragie':      { statusAmount: (c, cast, id, n) => id === 'bleed' ? n * 2 : n },
    'Venin concentré': { statusAmount: (c, cast, id, n) => id === 'poison' ? n * 2 : n },
    'Givre profond':   { onCast: (c, cast) => { cast.freezeDuration = 2; } },
    'Haute tension':   { onCast: (c, cast) => { cast.shockBonus = 1.5; } },
    'Virulence':       { statusAmount: (c, cast, id, n) => n + 1 },
    'Feu éternel': PASSIVE,
    'Sang épais': PASSIVE,
    'Neurotoxine': PASSIVE,
    // Glaciation : ce sort gagne +5 % de chance de gel par gel déjà subi.
    'Glaciation': { onCast: (c, cast) => { cast.freezeChance += 0.05 * (c.enemy.freezesTaken || 0); } },
    'Surtension': PASSIVE,
    'Marque profonde': PASSIVE,
    'Malédiction rapide': PASSIVE,
    'Prolifération': PASSIVE,
    'Persistance': { onCast: (c, cast) => { cast.persist = true; } },

    // ============================================================ Condition
    'Si brûle → ×2': multIf(c => has(c, 'burn'), 2),
    'Si saigne → vampirisme': {
      onHit: (c, cast, hit, self) => { if (has(c, 'bleed')) heal(c, self, hit.damage * 0.30); },
    },
    'Si empoisonné → +2 poisons': {
      appliesStatus: true,
      onHit: (c, cast, hit, self) => { if (has(c, 'poison')) applyStatus(c, cast, hit, self, 'poison', 2); },
    },
    // Si gelé → éclat : consomme le gel, ×4.
    'Si gelé → éclat': {
      multiplier(c, cast, hit, self) {
        if (!has(c, 'freeze')) return 1;
        St().remove(c.enemy, 'freeze');
        return 4;
      },
    },
    'Si gelé → choc thermique': {
      appliesStatus: true,
      onHit: (c, cast, hit, self) => { if (has(c, 'freeze')) applyStatus(c, cast, hit, self, 'burn', 3); },
    },
    'Si choqué → +1 coup': { extraHits: c => has(c, 'shock') ? 1 : 0 },
    'Si marqué → critique': { beforeHit: (c, cast, hit) => { if (stacks(c, 'mark') >= 3) hit.forceCrit = true; } },
    'Si saigne → brûlures ×2': {
      onHit(c, cast, hit, self) {
        if (has(c, 'bleed') && has(c, 'burn')) {
          St().scale(c, 'burn', 2);
          c.detail(self.name, 'scale', { status: 'burn', factor: 2, total: stacks(c, 'burn') });
        }
      },
    },
    'Exécution': multIf(c => c.enemy.hp < c.enemy.maxHp * 0.30, 3),
    'Ouverture': multIf(c => c.enemy.hp > c.enemy.maxHp * 0.90, 2),
    'Rage': multIf(c => hpRatio(c) < 0.50, 2),
    'Sérénité': multIf(c => c.player.hp >= c.player.maxHp, 1.5),
    'Riposte': multIf(c => c.prevTurn && c.prevTurn.wasHit, 2),
    'Premier tour': multIf(c => c.turn === 1, 3),
    'Si critique → 3 saignements': { appliesStatus: true, onCrit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'bleed', 3) },
    'Si critique → 2 brûlures':    { appliesStatus: true, onCrit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'burn', 2) },
    // Si rate → relance : une relance par lancer raté (pas par coup raté).
    'Si rate → relance': {
      afterCast(c, cast, self) { if (cast.misses > 0) c.requestRecast(cast.spellIndex, cast, self.name); },
    },
    'Si aucun statut → infection': {
      appliesStatus: true,
      onHit(c, cast, hit, self) {
        if (St().distinctCount(c.enemy) === 0) for (const id of randomStatuses(c, 2)) applyStatus(c, cast, hit, self, id, 1);
      },
    },
    'Par statut différent → +50 %': pctPer(c => 0.50 * St().distinctCount(c.enemy)),
    'Par brûlure → +5 %': pctPer(c => 0.05 * stacks(c, 'burn')),
    'Par poison → +3 % crit': { beforeHit: (c, cast, hit) => { hit.critChance += 0.03 * stacks(c, 'poison'); } },
    // « +4 dégâts fixes » : mis à l'échelle en +4 % par saignement.
    'Par saignement → +4 dégâts': pctPer(c => 0.04 * stacks(c, 'bleed')),
    'Tour pair → ×2': multIf(c => c.turn % 2 === 0, 2),
    'Tour impair → +1 coup': { extraHits: c => c.turn % 2 === 1 ? 1 : 0 },
    'Outsider': multIf(c => c.enemy.hp > c.player.hp, 2),
    'Si bouclier → ×2': multIf(c => c.player.shield > 0, 2),
    'Si soigné → +50 %': pctPer(c => c.turnState.healed > 0 ? 0.50 : 0),
    'Vengeance': multIf(c => c.prevTurn && c.prevTurn.lostPct > 0.20, 3),
    'Revanche': multIf((c, cast) => cast.prev && cast.prev.misses > 0, 3),
    'Si 3 statuts → critique': { beforeHit: (c, cast, hit) => { if (St().distinctCount(c.enemy) >= 3) hit.forceCrit = true; } },
    'Fièvre': multIf(c => has(c, 'burn') && has(c, 'bleed'), 4),
    'Court-circuit': multIf(c => has(c, 'freeze') && has(c, 'shock'), 5),
    'Toxine ardente': {
      appliesStatus: true,
      onHit: (c, cast, hit, self) => { if (has(c, 'burn') && has(c, 'poison')) applyStatus(c, cast, hit, self, 'poison', 3); },
    },
    'Coup de grâce': {
      onHit(c, cast, hit, self) {
        if (c.enemy.hp > 0 && c.enemy.hp < c.enemy.maxHp * 0.10) {
          const d = c.enemy.hp;
          c.enemy.hp = 0;
          c.stats.damageDealt += d;
          c.detail(self.name, 'kill', { amount: d });
          G.Combat.checkEnemyDeath(c);
        }
      },
    },
    'Endurance': multIf(c => c.turn >= 10, 3),
    'Dernier souffle': { extraHits: c => hpRatio(c) < 0.25 ? 3 : 0 },
    // Frénésie : un critique relance le sort (une fois par lancer et par exemplaire).
    'Frénésie': {
      onCrit(c, cast, hit, self) {
        const key = 'frenzy' + self.slot;
        if (cast.flags[key]) return;
        cast.flags[key] = true;
        c.requestRecast(cast.spellIndex, cast, self.name);
      },
    },
    'Éclat de givre': { appliesStatus: true, onCrit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'freeze', 1) },
    'Critique salvateur': { onCrit: (c, cast, hit, self) => heal(c, self, c.player.maxHp * 0.05) },
    'Embuscade': { beforeHit: (c, cast, hit) => { if (c.stats.crits === 0) hit.critChance += 1; } },
    'Par fragilité → +1 % crit': { beforeHit: (c, cast, hit) => { hit.critChance += 0.01 * stacks(c, 'fragile'); } },
    'Par marque → +5 % crit': { beforeHit: (c, cast, hit) => { hit.critChance += 0.05 * stacks(c, 'mark'); } },
    'Par malédiction → +10 %': pctPer(c => 0.10 * stacks(c, 'curse')),
    'Par gel subi → +20 %': pctPer(c => 0.20 * (c.enemy.freezesTaken || 0)),
    'Acharnement': pctPer(c => 0.10 * Math.floor((1 - c.enemy.hp / c.enemy.maxHp) * 10)),
    'Odeur du sang': { beforeHit: (c, cast, hit) => { hit.critChance += 0.02 * stacks(c, 'bleed'); } },

    // ================================================================ Seuil
    'Brûlure ≥ 10 → explosion': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'burn') < 10) return;
        const r = St().consume(c.enemy, 'burn');
        const d = G.Combat.damageEnemy(c, r.potency * 3);
        c.detail(self.name, 'consume', { status: 'burn', stacks: r.stacks, damage: d });
      },
    },
    'Poison ≥ 5 → contagion': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'poison') < 5) return;
        St().scale(c, 'poison', 2);
        c.detail(self.name, 'scale', { status: 'poison', factor: 2, total: stacks(c, 'poison') });
      },
    },
    'Saignement ≥ 8 → hémorragie': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'bleed') < 8) return;
        St().consume(c.enemy, 'bleed');
        const d = G.Combat.damageEnemy(c, c.enemy.maxHp * 0.10);
        c.detail(self.name, 'consume', { status: 'bleed', stacks: 8, damage: d });
      },
    },
    // Brisure : consomme les fragilités ; le prochain coup reçu fait ×5.
    'Fragilité ≥ 5 → brisure': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'fragile') < 5) return;
        consumeNote(c, self, 'fragile');
        c.enemy.nextHitMult = 5;
        c.detail(self.name, 'flag', { key: 'brisure' });
      },
    },
    'Marques ≥ 5 → condamnation': {
      multiplier(c, cast, hit, self) {
        if (stacks(c, 'mark') < 5) return 1;
        const r = St().consume(c.enemy, 'mark');
        return r.stacks || 1;
      },
    },
    'Statuts ≥ 20 → cataclysme': multIf(c => St().totalStacks(c.enemy) >= 20, 10),
    '3 gels → glaciation': PASSIVE,
    'Chocs ≥ 3 → foudre en chaîne': {
      extraHits(c, cast, self) {
        if (stacks(c, 'shock') < 3) return 0;
        consumeNote(c, self, 'shock');
        return 3;
      },
    },
    // Mauvais œil : pendant 2 tours, l'ennemi rate une attaque sur deux (50 %).
    'Malédictions ≥ 5 → mauvais œil': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'curse') < 5 || c.enemy.evilEye > 0) return;
        c.enemy.evilEye = 2;
        c.detail(self.name, 'flag', { key: 'evil_eye' });
      },
    },
    'Corrosion ≥ 10 → dissolution': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'corrosion') < 10 || c.enemy.dissolved) return;
        c.enemy.dissolved = true;
        c.detail(self.name, 'flag', { key: 'dissolved' });
      },
    },
    // Épuisement : consomme 10 faiblesses ; la prochaine attaque ennemie fait 1 dégât.
    'Faiblesse ≥ 10 → épuisement': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'weak') < 10) return;
        consumeNote(c, self, 'weak');
        c.enemy.exhausted = 1;
        c.detail(self.name, 'flag', { key: 'exhausted' });
      },
    },
    'Engourdissement ≥ 5 → paralysie': {
      onHit(c, cast, hit, self) {
        if (stacks(c, 'numb') < 5) return;
        consumeNote(c, self, 'numb');
        applyStatus(c, null, hit, self, 'freeze', 1);
      },
    },
    'Brûlure ≥ 25 → supernova': {
      multiplier(c, cast, hit, self) {
        if (stacks(c, 'burn') < 25) return 1;
        St().consume(c.enemy, 'burn');
        return 10;
      },
    },
    '5 statuts différents → arc-en-ciel': {
      onHit(c, cast, hit, self) {
        if (St().distinctCount(c.enemy) < 5) return;
        for (const id of Object.keys(c.enemy.statuses)) if (id !== 'freeze') St().scale(c, id, 2);
        c.detail(self.name, 'scale', { status: 'all', factor: 2 });
      },
    },

    // =========================================================== Conversion
    'Combustion toxique': { convert: (c, cast, e) => e.id === 'burn' ? [{ id: 'poison', n: e.n * 2 }] : [e] },
    'Sang bouillant':     { convert: (c, cast, e) => e.id === 'bleed' ? [e, { id: 'burn', n: e.n }] : [e] },
    'Givre conducteur':   { onCast: (c, cast) => { cast.flags.freezeFailShock = true; } },
    'Poison nourricier': PASSIVE,
    // Moisson : consomme tous les statuts, +20 % de dégâts par cumul consommé.
    'Moisson': {
      onCast(c, cast, self) {
        const n = St().consumeAll(c.enemy);
        if (n) { cast.addPct += 0.20 * n; c.detail(self.name, 'consume', { status: 'all', stacks: n }); }
      },
    },
    'Copie': {
      appliesStatus: true,
      onHit(c, cast, hit, self) {
        let best = null;
        for (const [id, st] of Object.entries(c.enemy.statuses)) if (st.stacks > 0 && (!best || st.stacks > best[1])) best = [id, st.stacks];
        if (!best) return;
        const r = St().addSame(c, best[0], 1);
        if (r) c.detail(self.name, 'status', { status: best[0], added: 1, total: r.total });
      },
    },
    'Transfusion': PASSIVE,
    'Givre cassant': { convert: (c, cast, e) => e.id === 'freeze' ? [e, { id: 'fragile', n: 3 * e.n }] : [e] },
    'Sang vicié':    { convert: (c, cast, e) => e.id === 'poison' ? [e, { id: 'bleed', n: e.n }] : [e] },
    'Étincelles':    { convert: (c, cast, e) => e.id === 'shock' ? [e, { id: 'burn', n: 2 * e.n }] : [e] },
    // Ferveur : 50 % des soins reçus ce tour s'ajoutent aux dégâts (1er coup).
    'Ferveur': { beforeHit: (c, cast, hit) => { if (firstHit(hit)) hit.flat += 0.5 * c.turnState.healed; } },
    // Bélier : consomme ton bouclier et l'ajoute aux dégâts du 1er coup.
    'Bélier': {
      onCast(c, cast, self) {
        cast.flags.ram = (cast.flags.ram || 0) + c.player.shield;
        if (c.player.shield) c.detail(self.name, 'ram', { amount: c.player.shield });
        c.player.shield = 0;
      },
      beforeHit: (c, cast, hit) => { if (firstHit(hit)) hit.flat += cast.flags.ram || 0; },
    },
    'Rancune': PASSIVE,
    'Catalyse critique': {
      onCrit(c, cast, hit, self) {
        const ids = Object.keys(c.enemy.statuses).filter(id => has(c, id));
        for (const id of ids) St().addSame(c, id, 1);
        if (ids.length) c.detail(self.name, 'spread', { count: ids.length });
      },
    },
    'Amertume': { appliesStatus: true, onMiss: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'poison', 2) },
    'Feu protecteur': {
      onStatusApplied: (c, cast, id, n, self) => { if (id === 'burn') shield(c, self, c.player.maxHp * 0.02 * n); },
    },
    // Alchimie : chaque statut appliqué a 25 % de chance d'en devenir un autre.
    'Alchimie': {
      convert(c, cast, e) {
        if (!c.rng.chance(0.25)) return [e];
        const others = St().RANDOM_POOL.filter(id => id !== e.id);
        return [{ id: c.rng.pick(others), n: e.n }];
      },
    },

    // ======================================================== Amplificateur
    // Les « +X % » s'additionnent entre eux ; les « ×N » se multiplient.
    'Puissance':  { onCast: (c, cast) => { cast.addPct += 0.50; } },
    'Précision':  { onCast: (c, cast) => { cast.critChance += 0.20; } },
    'Brutalité':  { onCast: (c, cast) => { cast.critMult += 1; } },
    'Multicoup':  { extraHits: () => 1 },
    // Fracture : ×3 coups (avant les coups bonus), chacun à 40 % des dégâts.
    'Fracture':   { onCast: (c, cast) => { cast.hitsMult *= 3; cast.mult *= 0.40; } },
    // Écho : 30 % de chance que le sort se relance.
    'Écho': recastChance(() => 0.30),
    // Résonance : une relance de ce sort a +10 % par niveau de profondeur de se relancer.
    'Résonance': {
      afterCast(c, cast, self) {
        if (cast.recast && c.good(cast, 0.10 * cast.depth)) c.requestRecast(cast.spellIndex, cast, self.name);
      },
    },
    'Infaillible': { onCast: (c, cast) => { cast.noMiss = true; } },
    'Constance':   { onCast: (c, cast) => { cast.constance = true; } },
    'Chaos':       { multiplier: (c, cast) => c.randMult(cast, 0, 4) },
    'Concentration': multIf((c, cast) => cast.spell.slots.filter(Boolean).length === 1, 3),
    // Unité : +30 % par modificateur de ce sort qui a un double sur ce sort.
    'Unité': pctPer((c, cast) => {
      const s = cast.spell.slots.filter(Boolean);
      return 0.30 * s.filter(n => s.indexOf(n) !== s.lastIndexOf(n)).length;
    }),
    'Diversité': pctPer(c => 0.30 * new Set(c.grimoire.map(s => s.core)).size),
    // Létalité : les critiques font +100 % (le multiplicateur critique est doublé).
    'Létalité':  { onCast: (c, cast) => { cast.critMult *= 2; } },
    'Doublé':    { onCast: (c, cast) => { cast.flags.double = (cast.flags.double || 0) + 1; } },
    'Ricochet':  { onCast: (c, cast) => { cast.flags.ricochet = (cast.flags.ricochet || 0) + 1; } },
    'Démultiplication': { onCast: (c, cast) => { cast.hitGrowth *= 1.10; } },
    'Pureté': multIf((c, cast) => cast.freezeChance <= 0 &&
      !cast.hookList.some(m => m.handler && m.handler.appliesStatus), 2),
    'Symétrie': multIf((c, cast) => { const s = cast.spell.slots; return s[0] && s.every(n => n === s[0]); }, 2),
    'Collection': pctPer(c => 0.15 * new Set(c.grimoire.flatMap(s => s.slots.filter(Boolean))).size),
    // Écho majeur : 60 % de relance, chaque relance à 70 % de la puissance du lancer.
    'Écho majeur': {
      afterCast(c, cast, self) {
        if (c.good(cast, 0.60)) c.requestRecast(cast.spellIndex, cast, self.name, cast.power * 0.70);
      },
    },
    'Démesure':     { onCast: (c, cast) => { cast.demesure = true; } },
    'Chance':       { onCast: (c, cast) => { cast.luck = true; } },
    'Tout ou rien': { onCast: (c, cast) => { cast.allOrNothing = true; } },
    'Minimalisme':  pctPer(c => 0.20 * c.grimoire.reduce((n, s) => n + s.slots.filter(x => !x).length, 0)),

    // =============================================================== Survie
    'Vampirisme': { onHit: (c, cast, hit, self) => heal(c, self, hit.damage * 0.10) },
    'Bouclier':   { onHit: (c, cast, hit, self) => { if (hit.damage > 0) shield(c, self, hit.damage * 0.20); } },
    'Épines': PASSIVE,
    'Régénération': { onCast: (c, cast, self) => heal(c, self, c.player.maxHp * 0.02) },
    'Garde glaciale': {
      onCast: (c, cast, self) => { if (has(c, 'freeze')) shield(c, self, c.player.maxHp * 0.10); },
    },
    'Esquive': PASSIVE,
    'Seconde chance': PASSIVE,
    'Barrière': PASSIVE,
    // Absorption : 20 % des dégâts deviennent des PV max (et PV) pour le combat.
    'Absorption': {
      onHit(c, cast, hit, self) {
        const a = Math.round(hit.damage * 0.20);
        if (a <= 0) return;
        c.player.maxHp += a;
        c.player.hp += a;
        c.detail(self.name, 'maxhp', { amount: a, hp: c.player.hp, maxHp: c.player.maxHp });
      },
    },
    'Contre-givre': PASSIVE,
    'Peau de pierre': PASSIVE,
    'Sanctuaire': PASSIVE,
    'Parade': PASSIVE,
    'Ténacité': PASSIVE,
    'Sang-froid': PASSIVE,
    'Absorption de statut': {
      onStatusApplied: (c, cast, id, n, self) => heal(c, self, c.player.maxHp * 0.01),
    },
    'Mirage': PASSIVE,

    // ================================================================ Risque
    // Les coûts en PV ne peuvent pas tuer (on reste à 1 PV au minimum).
    'Sacrifice':     { onCast: (c, cast, self) => { cast.mult *= 2; cost(c, self, c.player.hp * 0.05); } },
    'Pacte de sang': { onCast: (c, cast, self) => { cast.mult *= 3; cost(c, self, c.player.maxHp * 0.03); } },
    'Instable':      { multiplier: (c, cast) => c.good(cast, 0.50) ? 3 : 0 },
    // Fragile : ×2 ; « tu subis +15 % de dégâts » est lu en passif.
    'Fragile':       { onCast: (c, cast) => { cast.mult *= 2; } },
    'Lourd':         { onCast: (c, cast) => { cast.mult *= 2; }, extraHits: () => -1 },
    'Ascèse':        multIf(c => c.player.shield <= 0, 4),
    'Désespoir':     pctPer(c => 1 - hpRatio(c)),
    'Gourmand': {
      onCast(c, cast, self) {
        cast.mult *= 2.5;
        const n = St().consumeAll(c.enemy);
        if (n) c.detail(self.name, 'consume', { status: 'all', stacks: n });
      },
    },
    'Kamikaze':      { onCast: (c, cast, self) => { cast.mult *= 5; cost(c, self, c.player.hp * 0.20); } },
    'Roulette':      { multiplier: (c, cast) => c.good(cast, 1 / 6) ? 10 : 0.8 },
    // Vertige : ×3, mais 20 % de chance par lancer de te frapper (10 % de tes PV max).
    'Vertige': {
      onCast(c, cast, self) {
        cast.mult *= 3;
        if (c.rng.chance(0.20)) {
          const r = G.Combat.hurtPlayer(c, c.player.maxHp * 0.10, {});
          c.detail(self.name, 'self_hit', { amount: r.lost, hp: c.player.hp, maxHp: c.player.maxHp });
          G.Combat.checkPlayerDeath(c);
        }
      },
    },
    // Compte à rebours : ×2 par tour écoulé (×2 au tour 2, ×4 au tour 3…) ;
    // la perte de 5 % des PV max par tour est gérée en début de tour.
    'Compte à rebours': { multiplier: c => Math.max(1, 2 * (c.turn - 1)) },
    'Avarice':  { onCast: (c, cast) => { cast.mult *= 3; } },
    'Égoïsme':  { onCast: (c, cast) => { cast.mult *= 2; } },
    'Hubris':   { multiplier: c => c.flags.wasHitCombat ? 0.5 : 4 },
    'Martyr':   pctPer(c => 0.10 * c.stats.hitsTaken),
    'Immolation': {
      appliesStatus: true,
      onCast(c, cast, self) { c.player.burn += 1; c.detail(self.name, 'self_burn', { stacks: c.player.burn }); },
      onHit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'burn', 5),
    },

    // =========================================================== Entre sorts
    // « Le sort suivant » = le prochain lancer, quel qu'il soit (une relance
    // comprise, ou le premier sort du tour suivant).
    'Préparation': {
      afterCast(c, cast, self) { next(c).mult *= 1.5; c.detail(self.name, 'next', { what: 'mult', mult: 1.5 }); },
    },
    'Relais': {
      afterCast(c, cast, self) {
        if (cast.crits > 0) { next(c).forceCrit = true; c.detail(self.name, 'next', { what: 'crit' }); }
      },
    },
    'Catalyseur': {
      afterCast(c, cast, self) { next(c).statusMult *= 2; c.detail(self.name, 'next', { what: 'status' }); },
    },
    // Fusion / Héritage : appliquent (100 % / 50 %) les statuts du lancer précédent, au 1er coup.
    'Fusion': {
      appliesStatus: true,
      onHit(c, cast, hit, self) {
        if (!firstHit(hit) || !cast.prev) return;
        for (const [id, n] of Object.entries(cast.prev.appliedStatuses)) applyStatus(c, cast, hit, self, id, n);
      },
    },
    'Miroir': {}, // résolu dans combat.js : copie le handler du slot correspondant
    'Prélude': multIf((c, cast) => cast.firstOfTurn, 2),
    'Finale':  multIf((c, cast) => cast.spellIndex === c.grimoire.length - 1, 2),
    'Chaîne':  recastChance(() => 0.20, +1),
    'Harmonie': pctPer((c, cast) => {
      const mine = new Set(cast.spell.slots.filter(Boolean));
      return 0.25 * c.grimoire.filter(s => s !== cast.spell && s.slots.some(n => n && mine.has(n))).length;
    }),
    'Rappel': recastChance(() => 0.30, -1),
    'Héritage': {
      appliesStatus: true,
      onHit(c, cast, hit, self) {
        if (!firstHit(hit) || !cast.prev) return;
        for (const [id, n] of Object.entries(cast.prev.appliedStatuses)) applyStatus(c, cast, hit, self, id, Math.floor(n / 2));
      },
    },
    'Amorce': {
      afterCast(c, cast, self) {
        if (cast.appliedAny) { next(c).mult *= 1.5; c.detail(self.name, 'next', { what: 'mult', mult: 1.5 }); }
      },
    },
    'Détonateur': {
      afterCast(c, cast, self) { next(c).detonate = true; c.detail(self.name, 'next', { what: 'detonate' }); },
    },
    // Conduit : les effets « si critique » de ce sort agissent aussi sur le suivant.
    'Conduit': {
      afterCast(c, cast, self) {
        const hooks = cast.hookList.filter(m => m.handler && m.handler.onCrit);
        if (hooks.length) { next(c).critHooks = hooks; c.detail(self.name, 'next', { what: 'conduit' }); }
      },
    },
    'Contrepoint': multIf((c, cast) => cast.prev && cast.prev.totalDamage === 0, 2),
    'Unisson': pctPer((c, cast) => cast.prev && cast.prev.core === cast.core ? 0.50 : 0),
    'Offrande': {
      onCast: (c, cast) => { cast.mult = 0; },
      afterCast(c, cast, self) { next(c).mult *= 3; c.detail(self.name, 'next', { what: 'mult', mult: 3 }); },
    },
    'Écho total': {
      afterCast(c, cast, self) {
        if (cast.pendingRecasts.some(r => r.spell === cast.spellIndex)) c.requestRecast(cast.spellIndex + 1, cast, self.name);
      },
    },
    'Onde porteuse': {
      onCast(c, cast, self) {
        if (cast.recast) { next(c).addPct += 0.10; c.detail(self.name, 'next', { what: 'pct', pct: next(c).addPct }); }
      },
    },

    // ============================================================ Croissance
    'Élan':      pctPer((c, cast) => 0.10 * (cast.castNo - 1)),
    'Fureur':    pctPer(c => 0.05 * (c.turn - 1)),
    // Accumulation : +1 cumul par application au 1er lancer, +2 au 2e, etc.
    'Accumulation': { statusAmount: (c, cast, id, n) => n + cast.castNo },
    'Crescendo': { extraHits: c => Math.floor((c.turn - 1) / 3) },
    'Patience':  pctPer(c => 0.25 * c.turnsUnhit),
    'Trophée':   pctPer((c, cast) => 0.01 * (cast.spell.growth.trophy || 0)),
    'Expérience': pctPer((c, cast) => 0.01 * (cast.spell.growth.exp || 0)),
    'Festin': PASSIVE,
    'Érudit':    pctPer(c => 0.02 * Object.keys(c.meta.statusesSeen || {}).length),
    'Maturation': { statusAmount: (c, cast, id, n) => n + (cast.spell.growth.maturation || 0) },
    'Avalanche': { onCast: (c, cast) => { cast.hitGrowth *= 1.05; } },
    'Vortex':    recastChance(c => 0.01 * c.turn),
    'Abysse':    pctPer(c => 0.01 * c.floor),
    'Contamination': PASSIVE,
    'Cicatrices': pctPer((c, cast) => 0.05 * (cast.spell.growth.scars || 0)),
  };

  function data(name) { return G.DATA.modificateurs.find(m => m.name === name) || null; }
  function get(name) { return H[name] || null; }
  function isImplemented(name) { return !!H[name]; }

  return { HANDLERS: H, data, get, isImplemented, applyStatus, heal };
})();
