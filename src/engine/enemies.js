// =============================================================================
//  ENNEMIS — pas de capacités pour ce prototype : PV et ATK seulement.
//  Le nom et le symbole sont purement décoratifs.
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Enemies = (function () {
  // Noms et épithètes choisis pour s'accorder sans gestion du genre.
  const KINDS = [
    { name: 'Golem', symbol: 'Ω' }, { name: 'Spectre', symbol: '§' },
    { name: 'Rôdeur', symbol: 'ʀ' }, { name: 'Liche', symbol: 'Ψ' },
    { name: 'Goule', symbol: 'ǥ' }, { name: 'Wyrm', symbol: '∫' },
    { name: 'Sentinelle', symbol: '¥' }, { name: 'Horreur', symbol: '&' },
    { name: 'Chimère', symbol: 'ж' }, { name: 'Gardien', symbol: 'Ħ' },
    { name: 'Larve', symbol: '~' }, { name: 'Colosse', symbol: 'Ж' },
  ];
  const EPITHETS = [
    'des cendres', 'pâle', 'du gouffre', 'écarlate', 'sans nom', 'des abysses',
    'de rouille', 'fébrile', 'des marais', 'd\'os', 'du néant', 'aux mille yeux',
  ];

  // PV  = PV_BASE  × CROISSANCE_PV  ^ étage
  // ATK = ATK_BASE × CROISSANCE_ATK ^ étage
  function stats(floor) {
    const B = G.BALANCE;
    return {
      maxHp: Math.round(B.ENEMY_HP_BASE * Math.pow(B.ENEMY_HP_GROWTH, floor)),
      atk: B.ENEMY_ATK_BASE * Math.pow(B.ENEMY_ATK_GROWTH, floor),
    };
  }

  function create(floor, rng) {
    const kind = rng.pick(KINDS);
    const { maxHp, atk } = stats(floor);
    return {
      name: kind.name + ' ' + rng.pick(EPITHETS),
      symbol: kind.symbol,
      floor,
      maxHp,
      hp: maxHp,
      atk,
      statuses: {},
      freezesTaken: 0,
    };
  }

  return { create, stats };
})();
