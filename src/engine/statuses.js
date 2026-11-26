// =============================================================================
//  STATUTS — logique pure (aucun accès au DOM).
//
//  Un statut posé sur l'ennemi est stocké ainsi :
//    enemy.statuses[id] = { stacks, potency, ticks, locked }
//      stacks  : nombre de cumuls
//      potency : SOMME des puissances des cumuls (en dégâts). Chaque cumul
//                vaut « % des dégâts du coup qui l'a appliqué » (voir
//                BALANCE.STATUS), donc les statuts suivent la croissance.
//                Pour le choc : somme des bonus (+0,5 = +50 %).
//      ticks   : nombre de fois que le statut a agi
//      locked  : cumuls « persistants » (modificateur Persistance), qui ne
//                peuvent pas être consommés
//
//  Les effets passifs du grimoire (Feu éternel, Surtension…) sont lus via
//  c.passive(nom) = nombre d'exemplaires du modificateur dans le grimoire.
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Statuses = (function () {
  const S = () => G.BALANCE.STATUS;

  // name/plural : affichage. perStack : part des dégâts de référence stockée
  // par cumul (statuts à dégâts). mode 'max' : ne se cumule pas.
  const DEFS = {
    burn:       { name: 'Brûlure',         plural: 'brûlures',         perStack: () => S().BURN_PER_STACK },
    poison:     { name: 'Poison',          plural: 'poisons',          perStack: () => S().POISON_PER_STACK },
    bleed:      { name: 'Saignement',      plural: 'saignements',      perStack: () => S().BLEED_PER_STACK },
    freeze:     { name: 'Gel',             plural: 'gel',              mode: 'max' },
    shock:      { name: 'Choc',            plural: 'chocs' },
    fragile:    { name: 'Fragilité',       plural: 'fragilités' },
    weak:       { name: 'Faiblesse',       plural: 'faiblesses' },
    numb:       { name: 'Engourdissement', plural: 'engourdissements' },
    mark:       { name: 'Marque',          plural: 'marques',          perStack: () => S().MARK_PER_STACK },
    curse:      { name: 'Malédiction',     plural: 'malédictions' },
    ash:        { name: 'Cendre',          plural: 'cendres',          perStack: () => S().BURN_PER_STACK },
    corrosion:  { name: 'Corrosion',       plural: 'corrosions' },
    crack:      { name: 'Fêlure',          plural: 'fêlures' },
    combustible:{ name: 'Combustible',     plural: 'combustibles' },
    fear:       { name: 'Peur',            plural: 'peurs' },
    frostbite:  { name: 'Gelure',          plural: 'gelures' },
    omen:       { name: 'Présage',         plural: 'présages' },
    link:       { name: 'Lien',            plural: 'liens' },
    exposure:   { name: 'Exposition',      plural: 'expositions' },
  };

  // Statuts tirés par « Statut aléatoire », « infection », « Alchimie »…
  const RANDOM_POOL = ['burn', 'poison', 'bleed', 'shock', 'fragile', 'weak', 'numb', 'mark', 'curse', 'corrosion', 'crack', 'fear'];

  function get(enemy, id) { return enemy.statuses[id]; }
  function stacks(enemy, id) { const st = enemy.statuses[id]; return st ? st.stacks : 0; }
  function has(enemy, id) { return stacks(enemy, id) > 0; }
  function distinctCount(enemy) {
    return Object.keys(enemy.statuses).filter(id => enemy.statuses[id].stacks > 0).length;
  }
  function totalStacks(enemy) {
    return Object.values(enemy.statuses).reduce((n, st) => n + st.stacks, 0);
  }
  function remove(enemy, id) { delete enemy.statuses[id]; }

  function ensure(enemy, id) {
    return enemy.statuses[id] || (enemy.statuses[id] = { stacks: 0, potency: 0, ticks: 0, locked: 0 });
  }

  // Applique `amount` cumuls du statut `id`. ref = dégâts de référence.
  // opts : { shockBonus, freezeDuration, locked } . Renvoie { added, total }.
  function apply(c, id, amount, ref, opts = {}) {
    const def = DEFS[id];
    const enemy = c.enemy;
    if (!def || !(amount > 0)) return { added: 0, total: stacks(enemy, id) };
    const st = ensure(enemy, id);

    if (id === 'freeze') {
      st.stacks = Math.max(st.stacks, opts.freezeDuration || amount);
      enemy.freezesTaken = (enemy.freezesTaken || 0) + 1;
      // Seuil « 3 gels → glaciation » : au 3e gel du combat, gelé 2 tours.
      if (c.passive('3 gels → glaciation') && enemy.freezesTaken === 3) {
        st.stacks = Math.max(st.stacks, 2);
        trigger(c, 'glaciation', {});
      }
      return { added: amount, total: st.stacks };
    }

    if (id === 'shock') {
      const bonus = opts.shockBonus != null ? opts.shockBonus : S().SHOCK_BONUS;
      if (c.passive('Surtension')) {      // les chocs se cumulent
        st.stacks += amount;
        st.potency += bonus * amount;
      } else {                            // un seul choc : on garde le plus fort
        st.stacks = 1;
        st.potency = Math.max(st.potency, bonus);
      }
      if (opts.locked) st.locked = Math.min(st.stacks, st.locked + amount);
      return { added: amount, total: st.stacks };
    }

    st.stacks += amount;
    if (def.perStack) st.potency += amount * def.perStack() * Math.max(0, ref || 0);
    if (opts.locked) st.locked = Math.min(st.stacks, st.locked + amount);
    const res = { added: amount, total: st.stacks };

    // --- Seuils propres aux statuts ---
    if (id === 'curse') {
      // À 10 malédictions (7 avec Malédiction rapide) : −25 % des PV max.
      const threshold = c.passive('Malédiction rapide') ? 7 : S().CURSE_THRESHOLD;
      if (st.stacks >= threshold) {
        consume(enemy, 'curse');
        const dmg = G.Combat.damageEnemy(c, enemy.maxHp * S().CURSE_DAMAGE);
        trigger(c, 'curse', { damage: dmg });
        res.total = stacks(enemy, 'curse');
      }
    } else if (id === 'frostbite' && st.stacks >= S().FROSTBITE_THRESHOLD) {
      // 5 gelures : gel automatique.
      st.stacks -= S().FROSTBITE_THRESHOLD;
      if (st.stacks <= 0) remove(enemy, 'frostbite');
      apply(c, 'freeze', 1, 0, { freezeDuration: 1 });
      trigger(c, 'frostbite', {});
      res.total = stacks(enemy, 'frostbite');
    } else if (id === 'omen' && st.stacks >= S().OMEN_THRESHOLD) {
      // 3 présages : le prochain coup reçu fait ×5.
      st.stacks -= S().OMEN_THRESHOLD;
      if (st.stacks <= 0) remove(enemy, 'omen');
      enemy.omenReady = true;
      trigger(c, 'omen', {});
      res.total = stacks(enemy, 'omen');
    }
    return res;
  }

  // Ajoute n cumuls « de même valeur » que les cumuls existants (Propagation,
  // Copie, Prolifération…). Si le statut est absent, n'ajoute rien.
  function addSame(c, id, n) {
    const st = c.enemy.statuses[id];
    if (!st || st.stacks <= 0 || n <= 0) return null;
    const def = DEFS[id];
    if (id === 'freeze') return apply(c, 'freeze', 1, 0, { freezeDuration: st.stacks + n });
    if (id === 'shock') return apply(c, 'shock', n, 0, { shockBonus: st.potency / st.stacks });
    const ref = def && def.perStack ? (st.potency / st.stacks) / def.perStack() : 0;
    return apply(c, id, n, ref);
  }

  // Multiplie cumuls et puissance (Arc-en-ciel, contagion, « brûlures ×2 »).
  function scale(c, id, factor) {
    const st = c.enemy.statuses[id];
    if (!st || st.stacks <= 0) return;
    st.stacks = Math.round(st.stacks * factor);
    st.potency *= factor;
  }

  // Consomme les cumuls non persistants. Renvoie { stacks, potency } consommés.
  function consume(enemy, id) {
    const st = enemy.statuses[id];
    if (!st || st.stacks <= 0) return { stacks: 0, potency: 0 };
    const free = st.stacks - (st.locked || 0);
    if (free <= 0) return { stacks: 0, potency: 0 };
    const potency = st.potency * free / st.stacks;
    st.stacks -= free;
    st.potency -= potency;
    if (st.stacks <= 0) remove(enemy, id);
    return { stacks: free, potency };
  }

  function consumeAll(enemy) {
    let total = 0;
    for (const id of Object.keys(enemy.statuses)) total += consume(enemy, id).stacks;
    return total;
  }

  function trigger(c, key, data) {
    c.emit({ type: 'trigger', key, ...data, enemyHp: c.enemy.hp });
  }

  // --- Modificateurs de calcul liés aux statuts ------------------------------

  // Multiplicateur de dégâts subis par l'ennemi (fragilité).
  function takenMult(enemy) {
    return 1 + stacks(enemy, 'fragile') * S().FRAGILE_PER_STACK;
  }
  // Multiplicateur des dégâts infligés par l'ennemi (faiblesse, neurotoxine).
  function enemyDamageMult(c) {
    let m = Math.pow(S().WEAK_FACTOR, stacks(c.enemy, 'weak'));
    if (c.passive('Neurotoxine')) m *= Math.max(0.1, 1 - 0.01 * stacks(c.enemy, 'poison'));
    return m;
  }
  // Chance que l'ennemi rate son attaque (engourdissement).
  function enemyMissChance(enemy) {
    return Math.min(S().NUMB_MAX, stacks(enemy, 'numb') * S().NUMB_PER_STACK);
  }
  // Chance que l'ennemi saute son tour par peur.
  function fearChance(enemy) {
    return Math.min(S().FEAR_MAX, stacks(enemy, 'fear') * S().FEAR_PER_STACK);
  }
  // Dégâts ajoutés à chaque coup (marques ; ×2 avec Marque profonde).
  function markBonus(c) {
    const st = c.enemy.statuses.mark;
    if (!st) return 0;
    return st.potency * (c.passive('Marque profonde') ? 2 : 1);
  }
  // Consomme le choc : renvoie le multiplicateur du coup (1 si aucun choc).
  function consumeShock(enemy) {
    const st = enemy.statuses.shock;
    if (!st || st.stacks <= 0) return 1;
    const bonus = st.potency;
    consume(enemy, 'shock');
    return 1 + bonus;
  }

  // --- Fin de tour ------------------------------------------------------------

  function tickEndOfTurn(c) {
    const enemy = c.enemy;
    const dead = () => G.Combat.checkEnemyDeath(c);

    // Brûlure : +20 % par Combustible. Perd 1 cumul (sauf Feu éternel).
    const burn = enemy.statuses.burn;
    if (burn && burn.stacks > 0) {
      const mult = 1 + S().COMBUSTIBLE_PER_STACK * stacks(enemy, 'combustible');
      const dmg = G.Combat.damageEnemy(c, burn.potency * mult);
      c.emit({ type: 'status_tick', status: 'burn', stacks: burn.stacks, damage: dmg, enemyHp: enemy.hp });
      burn.ticks++;
      if (!c.passive('Feu éternel')) {
        const lost = Math.min(burn.stacks, S().BURN_DECAY);
        burn.potency *= (burn.stacks - lost) / burn.stacks;
        burn.stacks -= lost;
        burn.locked = Math.min(burn.locked || 0, burn.stacks);
        if (burn.stacks <= 0) remove(enemy, 'burn');
      }
      if (dead()) return;
    }

    // Cendres : si l'ennemi ne brûle plus, chaque cendre rallume 1 brûlure.
    const ash = enemy.statuses.ash;
    if (ash && ash.stacks > 0 && !has(enemy, 'burn')) {
      const n = ash.stacks;
      const b = ensure(enemy, 'burn');
      b.stacks += n;
      b.potency += ash.potency;
      remove(enemy, 'ash');
      trigger(c, 'ash', { value: n });
    }

    // Poison : +5 % par corrosion, ×3 après dissolution. S'aggrave de 20 %.
    const poison = enemy.statuses.poison;
    if (poison && poison.stacks > 0) {
      let mult = 1 + S().CORROSION_PER_STACK * stacks(enemy, 'corrosion');
      if (enemy.dissolved) mult *= 3;
      const dmg = G.Combat.damageEnemy(c, poison.potency * mult);
      c.emit({ type: 'status_tick', status: 'poison', stacks: poison.stacks, damage: dmg, enemyHp: enemy.hp });
      poison.potency *= 1 + S().POISON_GROWTH;
      poison.ticks++;
      const nourish = c.passive('Poison nourricier');
      if (nourish) G.Combat.healPlayer(c, dmg * 0.10 * nourish, 'Poison nourricier');
      if (dead()) return;
    }

    // Hémophilie : les saignements infligent aussi leurs dégâts en fin de tour.
    if (c.passive('Hémophilie') && has(enemy, 'bleed')) {
      bleedTick(c);
      if (dead()) return;
    }

    // Prolifération : chaque statut a 10 % de chance de gagner 1 cumul.
    const prolif = c.passive('Prolifération');
    if (prolif) {
      for (const id of Object.keys(enemy.statuses)) {
        for (let k = 0; k < prolif; k++) {
          if (c.rng.chance(0.10)) {
            addSame(c, id, 1);
            trigger(c, 'proliferation', { status: id });
          }
        }
      }
    }
  }

  // Le saignement inflige ses dégâts (×2 avec Sang épais).
  function bleedTick(c) {
    const bleed = c.enemy.statuses.bleed;
    if (!bleed || bleed.stacks <= 0) return 0;
    const mult = c.passive('Sang épais') ? 2 : 1;
    const dmg = G.Combat.damageEnemy(c, bleed.potency * mult);
    c.emit({ type: 'status_tick', status: 'bleed', stacks: bleed.stacks, damage: dmg, enemyHp: c.enemy.hp });
    bleed.ticks++;
    return dmg;
  }

  return {
    DEFS, RANDOM_POOL, get, stacks, has, distinctCount, totalStacks, remove, apply, addSame, scale,
    consume, consumeAll, trigger, takenMult, enemyDamageMult, enemyMissChance, fearChance, markBonus,
    consumeShock, tickEndOfTurn, bleedTick,
  };
})();
