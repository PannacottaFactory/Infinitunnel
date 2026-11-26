// =============================================================================
//  LOG — transforme les événements du moteur en lignes de texte.
//  Chaque ligne : { text, cls, ev } (cls = classes CSS pour la couleur).
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.Log = (function () {
  const NBSP = ' ';

  // 1 234 · 12,3K · 123K · 4,5M · 7,8B · puis 4,2e15
  function formatNumber(n) {
    if (!Number.isFinite(n)) return String(n);
    const sign = n < 0 ? '−' : '';
    const a = Math.abs(n);
    if (a < 10000) {
      return sign + Math.round(a).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    }
    const units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    if (a < 1e12) {
      for (const [v, u] of units) {
        if (a >= v) {
          const x = a / v;
          const s = x < 100 ? (Math.floor(x * 10) / 10).toFixed(1) : Math.floor(x).toString();
          return sign + s.replace('.', ',').replace(/,0$/, '') + u;
        }
      }
    }
    const exp = Math.floor(Math.log10(a));
    const mant = Math.floor((a / Math.pow(10, exp)) * 10) / 10;
    return sign + mant.toFixed(1).replace('.', ',') + 'e' + exp;
  }

  // Multiplicateur : ×2 · ×1,5 · ×1,1
  function formatMult(x) {
    if (x >= 10000) return '×' + formatNumber(x);
    return '×' + (Math.round(x * 100) / 100).toString().replace('.', ',');
  }
  function formatPct(x) { return Math.round(x * 100) + NBSP + '%'; }

  function roman(n) {
    const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
    return s;
  }

  // Complète à n caractères ; un texte trop long garde au moins une espace.
  const pad = (s, n) => s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length);
  const INDENT = '     ';
  const BIG_HIT_RATIO = 0.30;

  // --- Couleurs des statuts dans les textes (fiches, infobulles, cartes) -------
  // Chaque mot-clé est entouré d'un <span class="st-xxx">. Le texte passé doit
  // déjà être échappé (HTML).
  const L = '\\p{L}';
  const KEYWORDS = [
    ['burn',    `brûl${L}*|brasier|combustibles?`],
    ['poison',  `poisons?|empoisonn${L}*|venin|toxi${L}*`],
    ['bleed',   `saign${L}*|hémorragie|hémophilie`],
    ['freeze',  `gel|gels|geler|gelé${L}*|gelures?|givre|glacia${L}*`],
    ['shock',   `chocs?|choqu${L}*`],
    ['fragile', `fragilités?`],
    ['weak',    `faiblesses?`],
    ['numb',    `engourdissements?`],
    ['mark',    `marques?|marqu${L}*`],
    ['curse',   `malédictions?`],
    ['ash',     `cendres?`],
    ['corrosion', `corrosions?`],
    ['crack',   `fêlures?`],
    ['omen',    `présages?`],
    ['fear',    `peurs?`],
    ['link',    `liens?`],
    ['exposure', `expositions?`],
  ];
  const KW_RE = new RegExp(`(?<!${L})(?:${KEYWORDS.map(([id, re]) => `(${re})`).join('|')})(?!${L})`, 'giu');
  function colorize(html) {
    return html.replace(KW_RE, (m, ...groups) => {
      const i = groups.findIndex((g, k) => k < KEYWORDS.length && g !== undefined);
      return `<span class="st-${KEYWORDS[i][0]}">${m}</span>`;
    });
  }

  function statusName(id, count) {
    const d = G.Statuses.DEFS[id];
    if (!d) return id;
    return count === 1 ? d.name.toLowerCase() : d.plural;
  }

  function spellLabel(ev) {
    let name = ev.symbol + ' ' + ev.core;
    if (ev.of > 1) name += ' ' + ev.no + '/' + ev.of;
    if (ev.bonus) name += ev.bonus === 'ricochet' ? ' ↯rebond' : ' ↯double';
    if (ev.recast) name += ev.depth > 1 ? ' (relance ' + ev.depth + ')' : ' (relance)';
    return pad('[' + roman(ev.spell + 1) + ']', 5) + pad(name, 22);
  }

  const hpText = ev => '(' + formatNumber(ev.hp) + '/' + formatNumber(ev.maxHp) + ')';

  const FLAGS = {
    brisure: 'le prochain coup fera ×5',
    evil_eye: 'mauvais œil : 50 % de rater pendant 2 tours',
    dissolved: 'dissolution : les poisons font ×3',
    exhausted: 'épuisement : prochaine attaque à 1 dégât',
  };
  const NEXT = {
    mult: ev => 'prochain lancer ' + formatMult(ev.mult),
    crit: () => 'prochain lancer : critique garanti',
    status: () => 'statuts du prochain lancer ×2',
    detonate: () => 'le prochain lancer fera exploser les brûlures',
    conduit: () => 'effets critiques transmis au prochain lancer',
    pct: ev => 'prochain lancer +' + formatPct(ev.pct),
  };

  function detailText(ev) {
    switch (ev.kind) {
      case 'status':
        if (ev.status === 'freeze') return { t: 'gelé (' + ev.total + ' tour' + (ev.total > 1 ? 's' : '') + ')', cls: 'st-freeze' };
        if (ev.status === 'shock' && ev.total <= 1) return { t: 'choqué (bonus au prochain coup)', cls: 'st-shock' };
        return {
          t: '+' + ev.added + ' ' + statusName(ev.status, ev.added) + ' (total ' + ev.total + ')',
          cls: 'st-' + ev.status,
        };
      case 'mult':       return { t: formatMult(ev.mult), cls: 'mult' };
      case 'pct':        return { t: (ev.pct >= 0 ? '+' : '') + formatPct(ev.pct), cls: 'mult' };
      case 'heal':       return { t: '+' + formatNumber(ev.amount) + ' PV ' + hpText(ev), cls: 'heal' };
      case 'cost':       return { t: '−' + formatNumber(ev.amount) + ' PV ' + hpText(ev), cls: 'cost' };
      case 'self_hit':   return { t: 'tu te frappes : −' + formatNumber(ev.amount) + ' PV ' + hpText(ev), cls: 'cost' };
      case 'shield':     return { t: '+' + formatNumber(ev.amount) + ' bouclier (total ' + formatNumber(ev.shield) + ')', cls: 'shield' };
      case 'maxhp':      return { t: '+' + formatNumber(ev.amount) + ' PV max ' + hpText(ev), cls: 'heal' };
      case 'ram':        return { t: 'bouclier consommé : +' + formatNumber(ev.amount) + ' dégâts', cls: 'mult' };
      case 'self_burn':  return { t: 'tu brûles (' + ev.stacks + ')', cls: 'st-burn' };
      case 'next':       return { t: (NEXT[ev.what] || (() => ev.what))(ev), cls: 'mult' };
      case 'next_used':  return { t: formatMult(ev.mult) + ' (sort précédent)', cls: 'mult' };
      case 'force_crit': return { t: 'critique garanti', cls: 'mult' };
      case 'shock_used': return { t: 'choc consommé, +' + formatPct(ev.bonus), cls: 'st-shock' };
      case 'recast':
        return { t: ev.self ? 'relance' : 'relance ' + ev.target + ' [' + roman(ev.spell + 1) + ']', cls: 'recast' };
      case 'consume': {
        const what = ev.status === 'all' ? ev.stacks + ' cumuls' : ev.stacks + ' ' + statusName(ev.status, ev.stacks);
        return {
          t: 'consomme ' + what + (ev.damage ? ' → ' + formatNumber(ev.damage) + ' dégâts' : ''),
          cls: ev.status === 'all' ? 'mult' : 'st-' + ev.status,
        };
      }
      case 'scale':
        return ev.status === 'all'
          ? { t: 'tous les statuts ×' + ev.factor, cls: 'mult' }
          : { t: statusName(ev.status, 2) + ' ×' + ev.factor + ' (total ' + ev.total + ')', cls: 'st-' + ev.status };
      case 'spread':     return { t: '+1 cumul à ' + ev.count + ' statut' + (ev.count > 1 ? 's' : ''), cls: 'mult' };
      case 'kill':       return { t: 'achève l\'ennemi (' + formatNumber(ev.amount) + ')', cls: 'crit' };
      case 'flag':       return { t: FLAGS[ev.key] || ev.key, cls: 'mult' };
      case 'nothing':    return { t: 'rien à refléter', cls: 'miss' };
      case 'disabled':   return { t: 'désactivé par Égoïsme', cls: 'unimpl' };
      case 'unimpl':     return { t: 'non implémenté', cls: 'unimpl' };
      default:           return { t: ev.kind, cls: '' };
    }
  }

  // Déclenchements de seuils propres aux statuts : [libellé, texte, classe].
  const TRIGGERS = {
    curse: ev => ['Malédiction !', '−25 % PV max : ' + formatNumber(ev.damage) + ' dégâts', 'st-curse'],
    glaciation: () => ['Glaciation !', '3e gel : gelé 2 tours', 'st-freeze'],
    frostbite: () => ['Gelures !', 'gel automatique', 'st-freeze'],
    omen: () => ['Présage !', 'le prochain coup fera ×5', 'st-omen'],
    ash: ev => ['Cendres', 'rallument ' + ev.value + ' brûlure' + (ev.value > 1 ? 's' : ''), 'st-ash'],
    proliferation: ev => ['Prolifération', '+1 ' + statusName(ev.status, 1), 'st-' + ev.status],
    detonate: ev => ['Détonation !', ev.value + ' brûlures → ' + formatNumber(ev.damage) + ' dégâts', 'st-burn'],
  };
  const MISS_REASONS = { evil_eye: 'mauvais œil', mirage: 'mirage', numb: 'engourdi', dodge: 'tu esquives' };

  function eventLine(ev) {
    switch (ev.type) {
      case 'combat_start': return [
        { text: ev.enemy.symbol + ' ' + ev.enemy.name + ' — ' + formatNumber(ev.enemy.maxHp) + ' PV, ' + formatNumber(ev.enemy.atk) + ' ATK', cls: 'enemy' },
        { text: '@ Toi — ' + formatNumber(ev.player.hp) + '/' + formatNumber(ev.player.maxHp) + ' PV', cls: 'player' },
      ];
      case 'turn':
        return [{ text: '── TOUR ' + ev.turn + ' ' + '─'.repeat(Math.max(3, 36 - String(ev.turn).length)), cls: 'turn' }];
      case 'cast': // en-tête d'un lancer sans coup (Égide, Reflet)
        return [{ text: spellLabel(ev), cls: 'hit' }];
      case 'hit': {
        if (ev.miss) return [{ text: spellLabel(ev) + '→ RATÉ', cls: 'miss' }];
        if (ev.noDamage) return [{ text: spellLabel(ev) + '→ (sans dégâts)', cls: 'hit' }];
        const crit = ev.crit ? '  CRITIQUE' : '';
        // « Gros chiffre » : critique, ou coup qui retire au moins 30 % des PV max.
        const big = ev.crit || ev.damage >= BIG_HIT_RATIO * ev.enemyMaxHp;
        return [{
          text: spellLabel(ev) + '→ ' + formatNumber(ev.damage) + ' dégâts' + crit,
          cls: 'hit' + (ev.crit ? ' crit' : '') + (big ? ' big' : ''), big,
        }];
      }
      case 'status_tick':
        return [{
          text: INDENT + pad(G.Statuses.DEFS[ev.status].name + ' ×' + ev.stacks, 22) + '→ ' + formatNumber(ev.damage) + ' dégâts',
          cls: 'tick st-' + ev.status,
        }];
      case 'trigger': {
        const [label, text, cls] = (TRIGGERS[ev.key] || (() => [ev.key, '', '']))(ev);
        return [{ text: INDENT + pad(label, 22) + '→ ' + text, cls }];
      }
      case 'passive': {
        let r;
        if (ev.kind === 'reflect') r = { t: 'renvoie ' + formatNumber(ev.amount) + ' dégâts', cls: 'mult' };
        else if (ev.kind === 'survive') r = { t: 'tu survis ! ' + hpText(ev), cls: 'heal' };
        else if (ev.kind === 'growth') r = { t: 'nouvelle cicatrice (' + ev.value + ')', cls: 'mult' };
        else r = detailText(ev);
        return [{ text: INDENT + pad('⟐ ' + ev.mod, 22) + '→ ' + r.t, cls: 'detail ' + r.cls }];
      }
      case 'self_burn':
        return [{
          text: INDENT + pad('Tu brûles ×' + ev.stacks, 22) + '→ −' + formatNumber(ev.damage) + ' PV (' +
            formatNumber(ev.playerHp) + '/' + formatNumber(ev.playerMaxHp) + ')',
          cls: 'st-burn',
        }];
      case 'enemy_frozen':
        return [{ text: INDENT + pad(ev.enemy.split(' ')[0], 22) + '→ gelé, passe son tour', cls: 'st-freeze' }];
      case 'enemy_skip':
        return [{ text: INDENT + pad(ev.enemy.split(' ')[0], 22) + '→ paralysé par la peur, passe son tour', cls: 'st-fear' }];
      case 'enemy_attack': {
        const who = INDENT + pad(ev.enemy.split(' ')[0] + ' attaque', 22) + '→ ';
        if (ev.missed) {
          const why = MISS_REASONS[ev.reason] ? ' (' + MISS_REASONS[ev.reason] + ')' : '';
          return [{ text: who + 'rate son attaque' + why, cls: 'enemy-miss' }];
        }
        const abs = ev.absorbed ? ' [bouclier −' + formatNumber(ev.absorbed) + ']' : '';
        return [{
          text: who + 'tu perds ' + formatNumber(ev.damage) + ' PV (' + formatNumber(ev.playerHp) + '/' +
            formatNumber(ev.playerMaxHp) + ')' + abs,
          cls: 'enemy-hit',
        }];
      }
      case 'surcharge':
        return [{ text: INDENT + 'SURCHARGE ' + formatMult(ev.mult) + ' (' + ev.by + ', relance n°' + (G.BALANCE.MAX_RECASTS_PER_TURN + ev.count) + ' ignorée)', cls: 'surcharge' }];
      case 'safety':
        return [{ text: INDENT + '!! garde-fou : ' + ev.limit + ' actions ce tour, lancers arrêtés', cls: 'surcharge' }];
      case 'enemy_dead':
        return [{ text: '☠ ' + ev.enemy + ' est vaincu.', cls: 'victory' }];
      case 'player_dead':
        return [{ text: '☠ Tu es mort.', cls: 'defeat' }];
      case 'exhausted':
        return [{ text: '☠ Épuisé après ' + ev.turns + ' tours : le combat est perdu.', cls: 'defeat' }];
      case 'combat_end':
        return [{
          text: (ev.won ? 'Victoire' : 'Défaite') + ' en ' + ev.turns + ' tour' + (ev.turns > 1 ? 's' : '') +
            ' — ' + formatNumber(ev.stats.damageDealt) + ' dégâts, plus gros coup ' + formatNumber(ev.stats.biggestHit),
          cls: 'summary',
        }];
      default:
        return [];
    }
  }

  // Convertit toute une liste d'événements en lignes. Les détails (lignes
  // ├ / └) sont rattachés au coup qui les précède ; les détails émis au
  // début d'un lancer (coût, préparation…) sont affichés sous son 1er coup.
  // Un lancer sans aucun coup (Égide, Reflet) affiche son propre en-tête.
  function toLines(events) {
    const lines = [];
    let group = null;     // détails en cours de regroupement
    let pendingPre = [];  // détails émis avant le premier coup du lancer
    let castEv = null;    // lancer en cours, tant qu'aucun coup n'est affiché

    const flushGroup = () => {
      if (!group) return;
      group.forEach((d, i) => {
        const branch = i === group.length - 1 ? '└ ' : '├ ';
        const { t, cls } = detailText(d);
        lines.push({ text: INDENT + branch + pad(d.mod, 20) + '→ ' + t, cls: 'detail ' + cls, ev: d });
      });
      group = null;
    };
    const flushCast = () => {
      for (const l of eventLine(castEv)) lines.push({ ...l, ev: castEv });
      group = pendingPre.length ? pendingPre : null;
      pendingPre = [];
      castEv = null;
    };

    for (const ev of events) {
      if (ev.type === 'detail') {
        if (castEv) pendingPre.push(ev);
        else (group = group || []).push(ev);
        continue;
      }
      if (ev.type === 'hit' && castEv) {
        castEv = null;
        flushGroup();
        for (const l of eventLine(ev)) lines.push({ ...l, ev });
        group = pendingPre.length ? pendingPre : null;
        pendingPre = [];
        continue;
      }
      if (castEv) flushCast();
      flushGroup();
      if (ev.type === 'cast') { castEv = ev; continue; }
      for (const l of eventLine(ev)) lines.push({ ...l, ev });
    }
    if (castEv) flushCast();
    flushGroup();
    return lines;
  }

  return { formatNumber, formatMult, roman, toLines, colorize };
})();
