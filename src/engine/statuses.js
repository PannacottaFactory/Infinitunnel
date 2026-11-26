// =============================================================================
//  STATUTS — logique pure (aucun accès au DOM).
//
//  Un statut posé sur l'ennemi est stocké ainsi :
//    enemy.statuses[id] = { stacks, potency, ticks }
//      stacks  : nombre de cumuls
//      potency : SOMME des puissances des cumuls (en dégâts). Chaque cumul
//                vaut « % des dégâts du coup qui l'a appliqué » (voir
//                BALANCE.STATUS). Les cumuls anciens et récents gardent ainsi
//                chacun leur valeur.
//      ticks   : nombre de fois que le statut a agi (utile au poison)
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Statuses = (function () {
  const S = () => G.BALANCE.STATUS;

  // name/plural : affichage. perStack : part des dégâts de référence stockée
  // par cumul (0 = statut sans dégâts). mode 'max' : le statut ne se cumule
  // pas, on garde la plus grande valeur (gel = tours restants, choc = 1).
  const DEFS = {
    burn:   { name: 'Brûlure',         plural: 'brûlures',         perStack: () => S().BURN_PER_STACK },
    poison: { name: 'Poison',          plural: 'poisons',          perStack: () => S().POISON_PER_STACK },
    bleed:  { name: 'Saignement',      plural: 'saignements',      perStack: () => S().BLEED_PER_STACK },
    freeze: { name: 'Gel',             plural: 'gel',              mode: 'max' },
    shock:  { name: 'Choc',            plural: 'choc',             mode: 'max' },
    fragile:{ name: 'Fragilité',       plural: 'fragilités' },
    weak:   { name: 'Faiblesse',       plural: 'faiblesses' },
    numb:   { name: 'Engourdissement', plural: 'engourdissements' },
    mark:   { name: 'Marque',          plural: 'marques',          perStack: () => S().MARK_PER_STACK },
    curse:  { name: 'Malédiction',     plural: 'malédictions' },
  };

  function stacks(enemy, id) {
    const st = enemy.statuses[id];
    return st ? st.stacks : 0;
  }
  function has(enemy, id) { return stacks(enemy, id) > 0; }

  function distinctCount(enemy) {
    return Object.keys(enemy.statuses).filter(id => enemy.statuses[id].stacks > 0).length;
  }
  function totalStacks(enemy) {
    return Object.values(enemy.statuses).reduce((n, st) => n + st.stacks, 0);
  }

  function remove(enemy, id) { delete enemy.statuses[id]; }

  // Applique `amount` cumuls du statut `id`. refDamage = dégâts du coup qui
  // l'applique (base de la puissance). Renvoie { added, total, triggered }.
  function apply(c, id, amount, refDamage) {
    const def = DEFS[id];
    const enemy = c.enemy;
    if (!def || amount <= 0) return { added: 0, total: stacks(enemy, id) };
    const st = enemy.statuses[id] || (enemy.statuses[id] = { stacks: 0, potency: 0, ticks: 0 });

    if (def.mode === 'max') {
      st.stacks = Math.max(st.stacks, amount);
    } else {
      st.stacks += amount;
      if (def.perStack) st.potency += amount * def.perStack() * Math.max(0, refDamage || 0);
    }
    if (id === 'freeze') enemy.freezesTaken = (enemy.freezesTaken || 0) + 1;

    const res = { added: amount, total: st.stacks };

    // Malédiction : seuil atteint → l'ennemi perd 25 % de ses PV max.
    if (id === 'curse' && st.stacks >= S().CURSE_THRESHOLD) {
      remove(enemy, 'curse');
      const dmg = G.Combat.damageEnemy(c, enemy.maxHp * S().CURSE_DAMAGE);
      c.emit({ type: 'status_trigger', status: 'curse', damage: dmg, enemyHp: enemy.hp });
      res.total = 0;
    }
    return res;
  }

  // --- Modificateurs de calcul liés aux statuts ------------------------------

  // Multiplicateur de dégâts subis par l'ennemi (fragilité).
  function takenMult(enemy) {
    return 1 + stacks(enemy, 'fragile') * S().FRAGILE_PER_STACK;
  }
  // Multiplicateur des dégâts infligés par l'ennemi (faiblesse).
  function enemyDamageMult(enemy) {
    return Math.pow(S().WEAK_FACTOR, stacks(enemy, 'weak'));
  }
  // Chance que l'ennemi rate son attaque (engourdissement).
  function enemyMissChance(enemy) {
    return Math.min(S().NUMB_MAX, stacks(enemy, 'numb') * S().NUMB_PER_STACK);
  }
  // Dégâts fixes ajoutés à chaque coup (marques).
  function markBonus(enemy) {
    const st = enemy.statuses.mark;
    return st ? st.potency : 0;
  }
  // Consomme le choc s'il y en a un : renvoie le multiplicateur du coup.
  function consumeShock(enemy) {
    if (!has(enemy, 'shock')) return 1;
    remove(enemy, 'shock');
    return 1 + S().SHOCK_BONUS;
  }

  // --- Phases du tour ---------------------------------------------------------

  // Fin de tour : brûlure puis poison infligent leurs dégâts.
  function tickEndOfTurn(c) {
    const enemy = c.enemy;

    const burn = enemy.statuses.burn;
    if (burn && burn.stacks > 0) {
      const dmg = G.Combat.damageEnemy(c, burn.potency);
      c.emit({ type: 'status_tick', status: 'burn', stacks: burn.stacks, damage: dmg, enemyHp: enemy.hp });
      // Perd 1 cumul ; la puissance baisse en proportion (valeur moyenne d'un cumul).
      const lost = Math.min(burn.stacks, S().BURN_DECAY);
      burn.potency *= (burn.stacks - lost) / burn.stacks;
      burn.stacks -= lost;
      burn.ticks++;
      if (burn.stacks <= 0) remove(enemy, 'burn');
      if (G.Combat.checkEnemyDeath(c)) return;
    }

    const poison = enemy.statuses.poison;
    if (poison && poison.stacks > 0) {
      const dmg = G.Combat.damageEnemy(c, poison.potency);
      c.emit({ type: 'status_tick', status: 'poison', stacks: poison.stacks, damage: dmg, enemyHp: enemy.hp });
      // Le poison s'aggrave : +20 % de puissance après chaque tick.
      poison.potency *= 1 + S().POISON_GROWTH;
      poison.ticks++;
      if (G.Combat.checkEnemyDeath(c)) return;
    }
  }

  // Au moment où l'ennemi attaque : le saignement inflige ses dégâts.
  function onEnemyAttack(c) {
    const bleed = c.enemy.statuses.bleed;
    if (bleed && bleed.stacks > 0) {
      const dmg = G.Combat.damageEnemy(c, bleed.potency);
      c.emit({ type: 'status_tick', status: 'bleed', stacks: bleed.stacks, damage: dmg, enemyHp: c.enemy.hp });
      bleed.ticks++;
    }
  }

  return {
    DEFS, stacks, has, distinctCount, totalStacks, remove, apply,
    takenMult, enemyDamageMult, enemyMissChance, markBonus, consumeShock,
    tickEndOfTurn, onEnemyAttack,
  };
})();
