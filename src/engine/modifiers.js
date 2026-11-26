// =============================================================================
//  MODIFICATEURS — un handler par modificateur, indexé par son nom exact
//  (tel qu'il apparaît dans data.js).
//
//  Hooks disponibles (tous optionnels). `self` = { name, slot } : le
//  modificateur lui-même (le noyau a slot = -1).
//
//   Pendant un lancer (appelés sur le noyau puis sur les slots, de gauche à droite) :
//    onCast(c, cast, self)            début du lancer : réglages (crit, coût…)
//    extraHits(c, cast, self) → n     coups en plus (ou en moins)
//    multiplier(c, cast, hit, self) → ×   multiplicateur conditionnel, par coup
//    statusAmount(c, cast, statusId, n, self) → n   modifie les statuts appliqués
//    onHit(c, cast, hit, self)        après chaque coup qui touche
//    onCrit(c, cast, hit, self)       après un coup critique
//    onMiss(c, cast, hit, self)       après un coup raté
//    onKill(c, cast, hit, self)       quand le coup tue l'ennemi
//    afterCast(c, cast, self)         fin du lancer (relances, effets « sort suivant »)
//
//   Hors lancer (appelés pour chaque modificateur du grimoire) :
//    onTurnStart(c, spellIdx, self)
//    onTurnEnd(c, spellIdx, self)
//    onEnemyAttack(c, attack, spellIdx, self)
//
//  Pour journaliser un effet : c.detail(self.name, kind, données).
//  Un modificateur du CSV sans handler est « non implémenté » : il ne fait rien.
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Modifiers = (function () {
  const B = () => G.BALANCE;

  // Applique un statut depuis un lancer, en passant par les hooks
  // statusAmount des modificateurs du sort, puis journalise.
  function applyStatus(c, cast, hit, self, statusId, amount) {
    let n = amount;
    for (const m of cast.hookList) {
      if (m.handler && m.handler.statusAmount) n = m.handler.statusAmount(c, cast, statusId, n, m);
    }
    n = Math.max(0, Math.round(n));
    if (n <= 0) return;
    const res = G.Statuses.apply(c, statusId, n, hit ? hit.refDamage : cast.refDamage);
    cast.appliedStatuses[statusId] = (cast.appliedStatuses[statusId] || 0) + n;
    c.detail(self.name, 'status', { status: statusId, added: res.added, total: res.total });
  }

  // Soigne le joueur (plafonné aux PV max) et journalise.
  function heal(c, self, amount) {
    const p = c.player;
    const healed = Math.max(0, Math.min(p.maxHp - p.hp, Math.round(amount)));
    p.hp += healed;
    c.turnState.healed += healed;
    c.detail(self.name, 'heal', { amount: healed, hp: p.hp, maxHp: p.maxHp });
  }

  const H = {
    // ---------------------------------------------------------------- Statut
    'Brûlure':    { onHit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'burn', 1) },
    'Saignement': { onHit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'bleed', 1) },
    'Poison':     { onHit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'poison', 1) },
    // Gel : +15 % de chance de geler à chaque coup (s'additionne au noyau
    // et aux autres Gel ; un seul tirage par coup, voir combat.js).
    'Gel':        { onCast: (c, cast) => { cast.freezeChance += B().STATUS.FREEZE_CHANCE_PER_MOD; } },
    // Choc : appliqué après le coup, donc consommé par le coup SUIVANT
    // (le 2e coup d'une Lame, ou le sort suivant).
    'Choc':       { onHit: (c, cast, hit, self) => applyStatus(c, cast, hit, self, 'shock', 1) },

    // ------------------------------------------------------------- Condition
    'Si brûle → ×2': {
      multiplier: (c) => G.Statuses.has(c.enemy, 'burn') ? 2 : 1,
    },
    'Exécution': {
      multiplier: (c) => c.enemy.hp < c.enemy.maxHp * 0.30 ? 3 : 1,
    },
    // Si le sort rate (au moins un coup raté), il se relance immédiatement.
    'Si rate → relance': {
      afterCast(c, cast, self) {
        if (cast.misses > 0) c.requestRecast(cast.spellIndex, cast, self.name);
      },
    },

    // ---------------------------------------------------------- Amplificateur
    // Les « +X % » s'additionnent entre eux ; les « ×N » se multiplient.
    'Puissance':  { onCast: (c, cast) => { cast.addPct += 0.50; } },
    'Précision':  { onCast: (c, cast) => { cast.critChance += 0.20; } },
    'Multicoup':  { extraHits: () => 1 },
    // Fracture : ×3 coups (avant les coups bonus), chacun à 40 % des dégâts.
    'Fracture':   { onCast: (c, cast) => { cast.hitsMult *= 3; cast.mult *= 0.40; } },
    // Écho : 30 % de chance que le sort se relance (chaque relance peut
    // elle-même relancer : boucle plafonnée par MAX_RECASTS_PER_TURN).
    'Écho': {
      afterCast(c, cast, self) {
        if (c.rng.chance(0.30)) c.requestRecast(cast.spellIndex, cast, self.name);
      },
    },

    // ---------------------------------------------------------------- Survie
    'Vampirisme': {
      onHit: (c, cast, hit, self) => heal(c, self, hit.damage * 0.10),
    },

    // ---------------------------------------------------------------- Risque
    // Sacrifice : ×2, coûte 5 % des PV actuels à chaque lancer (ne peut pas tuer).
    'Sacrifice': {
      onCast(c, cast, self) {
        cast.mult *= 2;
        const cost = Math.floor(c.player.hp * 0.05);
        c.player.hp -= cost;
        c.detail(self.name, 'cost', { amount: cost, hp: c.player.hp, maxHp: c.player.maxHp });
      },
    },

    // ----------------------------------------------------------- Entre sorts
    // Préparation : le prochain lancer (quel qu'il soit, même au tour
    // suivant) fait +50 %. Plusieurs Préparations se multiplient.
    'Préparation': {
      afterCast(c, cast, self) {
        c.nextCastMult *= 1.5;
        c.detail(self.name, 'prep', { mult: c.nextCastMult });
      },
    },
  };

  function data(name) { return G.DATA.modificateurs.find(m => m.name === name) || null; }
  function get(name) { return H[name] || null; }
  function isImplemented(name) { return !!H[name]; }

  return { HANDLERS: H, data, get, isImplemented, applyStatus, heal };
})();
