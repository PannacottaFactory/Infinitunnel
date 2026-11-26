// =============================================================================
//  BALANCE — toutes les constantes d'équilibrage du jeu.
//  Modifier ici, recharger la page. Aucune autre valeur numérique « magique »
//  ne devrait se trouver dans le moteur.
// =============================================================================
var G = globalThis.G = globalThis.G || {};

G.BALANCE = {
  // --- Grimoire ---------------------------------------------------------------
  MAX_SPELLS: 4,          // nombre max de sorts dans le grimoire
  SLOTS_PER_SPELL: 3,     // noyau + 3 slots
  STARTING_SPELL: 'Trait',

  // --- Récompenses ------------------------------------------------------------
  REWARD_CHOICES: 3,        // nombre de récompenses proposées après une victoire
  CORE_REWARD_CHANCE: 0.15, // chance qu'une carte soit un nouveau sort (sinon : modificateur)
  OFFER_UNIMPLEMENTED: false, // proposer aussi le contenu non encore codé (debug)

  // --- Joueur -----------------------------------------------------------------
  PLAYER_HP: 100,         // PV max au départ
  // PV max du joueur multipliés par ce facteur à chaque étage franchi.
  // Légèrement sous la croissance de l'ATK ennemie (1.12) : la pression monte
  // doucement, et les effets en « % des PV max » (Régénération, Ancre…) restent
  // pertinents aux étages élevés.
  PLAYER_HP_GROWTH: 1.10,
  // Part des PV max rendus entre deux combats (1 = soin complet).
  HEAL_BETWEEN_FIGHTS: 1.0,

  // --- Ennemis ----------------------------------------------------------------
  // PV  = ENEMY_HP_BASE  × ENEMY_HP_GROWTH  ^ étage
  // ATK = ENEMY_ATK_BASE × ENEMY_ATK_GROWTH ^ étage
  ENEMY_HP_BASE: 30,
  ENEMY_HP_GROWTH: 1.13,
  ENEMY_ATK_BASE: 5,
  ENEMY_ATK_GROWTH: 1.12,
  ENEMY_ATK_VARIANCE: 0.10, // l'attaque ennemie varie de ±10 %

  // --- Dégâts des sorts -------------------------------------------------------
  // Dégâts d'un coup = BASE_DAMAGE × palier du noyau × bonus × variance.
  BASE_DAMAGE: 10,
  // Paliers de dégâts des noyaux (vocabulaire du CSV → multiplicateur).
  DAMAGE_TIERS: {
    minuscule: 0.25,
    tresFaible: 0.4,
    faible: 0.6,
    moyen: 1.0,
    eleve: 1.6,
    enorme: 3.0,
  },
  DAMAGE_VARIANCE: 0.20,  // chaque coup varie de ±20 % autour de la moyenne
  BASE_CRIT_CHANCE: 0.05, // 5 % de critique de base
  CRIT_MULT: 2,           // un critique fait ×2

  // --- Statuts ----------------------------------------------------------------
  // Principe : la puissance d'un cumul est un % des dégâts du coup qui l'a
  // appliqué (« dégâts de référence »). Ainsi les statuts suivent la
  // croissance exponentielle des dégâts du joueur, au lieu de valeurs fixes
  // qui deviendraient inutiles à l'étage 50.
  // Les cumuls appliqués à des moments différents gardent chacun leur
  // puissance : le statut stocke la SOMME des puissances (« potency »).
  STATUS: {
    // Brûlure : en fin de tour, inflige 15 % des dégâts de référence par
    // cumul, puis perd 1 cumul.
    BURN_PER_STACK: 0.15,
    BURN_DECAY: 1,
    // Poison : 6 % par cumul en fin de tour, ne disparaît pas, et sa
    // puissance augmente de 20 % après chaque tick (croissance composée).
    POISON_PER_STACK: 0.06,
    POISON_GROWTH: 0.20,
    // Saignement : 30 % par cumul, infligés chaque fois que l'ennemi
    // attaque. Ne diminue pas.
    BLEED_PER_STACK: 0.30,
    // Gel : l'ennemi saute son prochain tour.
    FREEZE_CHANCE_PER_MOD: 0.15, // modificateur Gel : +15 % par coup
    FREEZE_DURATION: 1,
    // Choc : le prochain coup subi fait +50 %. Ne se cumule pas.
    SHOCK_BONUS: 0.50,
    // Fragilité : +10 % de dégâts subis par cumul (additif).
    FRAGILE_PER_STACK: 0.10,
    // Faiblesse : l'ennemi inflige ×0.9 par cumul (multiplicatif, pour ne
    // jamais tomber à 0 : 10 cumuls = 35 % des dégâts).
    WEAK_FACTOR: 0.90,
    // Engourdissement : +10 % de chance de rater par cumul, plafonné.
    NUMB_PER_STACK: 0.10,
    NUMB_MAX: 0.75,
    // Marque : chaque coup sur la cible inflige en plus 5 % des dégâts de
    // référence de chaque marque (le « +5 dégâts » du CSV, mis à l'échelle).
    MARK_PER_STACK: 0.05,
    // Malédiction : à 10 cumuls, l'ennemi perd 25 % de ses PV max et les
    // malédictions retombent à 0.
    CURSE_THRESHOLD: 10,
    CURSE_DAMAGE: 0.25,
  },

  // --- Relances et sécurité ---------------------------------------------------
  MAX_RECASTS_PER_TURN: 50, // au-delà : « SURCHARGE »
  SURCHARGE_MULT: 1.1,      // chaque relance en trop : ×1.1 aux coups suivants du tour
  MAX_TURNS_PER_COMBAT: 100, // au-delà, le joueur est épuisé et perd
  MAX_ACTIONS_PER_TURN: 5000, // garde-fou absolu (coups + lancers) par tour
};
