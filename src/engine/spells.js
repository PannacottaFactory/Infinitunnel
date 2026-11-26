// =============================================================================
//  SORTS (NOYAUX) — logique pure.
//
//  Chaque noyau décrit son effet de base. Il utilise les mêmes hooks que les
//  modificateurs (voir modifiers.js) et il est résolu en premier, avant les
//  slots de gauche à droite.
//    tier   : palier de dégâts (BALANCE.DAMAGE_TIERS), ou null = aucun dégât
//    hits   : nombre de coups de base (1 par défaut)
//    miss   : chance de rater de chaque coup
//    freeze : chance de geler à chaque coup
//    + hooks éventuels : onCast, multiplier, onHit, afterCast…
//
//  Un sort du grimoire est un objet { core: 'Trait', slots: [nom|null, ×3] }.
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Spells = (function () {
  const CORES = {
    'Trait': { tier: 'moyen' },
    'Éclair': { tier: 'eleve', miss: 0.25 },
    'Givre': { tier: 'faible', freeze: 0.20 },
    'Lame': { tier: 'faible', hits: 2 },
    'Flamme': {
      tier: 'faible',
      onHit(c, cast, hit, self) { G.Modifiers.applyStatus(c, cast, hit, self, 'burn', 2); },
    },
  };

  function data(name) { return G.DATA.sorts.find(s => s.name === name) || null; }
  function def(name) { return CORES[name] || null; }
  function isImplemented(name) { return !!CORES[name]; }
  function symbol(name) { const d = data(name); return d ? d.symbol : '?'; }

  function create(coreName) {
    return { core: coreName, slots: new Array(G.BALANCE.SLOTS_PER_SPELL).fill(null) };
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
