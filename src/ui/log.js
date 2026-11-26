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
    return '×' + (Math.round(x * 100) / 100).toString().replace('.', ',');
  }
  function formatPct(x) { return Math.round(x * 100) + NBSP + '%'; }

  function roman(n) {
    const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
    return s;
  }

  const pad = (s, n) => s.length >= n ? s : s + ' '.repeat(n - s.length);
  const INDENT = '     ';
  const BIG_HIT_RATIO = 0.30;

  // --- Couleurs des statuts dans les textes (fiches, infobulles, cartes) -------
  // Chaque mot-clé est entouré d'un <span class="st-xxx">. Le texte passé doit
  // déjà être échappé (HTML).
  const L = '\\p{L}';
  const KEYWORDS = [
    ['burn',    `brûl${L}*|brasier`],
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
    if (ev.recast) name += ev.depth > 1 ? ' (relance ' + ev.depth + ')' : ' (relance)';
    return pad('[' + roman(ev.spell + 1) + ']', 5) + pad(name, 22);
  }

  function detailText(ev) {
    switch (ev.kind) {
      case 'status':
        if (ev.status === 'freeze') return { t: 'gelé (' + ev.total + ' tour' + (ev.total > 1 ? 's' : '') + ')', cls: 'st-freeze' };
        if (ev.status === 'shock') return { t: 'choqué (+' + formatPct(G.BALANCE.STATUS.SHOCK_BONUS) + ' au prochain coup)', cls: 'st-shock' };
        return {
          t: '+' + ev.added + ' ' + statusName(ev.status, ev.added) + ' (total ' + ev.total + ')',
          cls: 'st-' + ev.status,
        };
      case 'mult':       return { t: formatMult(ev.mult), cls: 'mult' };
      case 'heal':       return { t: '+' + formatNumber(ev.amount) + ' PV (' + formatNumber(ev.hp) + '/' + formatNumber(ev.maxHp) + ')', cls: 'heal' };
      case 'cost':       return { t: '×2, −' + formatNumber(ev.amount) + ' PV (' + formatNumber(ev.hp) + '/' + formatNumber(ev.maxHp) + ')', cls: 'cost' };
      case 'prep':       return { t: 'prochain lancer ' + formatMult(ev.mult), cls: 'mult' };
      case 'next_used':  return { t: formatMult(ev.mult) + ' (préparé)', cls: 'mult' };
      case 'shock_used': return { t: 'choc consommé, +' + formatPct(ev.bonus), cls: 'st-shock' };
      case 'recast':     return { t: 'relance', cls: 'recast' };
      case 'unimpl':     return { t: 'non implémenté', cls: 'unimpl' };
      default:           return { t: ev.kind, cls: '' };
    }
  }

  function eventLine(ev, playerName) {
    switch (ev.type) {
      case 'combat_start': return [
        { text: ev.enemy.symbol + ' ' + ev.enemy.name + ' — ' + formatNumber(ev.enemy.maxHp) + ' PV, ' + formatNumber(ev.enemy.atk) + ' ATK', cls: 'enemy' },
        { text: '@ Toi — ' + formatNumber(ev.player.hp) + '/' + formatNumber(ev.player.maxHp) + ' PV', cls: 'player' },
      ];
      case 'turn':
        return [{ text: '── TOUR ' + ev.turn + ' ' + '─'.repeat(Math.max(3, 36 - String(ev.turn).length)), cls: 'turn' }];
      case 'hit': {
        if (ev.miss) return [{ text: spellLabel(ev) + '→ RATÉ', cls: 'miss' }];
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
      case 'status_trigger':
        return [{ text: INDENT + pad('Malédiction !', 22) + '→ −25 % PV max : ' + formatNumber(ev.damage) + ' dégâts', cls: 'st-curse' }];
      case 'enemy_frozen':
        return [{ text: INDENT + pad(ev.enemy.split(' ')[0], 22) + '→ gelé, passe son tour', cls: 'st-freeze' }];
      case 'enemy_attack': {
        const who = INDENT + pad(ev.enemy.split(' ')[0] + ' attaque', 22) + '→ ';
        if (ev.missed) return [{ text: who + 'rate son attaque', cls: 'enemy-miss' }];
        const abs = ev.absorbed ? ' [bouclier −' + formatNumber(ev.absorbed) + ']' : '';
        return [{ text: who + 'tu perds ' + formatNumber(ev.damage) + ' PV (' + formatNumber(ev.playerHp) + '/' + formatNumber(ev.playerMaxHp) + ')' + abs, cls: 'enemy-hit' }];
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
        return [{ text: (ev.won ? 'Victoire' : 'Défaite') + ' en ' + ev.turns + ' tour' + (ev.turns > 1 ? 's' : '') +
          ' — ' + formatNumber(ev.stats.damageDealt) + ' dégâts, plus gros coup ' + formatNumber(ev.stats.biggestHit), cls: 'summary' }];
      default:
        return [];
    }
  }

  // Convertit toute une liste d'événements en lignes. Les détails (lignes
  // ├ / └) sont rattachés au coup qui les précède ; les détails émis au
  // début d'un lancer (coût, préparation…) sont affichés sous son 1er coup.
  function toLines(events) {
    const lines = [];
    let group = null;          // détails en cours de regroupement
    let pendingPre = [];       // détails émis avant le premier coup du lancer
    let inCastBeforeHit = false;

    const flushGroup = () => {
      if (!group) return;
      group.forEach((d, i) => {
        const branch = i === group.length - 1 ? '└ ' : '├ ';
        const { t, cls } = detailText(d);
        lines.push({ text: INDENT + branch + pad(d.mod, 20) + '→ ' + t, cls: 'detail ' + cls, ev: d });
      });
      group = null;
    };

    for (const ev of events) {
      if (ev.type === 'detail') {
        if (inCastBeforeHit) pendingPre.push(ev);
        else (group = group || []).push(ev);
        continue;
      }
      flushGroup();
      if (ev.type === 'cast') {
        if (pendingPre.length) { group = pendingPre; flushGroup(); }
        pendingPre = [];
        inCastBeforeHit = true;
        continue;
      }
      for (const l of eventLine(ev)) lines.push({ ...l, ev });
      if (ev.type === 'hit' && inCastBeforeHit) {
        inCastBeforeHit = false;
        group = pendingPre.length ? pendingPre : null;
        pendingPre = [];
      }
    }
    if (pendingPre.length) { group = pendingPre; }
    flushGroup();
    return lines;
  }

  return { formatNumber, formatMult, roman, toLines, colorize };
})();
