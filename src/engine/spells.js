// =============================================================================
//  SORTS (NOYAUX) — logique pure.
//
//  Chaque noyau décrit son effet de base. Il utilise les mêmes hooks que les
//  modificateurs (voir modifiers.js) et il est résolu en premier, avant les
//  slots de gauche à droite.
//    tier       : palier de dégâts (BALANCE.DAMAGE_TIERS), absent = aucun dégât
//    refTier    : pour un noyau sans dégâts, palier servant de référence à la
//                 puissance de ses statuts
//    hits       : nombre de coups de base (1 par défaut)
//    miss       : chance de rater de chaque coup
//    freeze     : chance de geler à chaque coup
//    critChance / critMult : remplacent les valeurs de base
//    noMiss     : ne rate jamais
//    noHit      : aucun coup (le sort agit seulement par ses hooks)
//    + hooks éventuels : onCast, beforeHit, multiplier, onHit, afterCast…
//
//  Un sort du grimoire est un objet
//    { core: 'Trait', slots: [nom|null, ×3], growth: {} }
//  growth contient les croissances permanentes (Trophée, Expérience…).
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Spells = (function () {
  const B = () => G.BALANCE;
  const St = () => G.Statuses;
  const apply = (c, cast, hit, self, id, n) => G.Modifiers.applyStatus(c, cast, hit, self, id, n);

  const CORES = {
    'Trait': { tier: 'moyen' },
    'Éclair': { tier: 'eleve', miss: 0.25 },
    'Givre': { tier: 'faible', freeze: 0.20 },
    'Miasme': {
      refTier: 'faible', appliesStatus: true,
      onHit: (c, cast, hit, self) => apply(c, cast, hit, self, 'poison', 2),
    },
    'Lame': { tier: 'faible', hits: 2 },
    // Orbe : +10 % par lancer précédent de ce sort dans le combat.
    'Orbe': {
      tier: 'faible', noMiss: true,
      onCast: (c, cast) => { cast.addPct += 0.10 * (cast.castNo - 1); },
    },
    'Flamme': {
      tier: 'faible', appliesStatus: true,
      onHit: (c, cast, hit, self) => apply(c, cast, hit, self, 'burn', 2),
    },
    'Épine': {
      tier: 'faible', appliesStatus: true,
      onHit: (c, cast, hit, self) => apply(c, cast, hit, self, 'bleed', 1),
    },
    // Prisme : dégâts aléatoires entre ×0 et ×3 (moyenne ×1,5 sur des dégâts moyens).
    'Prisme': {
      tier: 'moyen',
      multiplier: (c, cast) => c.randMult(cast, 0, 3),
    },
    'Ombre': {
      tier: 'moyen',
      multiplier: (c) => St().distinctCount(c.enemy) > 0 ? 2 : 1,
    },
    'Sangsue': {
      tier: 'faible',
      onHit(c, cast, hit, self) {
        const h = G.Combat.healPlayer(c, hit.damage * 0.5);
        c.detail(self.name, 'heal', { amount: h, hp: c.player.hp, maxHp: c.player.maxHp });
      },
    },
    // Châtiment : 20 % des dégâts subis depuis le début du combat.
    'Châtiment': {
      tier: 'moyen',
      onCast: (c, cast) => { cast.baseDamage = c.stats.damageTaken * 0.20; },
    },
    // Spirale : dégâts minuscules, autant de coups que le numéro du tour.
    'Spirale': {
      tier: 'minuscule',
      onCast: (c, cast) => { cast.hitsBase = c.turn; },
    },
    'Comète': {
      tier: 'enorme',
      onCast(c, cast, self) {
        const r = G.Combat.hurtPlayer(c, c.player.hp * 0.10, { cost: true });
        c.detail(self.name, 'cost', { amount: r.lost, hp: c.player.hp, maxHp: c.player.maxHp });
      },
    },
    // Égide : bouclier de 20 % des PV max, multiplié par les bonus du sort.
    'Égide': {
      refTier: 'moyen', noHit: true,
      afterCast(c, cast, self) {
        const amount = Math.round(c.player.maxHp * B().SHIELD_AEGIS * (1 + cast.addPct) * cast.mult);
        c.player.shield += amount;
        c.detail(self.name, 'shield', { amount, shield: c.player.shield });
      },
    },
    'Étincelle': { tier: 'tresFaible', hits: 3 },
    // Vide : pas d'effet propre (dégâts faibles, pour que les modificateurs
    // aient une base). Ses modificateurs comptent ×1,5 : +X % ×1,5,
    // multiplicateurs conditionnels (×N → ×(1 + (N−1)×1,5)), statuts ×1,5.
    'Vide': {
      tier: 'faible',
      onCast: (c, cast) => { cast.modPower = 1.5; },
    },
    // Rayon : +20 % par tour consécutif où il a touché.
    'Rayon': {
      tier: 'moyen',
      onCast(c, cast) {
        const st = c.spellState[cast.spellIndex];
        const streak = st.lastHitTurn === c.turn - 1 ? st.streak + 1 : (st.lastHitTurn === c.turn ? st.streak : 0);
        cast.addPct += 0.20 * streak;
      },
    },
    'Tempête': { tier: 'tresFaible', hits: 5, miss: 0.30 },
    'Brume': {
      tier: 'faible', appliesStatus: true,
      onHit: (c, cast, hit, self) => apply(c, cast, hit, self, 'numb', 2),
    },
    'Croix': {
      tier: 'moyen', appliesStatus: true,
      onHit: (c, cast, hit, self) => apply(c, cast, hit, self, 'mark', 1),
    },
    'Sceau': {
      refTier: 'faible', appliesStatus: true,
      onHit: (c, cast, hit, self) => apply(c, cast, hit, self, 'curse', 2),
    },
    // Balance : 10 % de l'écart de PV entre toi et l'ennemi.
    'Balance': {
      tier: 'moyen',
      onCast: (c, cast) => { cast.baseDamage = Math.abs(c.player.hp - c.enemy.hp) * 0.10; },
    },
    'Pique': { tier: 'eleve', critMult: 4 },
    // Trèfle : dégâts aléatoires (×0,25 à ×1,75 de « moyen »), 25 % de critique.
    'Trèfle': {
      tier: 'moyen', critChance: 0.25,
      multiplier: (c, cast) => c.randMult(cast, 0.25, 1.75),
    },
    // Sablier : doublé à chaque tour (1, 2, 4, 8…).
    'Sablier': {
      tier: 'minuscule',
      onCast: (c, cast) => { cast.mult *= Math.pow(2, c.turn - 1); },
    },
    'Ancre': {
      tier: 'moyen',
      onCast: (c, cast) => { cast.baseDamage = c.player.maxHp * 0.05; },
    },
    // Reflet : relance le dernier sort lancé (autre lancer que celui-ci) à 60 %.
    'Reflet': {
      refTier: 'moyen', noHit: true,
      afterCast(c, cast, self) {
        const last = cast.prev;
        if (!last) { c.detail(self.name, 'nothing', {}); return; }
        c.requestRecast(last.spellIndex, cast, self.name, 0.6);
      },
    },
    // Saignée : 30 % des PV perdus depuis le début du tour précédent (au moment
    // où le sort est lancé, l'ennemi n'a pas encore attaqué ce tour-ci).
    'Saignée': {
      tier: 'moyen',
      onCast(c, cast) {
        cast.baseDamage = 0.30 * ((c.prevTurn ? c.prevTurn.hpLost : 0) + c.turnState.hpLost);
      },
    },
    'Lune': {
      tier: 'moyen',
      multiplier: (c) => St().has(c.enemy, 'freeze') ? 3 : 1,
    },
    'Spore': {
      refTier: 'faible', appliesStatus: true,
      onHit(c, cast, hit, self) {
        apply(c, cast, hit, self, 'poison', 1);
        apply(c, cast, hit, self, 'weak', 1);
      },
    },
    // Propagation : +1 cumul à chaque statut déjà présent (même valeur moyenne).
    'Propagation': {
      tier: 'faible', appliesStatus: true,
      onHit(c, cast, hit, self) {
        const ids = Object.keys(c.enemy.statuses).filter(id => St().has(c.enemy, id));
        for (const id of ids) St().addSame(c, id, 1);
        if (ids.length) c.detail(self.name, 'spread', { count: ids.length });
      },
    },
  };

  function data(name) { return G.DATA.sorts.find(s => s.name === name) || null; }
  function def(name) { return CORES[name] || null; }
  function isImplemented(name) { return !!CORES[name]; }
  function symbol(name) { const d = data(name); return d ? d.symbol : '?'; }

  function create(coreName) {
    return { core: coreName, slots: new Array(G.BALANCE.SLOTS_PER_SPELL).fill(null), growth: {} };
  }

  // Liste des modificateurs posés (en ignorant les slots vides), avec leur slot.
  function mods(spell) {
    return spell.slots
      .map((name, slot) => name ? { name, slot } : null)
      .filter(Boolean);
  }

  // Peut-on poser `modName` dans `slotIdx` ? Respecte la « Limite par sort ».
  function canPlace(spell, modName, slotIdx) {
    const m = G.Modifiers.data(modName);
    if (!m) return false;
    if (m.limit == null) return true;
    const count = spell.slots.filter((n, i) => n === modName && i !== slotIdx).length;
    return count < m.limit;
  }

  return { CORES, data, def, isImplemented, symbol, create, mods, canPlace };
})();
