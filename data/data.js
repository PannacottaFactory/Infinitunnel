// FICHIER GÉNÉRÉ par tools/csv-to-js.js — ne pas modifier à la main.
// Relancer « node tools/csv-to-js.js » après avoir modifié les CSV.
var G = globalThis.G = globalThis.G || {};
G.DATA = {
 "sorts": [
  {
   "id": "trait",
   "name": "Trait",
   "symbol": "✦",
   "effect": "Dégâts moyens sur 1 cible",
   "notes": "Le sort le plus neutre"
  },
  {
   "id": "eclair",
   "name": "Éclair",
   "symbol": "ϟ",
   "effect": "Dégâts élevés, 25 % de chance de rater",
   "notes": ""
  },
  {
   "id": "givre",
   "name": "Givre",
   "symbol": "❄",
   "effect": "Dégâts faibles, 20 % de chance de geler",
   "notes": ""
  },
  {
   "id": "miasme",
   "name": "Miasme",
   "symbol": "☁",
   "effect": "Aucun dégât direct, applique 2 poisons",
   "notes": ""
  },
  {
   "id": "lame",
   "name": "Lame",
   "symbol": "⚔",
   "effect": "Dégâts faibles, frappe 2 fois",
   "notes": ""
  },
  {
   "id": "orbe",
   "name": "Orbe",
   "symbol": "◉",
   "effect": "Dégâts faibles, ne rate jamais, +10 % par lancer dans le combat",
   "notes": ""
  },
  {
   "id": "flamme",
   "name": "Flamme",
   "symbol": "♨",
   "effect": "Dégâts faibles, applique 2 brûlures",
   "notes": ""
  },
  {
   "id": "epine",
   "name": "Épine",
   "symbol": "†",
   "effect": "Dégâts faibles, applique 1 saignement",
   "notes": ""
  },
  {
   "id": "prisme",
   "name": "Prisme",
   "symbol": "◈",
   "effect": "Dégâts aléatoires entre ×0 et ×3",
   "notes": ""
  },
  {
   "id": "ombre",
   "name": "Ombre",
   "symbol": "☾",
   "effect": "Dégâts moyens, ×2 si l'ennemi a au moins un statut",
   "notes": ""
  },
  {
   "id": "sangsue",
   "name": "Sangsue",
   "symbol": "∿",
   "effect": "Dégâts faibles, te soigne de 50 % des dégâts infligés",
   "notes": ""
  },
  {
   "id": "chatiment",
   "name": "Châtiment",
   "symbol": "⚖",
   "effect": "Inflige 20 % des dégâts que tu as subis depuis le début du combat",
   "notes": ""
  },
  {
   "id": "spirale",
   "name": "Spirale",
   "symbol": "@",
   "effect": "Dégâts minuscules, frappe autant de fois que le numéro du tour",
   "notes": "Devient énorme dans les longs combats"
  },
  {
   "id": "comete",
   "name": "Comète",
   "symbol": "☄",
   "effect": "Dégâts énormes, te coûte 10 % de tes PV actuels",
   "notes": ""
  },
  {
   "id": "egide",
   "name": "Égide",
   "symbol": "⛨",
   "effect": "Aucun dégât, te donne un bouclier",
   "notes": ""
  },
  {
   "id": "etincelle",
   "name": "Étincelle",
   "symbol": "⁂",
   "effect": "Dégâts très faibles, frappe 3 fois",
   "notes": "Idéal pour les effets appliqués à chaque coup"
  },
  {
   "id": "vide",
   "name": "Vide",
   "symbol": "○",
   "effect": "Aucun effet propre, ses modificateurs comptent ×1,5",
   "notes": ""
  },
  {
   "id": "rayon",
   "name": "Rayon",
   "symbol": "☼",
   "effect": "Dégâts moyens, +20 % à chaque tour consécutif où il touche",
   "notes": ""
  },
  {
   "id": "tempete",
   "name": "Tempête",
   "symbol": "≋",
   "effect": "Frappe 5 fois, chaque coup a 30 % de chance de rater",
   "notes": ""
  },
  {
   "id": "brume",
   "name": "Brume",
   "symbol": "░",
   "effect": "Dégâts faibles, applique 2 engourdissements",
   "notes": ""
  },
  {
   "id": "croix",
   "name": "Croix",
   "symbol": "✚",
   "effect": "Dégâts moyens, applique 1 marque",
   "notes": ""
  },
  {
   "id": "sceau",
   "name": "Sceau",
   "symbol": "⌘",
   "effect": "Aucun dégât direct, applique 2 malédictions",
   "notes": ""
  },
  {
   "id": "balance",
   "name": "Balance",
   "symbol": "♎",
   "effect": "Dégâts égaux à 10 % de l'écart de PV entre toi et l'ennemi",
   "notes": ""
  },
  {
   "id": "pique",
   "name": "Pique",
   "symbol": "♠",
   "effect": "Dégâts élevés, ses critiques font ×4",
   "notes": ""
  },
  {
   "id": "trefle",
   "name": "Trèfle",
   "symbol": "♣",
   "effect": "Dégâts aléatoires, 25 % de chance de critique",
   "notes": ""
  },
  {
   "id": "sablier",
   "name": "Sablier",
   "symbol": "⧗",
   "effect": "Dégâts minuscules, doublés à chaque tour (1, 2, 4, 8…)",
   "notes": "Croissance exponentielle dans un même combat"
  },
  {
   "id": "ancre",
   "name": "Ancre",
   "symbol": "⚓",
   "effect": "Dégâts égaux à 5 % de tes PV max",
   "notes": ""
  },
  {
   "id": "reflet",
   "name": "Reflet",
   "symbol": "◐",
   "effect": "Relance le dernier sort lancé à 60 % de sa puissance",
   "notes": "Peut boucler avec un autre Reflet"
  },
  {
   "id": "saignee",
   "name": "Saignée",
   "symbol": "♥",
   "effect": "Dégâts égaux à 30 % des PV que tu as perdus ce tour",
   "notes": ""
  },
  {
   "id": "lune",
   "name": "Lune",
   "symbol": "☽",
   "effect": "Dégâts moyens, ×3 si l'ennemi est gelé",
   "notes": ""
  },
  {
   "id": "spore",
   "name": "Spore",
   "symbol": "⁕",
   "effect": "Aucun dégât direct, applique 1 poison et 1 faiblesse",
   "notes": ""
  },
  {
   "id": "propagation",
   "name": "Propagation",
   "symbol": "⁜",
   "effect": "Dégâts faibles, ajoute 1 cumul à chaque statut déjà présent sur l'ennemi",
   "notes": ""
  }
 ],
 "modificateurs": [
  {
   "id": "brulure",
   "name": "Brûlure",
   "category": "Statut",
   "effect": "Applique 1 brûlure : dégâts à chaque tour, cumulable",
   "limit": null,
   "notes": ""
  },
  {
   "id": "saignement",
   "name": "Saignement",
   "category": "Statut",
   "effect": "Applique 1 saignement : l'ennemi perd des PV à chaque attaque qu'il porte",
   "limit": null,
   "notes": ""
  },
  {
   "id": "poison",
   "name": "Poison",
   "category": "Statut",
   "effect": "Applique 1 poison : dégâts qui augmentent de tour en tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "gel",
   "name": "Gel",
   "category": "Statut",
   "effect": "+15 % de chance de geler : l'ennemi saute son prochain tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "choc",
   "name": "Choc",
   "category": "Statut",
   "effect": "Le prochain coup subi par l'ennemi fait +50 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "fragilite",
   "name": "Fragilité",
   "category": "Statut",
   "effect": "L'ennemi subit +10 % de dégâts, cumulable",
   "limit": null,
   "notes": ""
  },
  {
   "id": "faiblesse",
   "name": "Faiblesse",
   "category": "Statut",
   "effect": "L'ennemi inflige −10 % de dégâts, cumulable",
   "limit": null,
   "notes": ""
  },
  {
   "id": "engourdissement",
   "name": "Engourdissement",
   "category": "Statut",
   "effect": "L'ennemi a +10 % de chance de rater, cumulable",
   "limit": null,
   "notes": ""
  },
  {
   "id": "marque",
   "name": "Marque",
   "category": "Statut",
   "effect": "Applique 1 marque : chaque coup sur la cible inflige +5 dégâts fixes par marque",
   "limit": null,
   "notes": ""
  },
  {
   "id": "malediction",
   "name": "Malédiction",
   "category": "Statut",
   "effect": "Applique 1 malédiction : à 10 malédictions, l'ennemi perd 25 % de ses PV max",
   "limit": null,
   "notes": ""
  },
  {
   "id": "statut-aleatoire",
   "name": "Statut aléatoire",
   "category": "Statut",
   "effect": "Applique 2 cumuls d'un statut au hasard",
   "limit": null,
   "notes": ""
  },
  {
   "id": "brasier",
   "name": "Brasier",
   "category": "Amplification de statut",
   "effect": "Les brûlures appliquées par ce sort comptent double",
   "limit": null,
   "notes": ""
  },
  {
   "id": "hemorragie",
   "name": "Hémorragie",
   "category": "Amplification de statut",
   "effect": "Les saignements appliqués par ce sort comptent double",
   "limit": null,
   "notes": ""
  },
  {
   "id": "venin-concentre",
   "name": "Venin concentré",
   "category": "Amplification de statut",
   "effect": "Les poisons appliqués par ce sort comptent double",
   "limit": null,
   "notes": ""
  },
  {
   "id": "givre-profond",
   "name": "Givre profond",
   "category": "Amplification de statut",
   "effect": "Le gel de ce sort dure 2 tours",
   "limit": null,
   "notes": ""
  },
  {
   "id": "haute-tension",
   "name": "Haute tension",
   "category": "Amplification de statut",
   "effect": "Le choc de ce sort donne +150 % au lieu de +50 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "virulence",
   "name": "Virulence",
   "category": "Amplification de statut",
   "effect": "Chaque statut appliqué par ce sort reçoit +1 cumul",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-brule-2",
   "name": "Si brûle → ×2",
   "category": "Condition",
   "effect": "Dégâts doublés si l'ennemi brûle",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-saigne-vampirisme",
   "name": "Si saigne → vampirisme",
   "category": "Condition",
   "effect": "Te soigne de 30 % des dégâts infligés si l'ennemi saigne",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-empoisonne-2-poisons",
   "name": "Si empoisonné → +2 poisons",
   "category": "Condition",
   "effect": "Ajoute 2 poisons si l'ennemi est déjà empoisonné",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-gele-eclat",
   "name": "Si gelé → éclat",
   "category": "Condition",
   "effect": "Consomme le gel, dégâts ×4",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-gele-choc-thermique",
   "name": "Si gelé → choc thermique",
   "category": "Condition",
   "effect": "Applique 3 brûlures si l'ennemi est gelé",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-choque-1-coup",
   "name": "Si choqué → +1 coup",
   "category": "Condition",
   "effect": "Frappe une fois de plus si l'ennemi est choqué",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-marque-critique",
   "name": "Si marqué → critique",
   "category": "Condition",
   "effect": "Critique garanti si l'ennemi a au moins 3 marques",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-saigne-brulures-2",
   "name": "Si saigne → brûlures ×2",
   "category": "Condition",
   "effect": "Double les brûlures de l'ennemi s'il saigne",
   "limit": null,
   "notes": ""
  },
  {
   "id": "execution",
   "name": "Exécution",
   "category": "Condition",
   "effect": "Dégâts ×3 si l'ennemi est sous 30 % de ses PV",
   "limit": null,
   "notes": ""
  },
  {
   "id": "ouverture",
   "name": "Ouverture",
   "category": "Condition",
   "effect": "Dégâts ×2 si l'ennemi est au-dessus de 90 % de ses PV",
   "limit": null,
   "notes": ""
  },
  {
   "id": "rage",
   "name": "Rage",
   "category": "Condition",
   "effect": "Dégâts ×2 si tes PV sont sous 50 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "serenite",
   "name": "Sérénité",
   "category": "Condition",
   "effect": "Dégâts ×1,5 si tes PV sont pleins",
   "limit": null,
   "notes": ""
  },
  {
   "id": "riposte",
   "name": "Riposte",
   "category": "Condition",
   "effect": "Dégâts ×2 si l'ennemi t'a touché au tour précédent",
   "limit": null,
   "notes": ""
  },
  {
   "id": "premier-tour",
   "name": "Premier tour",
   "category": "Condition",
   "effect": "Dégâts ×3 au premier tour du combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-critique-3-saignements",
   "name": "Si critique → 3 saignements",
   "category": "Condition",
   "effect": "Un coup critique applique 3 saignements",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-critique-2-brulures",
   "name": "Si critique → 2 brûlures",
   "category": "Condition",
   "effect": "Un coup critique applique 2 brûlures",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-rate-relance",
   "name": "Si rate → relance",
   "category": "Condition",
   "effect": "Si le sort rate, il se relance immédiatement",
   "limit": null,
   "notes": "Pensé pour Éclair"
  },
  {
   "id": "si-aucun-statut-infection",
   "name": "Si aucun statut → infection",
   "category": "Condition",
   "effect": "Si l'ennemi n'a aucun statut, applique 2 statuts au hasard",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-statut-different-50",
   "name": "Par statut différent → +50 %",
   "category": "Condition",
   "effect": "+50 % de dégâts par type de statut présent sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-brulure-5",
   "name": "Par brûlure → +5 %",
   "category": "Condition",
   "effect": "+5 % de dégâts par cumul de brûlure sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-poison-3-crit",
   "name": "Par poison → +3 % crit",
   "category": "Condition",
   "effect": "+3 % de chance de critique par poison sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-saignement-4-degats",
   "name": "Par saignement → +4 dégâts",
   "category": "Condition",
   "effect": "+4 dégâts fixes par saignement sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "brulure-10-explosion",
   "name": "Brûlure ≥ 10 → explosion",
   "category": "Seuil",
   "effect": "Consomme toutes les brûlures et inflige leurs dégâts d'un coup ×3",
   "limit": null,
   "notes": ""
  },
  {
   "id": "poison-5-contagion",
   "name": "Poison ≥ 5 → contagion",
   "category": "Seuil",
   "effect": "Double le nombre de poisons",
   "limit": null,
   "notes": "Croissance exponentielle"
  },
  {
   "id": "saignement-8-hemorragie",
   "name": "Saignement ≥ 8 → hémorragie",
   "category": "Seuil",
   "effect": "L'ennemi perd 10 % de ses PV max, ses saignements retombent à 0",
   "limit": null,
   "notes": ""
  },
  {
   "id": "fragilite-5-brisure",
   "name": "Fragilité ≥ 5 → brisure",
   "category": "Seuil",
   "effect": "Le prochain coup fait ×5",
   "limit": null,
   "notes": ""
  },
  {
   "id": "marques-5-condamnation",
   "name": "Marques ≥ 5 → condamnation",
   "category": "Seuil",
   "effect": "Consomme les marques, dégâts × nombre de marques consommées",
   "limit": null,
   "notes": ""
  },
  {
   "id": "statuts-20-cataclysme",
   "name": "Statuts ≥ 20 → cataclysme",
   "category": "Seuil",
   "effect": "Si l'ennemi a 20 cumuls de statuts au total, dégâts ×10",
   "limit": null,
   "notes": ""
  },
  {
   "id": "combustion-toxique",
   "name": "Combustion toxique",
   "category": "Conversion",
   "effect": "Chaque brûlure appliquée devient 2 poisons",
   "limit": null,
   "notes": ""
  },
  {
   "id": "sang-bouillant",
   "name": "Sang bouillant",
   "category": "Conversion",
   "effect": "Chaque saignement appliqué donne aussi 1 brûlure",
   "limit": null,
   "notes": ""
  },
  {
   "id": "givre-conducteur",
   "name": "Givre conducteur",
   "category": "Conversion",
   "effect": "Quand le gel échoue, applique un choc",
   "limit": null,
   "notes": ""
  },
  {
   "id": "poison-nourricier",
   "name": "Poison nourricier",
   "category": "Conversion",
   "effect": "Les dégâts du poison te soignent de 10 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "moisson",
   "name": "Moisson",
   "category": "Conversion",
   "effect": "Consomme tous les statuts de l'ennemi : +20 % de dégâts par cumul consommé",
   "limit": null,
   "notes": ""
  },
  {
   "id": "copie",
   "name": "Copie",
   "category": "Conversion",
   "effect": "Ajoute 1 cumul du statut le plus présent sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "transfusion",
   "name": "Transfusion",
   "category": "Conversion",
   "effect": "Les saignements de l'ennemi te soignent quand il attaque",
   "limit": null,
   "notes": ""
  },
  {
   "id": "puissance",
   "name": "Puissance",
   "category": "Amplificateur",
   "effect": "+50 % de dégâts",
   "limit": null,
   "notes": ""
  },
  {
   "id": "precision",
   "name": "Précision",
   "category": "Amplificateur",
   "effect": "+20 % de chance de critique",
   "limit": null,
   "notes": ""
  },
  {
   "id": "brutalite",
   "name": "Brutalité",
   "category": "Amplificateur",
   "effect": "Les critiques font ×3 au lieu de ×2",
   "limit": null,
   "notes": ""
  },
  {
   "id": "multicoup",
   "name": "Multicoup",
   "category": "Amplificateur",
   "effect": "Le sort frappe une fois de plus",
   "limit": null,
   "notes": ""
  },
  {
   "id": "fracture",
   "name": "Fracture",
   "category": "Amplificateur",
   "effect": "Le sort se divise en 3 coups à 40 % des dégâts",
   "limit": null,
   "notes": "Idéal avec les statuts appliqués à chaque coup"
  },
  {
   "id": "echo",
   "name": "Écho",
   "category": "Amplificateur",
   "effect": "30 % de chance que le sort se relance",
   "limit": null,
   "notes": "Peut boucler : prévoir un plafond de relances par tour"
  },
  {
   "id": "resonance",
   "name": "Résonance",
   "category": "Amplificateur",
   "effect": "Chaque relance de ce sort a +10 % de chance de se relancer à nouveau",
   "limit": null,
   "notes": "Peut boucler"
  },
  {
   "id": "infaillible",
   "name": "Infaillible",
   "category": "Amplificateur",
   "effect": "Le sort ne rate jamais",
   "limit": null,
   "notes": ""
  },
  {
   "id": "constance",
   "name": "Constance",
   "category": "Amplificateur",
   "effect": "Les dégâts ne descendent jamais sous la moyenne",
   "limit": null,
   "notes": ""
  },
  {
   "id": "chaos",
   "name": "Chaos",
   "category": "Amplificateur",
   "effect": "Dégâts multipliés au hasard entre ×0 et ×4",
   "limit": null,
   "notes": ""
  },
  {
   "id": "concentration",
   "name": "Concentration",
   "category": "Amplificateur",
   "effect": "Dégâts ×3 si les autres slots de ce sort sont vides",
   "limit": null,
   "notes": ""
  },
  {
   "id": "unite",
   "name": "Unité",
   "category": "Amplificateur",
   "effect": "+30 % de dégâts par modificateur identique sur ce sort",
   "limit": null,
   "notes": "Récompense l'empilement d'un même modificateur"
  },
  {
   "id": "diversite",
   "name": "Diversité",
   "category": "Amplificateur",
   "effect": "+30 % de dégâts par sort différent dans le grimoire",
   "limit": null,
   "notes": ""
  },
  {
   "id": "vampirisme",
   "name": "Vampirisme",
   "category": "Survie",
   "effect": "Te soigne de 10 % des dégâts infligés",
   "limit": null,
   "notes": ""
  },
  {
   "id": "bouclier",
   "name": "Bouclier",
   "category": "Survie",
   "effect": "Te donne un bouclier égal à 20 % des dégâts infligés",
   "limit": null,
   "notes": ""
  },
  {
   "id": "epines",
   "name": "Épines",
   "category": "Survie",
   "effect": "Renvoie 30 % des dégâts que tu subis ce tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "regeneration",
   "name": "Régénération",
   "category": "Survie",
   "effect": "Te soigne de 2 % de tes PV max à chaque lancer",
   "limit": null,
   "notes": ""
  },
  {
   "id": "garde-glaciale",
   "name": "Garde glaciale",
   "category": "Survie",
   "effect": "Si l'ennemi est gelé, te donne un bouclier égal à 10 % de tes PV max",
   "limit": null,
   "notes": ""
  },
  {
   "id": "esquive",
   "name": "Esquive",
   "category": "Survie",
   "effect": "10 % de chance d'éviter la prochaine attaque ennemie",
   "limit": null,
   "notes": ""
  },
  {
   "id": "seconde-chance",
   "name": "Seconde chance",
   "category": "Survie",
   "effect": "Si tu meurs, tu reviens à 20 % de tes PV (une fois par combat)",
   "limit": null,
   "notes": "Très fort : à limiter"
  },
  {
   "id": "sacrifice",
   "name": "Sacrifice",
   "category": "Risque",
   "effect": "Dégâts ×2, te coûte 5 % de tes PV actuels",
   "limit": null,
   "notes": ""
  },
  {
   "id": "pacte-de-sang",
   "name": "Pacte de sang",
   "category": "Risque",
   "effect": "Dégâts ×3, te coûte 3 % de tes PV max à chaque lancer",
   "limit": null,
   "notes": ""
  },
  {
   "id": "instable",
   "name": "Instable",
   "category": "Risque",
   "effect": "50 % de chance de ×3, 50 % de chance de ×0",
   "limit": null,
   "notes": ""
  },
  {
   "id": "fragile",
   "name": "Fragile",
   "category": "Risque",
   "effect": "Dégâts ×2, mais tu subis +15 % de dégâts",
   "limit": null,
   "notes": ""
  },
  {
   "id": "lourd",
   "name": "Lourd",
   "category": "Risque",
   "effect": "Dégâts ×2, mais le sort frappe une fois de moins (minimum 1)",
   "limit": null,
   "notes": "Mauvais seul, bon avec Multicoup ou Fracture"
  },
  {
   "id": "ascese",
   "name": "Ascèse",
   "category": "Risque",
   "effect": "Dégâts ×4 si tu n'as aucun bouclier",
   "limit": null,
   "notes": ""
  },
  {
   "id": "desespoir",
   "name": "Désespoir",
   "category": "Risque",
   "effect": "+1 % de dégâts par % de PV manquant",
   "limit": null,
   "notes": ""
  },
  {
   "id": "gourmand",
   "name": "Gourmand",
   "category": "Risque",
   "effect": "Dégâts ×2,5, mais retire tous les statuts de l'ennemi sans effet",
   "limit": null,
   "notes": ""
  },
  {
   "id": "preparation",
   "name": "Préparation",
   "category": "Entre sorts",
   "effect": "Le sort suivant fait +50 % de dégâts",
   "limit": null,
   "notes": ""
  },
  {
   "id": "relais",
   "name": "Relais",
   "category": "Entre sorts",
   "effect": "Si ce sort fait un critique, le sort suivant fait aussi un critique",
   "limit": null,
   "notes": ""
  },
  {
   "id": "catalyseur",
   "name": "Catalyseur",
   "category": "Entre sorts",
   "effect": "Les statuts appliqués par le sort suivant comptent double",
   "limit": null,
   "notes": ""
  },
  {
   "id": "fusion",
   "name": "Fusion",
   "category": "Entre sorts",
   "effect": "Si le sort précédent a appliqué un statut, ce sort l'applique aussi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "miroir",
   "name": "Miroir",
   "category": "Entre sorts",
   "effect": "Copie l'effet du modificateur placé au même slot sur le sort précédent",
   "limit": null,
   "notes": ""
  },
  {
   "id": "prelude",
   "name": "Prélude",
   "category": "Entre sorts",
   "effect": "Dégâts ×2 si c'est le premier sort du tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "finale",
   "name": "Finale",
   "category": "Entre sorts",
   "effect": "Dégâts ×2 si c'est le dernier sort du tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "chaine",
   "name": "Chaîne",
   "category": "Entre sorts",
   "effect": "20 % de chance de relancer le sort suivant",
   "limit": null,
   "notes": "Peut boucler"
  },
  {
   "id": "harmonie",
   "name": "Harmonie",
   "category": "Entre sorts",
   "effect": "+25 % de dégâts par autre sort du grimoire qui partage un modificateur avec celui-ci",
   "limit": null,
   "notes": ""
  },
  {
   "id": "elan",
   "name": "Élan",
   "category": "Croissance",
   "effect": "+10 % de dégâts par lancer de ce sort dans le combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "fureur",
   "name": "Fureur",
   "category": "Croissance",
   "effect": "+5 % de dégâts par tour écoulé dans le combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "accumulation",
   "name": "Accumulation",
   "category": "Croissance",
   "effect": "Applique 1 cumul de statut de plus à chaque lancer (1, 2, 3…)",
   "limit": null,
   "notes": ""
  },
  {
   "id": "crescendo",
   "name": "Crescendo",
   "category": "Croissance",
   "effect": "+1 coup tous les 3 tours écoulés",
   "limit": null,
   "notes": ""
  },
  {
   "id": "patience",
   "name": "Patience",
   "category": "Croissance",
   "effect": "+25 % de dégâts par tour passé sans être touché",
   "limit": null,
   "notes": ""
  },
  {
   "id": "trophee",
   "name": "Trophée",
   "category": "Croissance",
   "effect": "+1 % de dégâts permanent pour la partie à chaque ennemi vaincu",
   "limit": null,
   "notes": "Croissance sur toute la partie"
  },
  {
   "id": "exposition",
   "name": "Exposition",
   "category": "Statut",
   "effect": "L'ennemi subit +25 % de dégâts critiques, cumulable",
   "limit": null,
   "notes": ""
  },
  {
   "id": "lien-de-douleur",
   "name": "Lien de douleur",
   "category": "Statut",
   "effect": "Applique 1 lien : l'ennemi subit 10 % des dégâts que tu subis, par lien",
   "limit": null,
   "notes": ""
  },
  {
   "id": "cendres",
   "name": "Cendres",
   "category": "Statut",
   "effect": "Applique 1 cendre : quand l'ennemi n'a plus de brûlure, chaque cendre rallume 1 brûlure",
   "limit": null,
   "notes": ""
  },
  {
   "id": "corrosion",
   "name": "Corrosion",
   "category": "Statut",
   "effect": "Applique 1 corrosion : chaque poison inflige +5 % par corrosion",
   "limit": null,
   "notes": ""
  },
  {
   "id": "felure",
   "name": "Fêlure",
   "category": "Statut",
   "effect": "Applique 1 fêlure : à chaque coup subi, l'ennemi perd 1 % de ses PV actuels par fêlure",
   "limit": null,
   "notes": ""
  },
  {
   "id": "combustible",
   "name": "Combustible",
   "category": "Statut",
   "effect": "L'ennemi subit +20 % de dégâts de brûlure, cumulable",
   "limit": null,
   "notes": ""
  },
  {
   "id": "peur",
   "name": "Peur",
   "category": "Statut",
   "effect": "Applique 1 peur : 5 % de chance par cumul que l'ennemi saute son tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "gelure",
   "name": "Gelure",
   "category": "Statut",
   "effect": "Applique 1 gelure : à 5 gelures, l'ennemi est gelé automatiquement",
   "limit": null,
   "notes": ""
  },
  {
   "id": "hemophilie",
   "name": "Hémophilie",
   "category": "Statut",
   "effect": "Les saignements de l'ennemi infligent aussi des dégâts à chaque tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "statut-double",
   "name": "Statut double",
   "category": "Statut",
   "effect": "Applique 1 cumul de deux statuts au hasard",
   "limit": null,
   "notes": ""
  },
  {
   "id": "presage",
   "name": "Présage",
   "category": "Statut",
   "effect": "Applique 1 présage : à 3 présages, le prochain coup reçu par l'ennemi fait ×5",
   "limit": null,
   "notes": ""
  },
  {
   "id": "feu-eternel",
   "name": "Feu éternel",
   "category": "Amplification de statut",
   "effect": "Les brûlures de l'ennemi ne baissent plus avec le temps",
   "limit": null,
   "notes": "Seulement si les brûlures diminuent par défaut"
  },
  {
   "id": "sang-epais",
   "name": "Sang épais",
   "category": "Amplification de statut",
   "effect": "Les saignements infligent ×2 dégâts",
   "limit": null,
   "notes": ""
  },
  {
   "id": "neurotoxine",
   "name": "Neurotoxine",
   "category": "Amplification de statut",
   "effect": "Chaque poison réduit les dégâts de l'ennemi de 1 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "glaciation",
   "name": "Glaciation",
   "category": "Amplification de statut",
   "effect": "+5 % de chance de gel par gel déjà subi par l'ennemi dans le combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "surtension",
   "name": "Surtension",
   "category": "Amplification de statut",
   "effect": "Les chocs se cumulent au lieu de se remplacer",
   "limit": null,
   "notes": ""
  },
  {
   "id": "marque-profonde",
   "name": "Marque profonde",
   "category": "Amplification de statut",
   "effect": "Les marques infligent +10 dégâts fixes au lieu de +5",
   "limit": null,
   "notes": ""
  },
  {
   "id": "malediction-rapide",
   "name": "Malédiction rapide",
   "category": "Amplification de statut",
   "effect": "Le seuil des malédictions passe de 10 à 7",
   "limit": null,
   "notes": ""
  },
  {
   "id": "proliferation",
   "name": "Prolifération",
   "category": "Amplification de statut",
   "effect": "À chaque tour, chaque statut de l'ennemi a 10 % de chance de gagner 1 cumul",
   "limit": null,
   "notes": ""
  },
  {
   "id": "persistance",
   "name": "Persistance",
   "category": "Amplification de statut",
   "effect": "Les statuts appliqués par ce sort ne peuvent pas être consommés",
   "limit": null,
   "notes": "Contre-synergie volontaire avec les seuils"
  },
  {
   "id": "tour-pair-2",
   "name": "Tour pair → ×2",
   "category": "Condition",
   "effect": "Dégâts ×2 les tours pairs",
   "limit": null,
   "notes": ""
  },
  {
   "id": "tour-impair-1-coup",
   "name": "Tour impair → +1 coup",
   "category": "Condition",
   "effect": "Le sort frappe une fois de plus les tours impairs",
   "limit": null,
   "notes": ""
  },
  {
   "id": "outsider",
   "name": "Outsider",
   "category": "Condition",
   "effect": "Dégâts ×2 si l'ennemi a plus de PV que toi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-bouclier-2",
   "name": "Si bouclier → ×2",
   "category": "Condition",
   "effect": "Dégâts ×2 si tu as un bouclier",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-soigne-50",
   "name": "Si soigné → +50 %",
   "category": "Condition",
   "effect": "+50 % de dégâts si tu as été soigné ce tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "vengeance",
   "name": "Vengeance",
   "category": "Condition",
   "effect": "Dégâts ×3 si l'ennemi t'a retiré plus de 20 % de tes PV au tour précédent",
   "limit": null,
   "notes": ""
  },
  {
   "id": "revanche",
   "name": "Revanche",
   "category": "Condition",
   "effect": "Dégâts ×3 si le sort précédent a raté",
   "limit": null,
   "notes": ""
  },
  {
   "id": "si-3-statuts-critique",
   "name": "Si 3 statuts → critique",
   "category": "Condition",
   "effect": "Critique garanti si l'ennemi a au moins 3 statuts différents",
   "limit": null,
   "notes": ""
  },
  {
   "id": "fievre",
   "name": "Fièvre",
   "category": "Condition",
   "effect": "Dégâts ×4 si l'ennemi brûle et saigne",
   "limit": null,
   "notes": ""
  },
  {
   "id": "court-circuit",
   "name": "Court-circuit",
   "category": "Condition",
   "effect": "Dégâts ×5 si l'ennemi est gelé et choqué",
   "limit": null,
   "notes": ""
  },
  {
   "id": "toxine-ardente",
   "name": "Toxine ardente",
   "category": "Condition",
   "effect": "Applique 3 poisons si l'ennemi brûle et est empoisonné",
   "limit": null,
   "notes": ""
  },
  {
   "id": "coup-de-grace",
   "name": "Coup de grâce",
   "category": "Condition",
   "effect": "Tue l'ennemi s'il est sous 10 % de ses PV",
   "limit": null,
   "notes": "Très fort : à limiter"
  },
  {
   "id": "endurance",
   "name": "Endurance",
   "category": "Condition",
   "effect": "Dégâts ×3 à partir du 10e tour du combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "dernier-souffle",
   "name": "Dernier souffle",
   "category": "Condition",
   "effect": "Frappe 3 fois de plus si tes PV sont sous 25 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "frenesie",
   "name": "Frénésie",
   "category": "Condition",
   "effect": "Si critique → le sort se relance",
   "limit": null,
   "notes": "Peut boucler"
  },
  {
   "id": "eclat-de-givre",
   "name": "Éclat de givre",
   "category": "Condition",
   "effect": "Si critique → applique 1 gel",
   "limit": null,
   "notes": ""
  },
  {
   "id": "critique-salvateur",
   "name": "Critique salvateur",
   "category": "Condition",
   "effect": "Si critique → te soigne de 5 % de tes PV max",
   "limit": null,
   "notes": ""
  },
  {
   "id": "embuscade",
   "name": "Embuscade",
   "category": "Condition",
   "effect": "+100 % de chance de critique si aucun critique n'a eu lieu dans le combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-fragilite-1-crit",
   "name": "Par fragilité → +1 % crit",
   "category": "Condition",
   "effect": "+1 % de chance de critique par cumul de fragilité",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-marque-5-crit",
   "name": "Par marque → +5 % crit",
   "category": "Condition",
   "effect": "+5 % de chance de critique par marque sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-malediction-10",
   "name": "Par malédiction → +10 %",
   "category": "Condition",
   "effect": "+10 % de dégâts par malédiction sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "par-gel-subi-20",
   "name": "Par gel subi → +20 %",
   "category": "Condition",
   "effect": "+20 % de dégâts par gel subi par l'ennemi dans le combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "acharnement",
   "name": "Acharnement",
   "category": "Condition",
   "effect": "+10 % de dégâts par tranche de 10 % de PV que l'ennemi a perdus",
   "limit": null,
   "notes": ""
  },
  {
   "id": "odeur-du-sang",
   "name": "Odeur du sang",
   "category": "Condition",
   "effect": "+2 % de chance de critique par saignement sur l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "3-gels-glaciation",
   "name": "3 gels → glaciation",
   "category": "Seuil",
   "effect": "Au 3e gel du combat, l'ennemi est gelé pendant 2 tours",
   "limit": null,
   "notes": ""
  },
  {
   "id": "chocs-3-foudre-en-chaine",
   "name": "Chocs ≥ 3 → foudre en chaîne",
   "category": "Seuil",
   "effect": "Consomme les chocs, le sort frappe 3 fois de plus",
   "limit": null,
   "notes": ""
  },
  {
   "id": "maledictions-5-mauvais-il",
   "name": "Malédictions ≥ 5 → mauvais œil",
   "category": "Seuil",
   "effect": "L'ennemi rate une attaque sur deux pendant 2 tours",
   "limit": null,
   "notes": ""
  },
  {
   "id": "corrosion-10-dissolution",
   "name": "Corrosion ≥ 10 → dissolution",
   "category": "Seuil",
   "effect": "Les poisons infligent ×3",
   "limit": null,
   "notes": ""
  },
  {
   "id": "faiblesse-10-epuisement",
   "name": "Faiblesse ≥ 10 → épuisement",
   "category": "Seuil",
   "effect": "L'ennemi n'inflige que 1 dégât au tour suivant",
   "limit": null,
   "notes": ""
  },
  {
   "id": "engourdissement-5-paralysie",
   "name": "Engourdissement ≥ 5 → paralysie",
   "category": "Seuil",
   "effect": "Consomme les engourdissements, l'ennemi est gelé",
   "limit": null,
   "notes": ""
  },
  {
   "id": "brulure-25-supernova",
   "name": "Brûlure ≥ 25 → supernova",
   "category": "Seuil",
   "effect": "Consomme les brûlures, dégâts ×10",
   "limit": null,
   "notes": ""
  },
  {
   "id": "5-statuts-differents-arc-en-ciel",
   "name": "5 statuts différents → arc-en-ciel",
   "category": "Seuil",
   "effect": "Tous les statuts de l'ennemi doublent",
   "limit": null,
   "notes": "Croissance exponentielle"
  },
  {
   "id": "givre-cassant",
   "name": "Givre cassant",
   "category": "Conversion",
   "effect": "Chaque gel appliqué donne aussi 3 fragilités",
   "limit": null,
   "notes": ""
  },
  {
   "id": "sang-vicie",
   "name": "Sang vicié",
   "category": "Conversion",
   "effect": "Chaque poison appliqué donne aussi 1 saignement",
   "limit": null,
   "notes": ""
  },
  {
   "id": "etincelles",
   "name": "Étincelles",
   "category": "Conversion",
   "effect": "Chaque choc appliqué donne aussi 2 brûlures",
   "limit": null,
   "notes": ""
  },
  {
   "id": "ferveur",
   "name": "Ferveur",
   "category": "Conversion",
   "effect": "50 % des soins reçus ce tour s'ajoutent aux dégâts du sort",
   "limit": null,
   "notes": ""
  },
  {
   "id": "belier",
   "name": "Bélier",
   "category": "Conversion",
   "effect": "Consomme ton bouclier et l'ajoute aux dégâts du sort",
   "limit": null,
   "notes": ""
  },
  {
   "id": "rancune",
   "name": "Rancune",
   "category": "Conversion",
   "effect": "Chaque coup que tu reçois applique 1 marque à l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "catalyse-critique",
   "name": "Catalyse critique",
   "category": "Conversion",
   "effect": "Les critiques ajoutent 1 cumul à chaque statut de l'ennemi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "amertume",
   "name": "Amertume",
   "category": "Conversion",
   "effect": "Chaque coup raté applique 2 poisons",
   "limit": null,
   "notes": "Bon avec Éclair et Tempête"
  },
  {
   "id": "feu-protecteur",
   "name": "Feu protecteur",
   "category": "Conversion",
   "effect": "Chaque brûlure appliquée te donne un petit bouclier",
   "limit": null,
   "notes": ""
  },
  {
   "id": "alchimie",
   "name": "Alchimie",
   "category": "Conversion",
   "effect": "Chaque statut appliqué a 25 % de chance de devenir un autre statut au hasard",
   "limit": null,
   "notes": ""
  },
  {
   "id": "letalite",
   "name": "Létalité",
   "category": "Amplificateur",
   "effect": "+100 % de dégâts sur les coups critiques",
   "limit": null,
   "notes": ""
  },
  {
   "id": "double",
   "name": "Doublé",
   "category": "Amplificateur",
   "effect": "25 % de chance que chaque coup frappe deux fois",
   "limit": null,
   "notes": ""
  },
  {
   "id": "ricochet",
   "name": "Ricochet",
   "category": "Amplificateur",
   "effect": "Chaque coup a 40 % de chance de rebondir pour un 2e coup à 50 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "demultiplication",
   "name": "Démultiplication",
   "category": "Amplificateur",
   "effect": "Chaque coup supplémentaire du sort fait +10 % de plus que le précédent",
   "limit": null,
   "notes": ""
  },
  {
   "id": "purete",
   "name": "Pureté",
   "category": "Amplificateur",
   "effect": "Dégâts ×2 si ce sort n'applique aucun statut",
   "limit": null,
   "notes": ""
  },
  {
   "id": "symetrie",
   "name": "Symétrie",
   "category": "Amplificateur",
   "effect": "Dégâts ×2 si les 3 slots de ce sort portent le même modificateur",
   "limit": null,
   "notes": ""
  },
  {
   "id": "collection",
   "name": "Collection",
   "category": "Amplificateur",
   "effect": "+15 % de dégâts par modificateur différent dans tout le grimoire",
   "limit": null,
   "notes": ""
  },
  {
   "id": "echo-majeur",
   "name": "Écho majeur",
   "category": "Amplificateur",
   "effect": "60 % de chance de relance, mais chaque relance fait −30 %",
   "limit": null,
   "notes": "Peut boucler, mais s'éteint tout seul"
  },
  {
   "id": "demesure",
   "name": "Démesure",
   "category": "Amplificateur",
   "effect": "Les dégâts sont arrondis à la puissance de 10 supérieure",
   "limit": null,
   "notes": "Absurde et très fort à haut niveau"
  },
  {
   "id": "chance",
   "name": "Chance",
   "category": "Amplificateur",
   "effect": "Les effets à chance sont tirés deux fois, le meilleur résultat est gardé",
   "limit": null,
   "notes": ""
  },
  {
   "id": "tout-ou-rien",
   "name": "Tout ou rien",
   "category": "Amplificateur",
   "effect": "Chance de critique doublée, mais les coups non critiques font 0",
   "limit": null,
   "notes": ""
  },
  {
   "id": "minimalisme",
   "name": "Minimalisme",
   "category": "Amplificateur",
   "effect": "+20 % de dégâts par slot vide dans tout le grimoire",
   "limit": null,
   "notes": ""
  },
  {
   "id": "barriere",
   "name": "Barrière",
   "category": "Survie",
   "effect": "Te donne un bouclier égal à 5 % de tes PV max au début de chaque tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "absorption",
   "name": "Absorption",
   "category": "Survie",
   "effect": "20 % des dégâts du sort deviennent des PV max temporaires pour le combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "contre-givre",
   "name": "Contre-givre",
   "category": "Survie",
   "effect": "20 % de chance de geler l'ennemi quand il te frappe",
   "limit": null,
   "notes": ""
  },
  {
   "id": "peau-de-pierre",
   "name": "Peau de pierre",
   "category": "Survie",
   "effect": "Tu subis −10 % de dégâts",
   "limit": null,
   "notes": ""
  },
  {
   "id": "sanctuaire",
   "name": "Sanctuaire",
   "category": "Survie",
   "effect": "Tes soins sont doublés",
   "limit": null,
   "notes": ""
  },
  {
   "id": "parade",
   "name": "Parade",
   "category": "Survie",
   "effect": "15 % de chance de renvoyer entièrement une attaque ennemie",
   "limit": null,
   "notes": ""
  },
  {
   "id": "tenacite",
   "name": "Ténacité",
   "category": "Survie",
   "effect": "Une fois par combat, un coup fatal te laisse à 1 PV",
   "limit": null,
   "notes": ""
  },
  {
   "id": "sang-froid",
   "name": "Sang-froid",
   "category": "Survie",
   "effect": "Sous 30 % de PV, te donne un bouclier de 15 % de tes PV max (une fois par combat)",
   "limit": null,
   "notes": ""
  },
  {
   "id": "absorption-de-statut",
   "name": "Absorption de statut",
   "category": "Survie",
   "effect": "Chaque statut appliqué te soigne de 1 % de tes PV max",
   "limit": null,
   "notes": ""
  },
  {
   "id": "mirage",
   "name": "Mirage",
   "category": "Survie",
   "effect": "La première attaque ennemie de chaque combat te rate",
   "limit": null,
   "notes": ""
  },
  {
   "id": "kamikaze",
   "name": "Kamikaze",
   "category": "Risque",
   "effect": "Dégâts ×5, te coûte 20 % de tes PV actuels",
   "limit": null,
   "notes": ""
  },
  {
   "id": "roulette",
   "name": "Roulette",
   "category": "Risque",
   "effect": "1 chance sur 6 de ×10, sinon ×0,8",
   "limit": null,
   "notes": ""
  },
  {
   "id": "vertige",
   "name": "Vertige",
   "category": "Risque",
   "effect": "Dégâts ×3, mais 20 % de chance de te frapper toi-même",
   "limit": null,
   "notes": ""
  },
  {
   "id": "compte-a-rebours",
   "name": "Compte à rebours",
   "category": "Risque",
   "effect": "Dégâts ×2 par tour écoulé, mais tu perds 5 % de tes PV max par tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "avarice",
   "name": "Avarice",
   "category": "Risque",
   "effect": "Dégâts ×3, mais les autres sorts du grimoire font −20 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "egoisme",
   "name": "Égoïsme",
   "category": "Risque",
   "effect": "Dégâts ×2, mais désactive les effets « Entre sorts » des autres sorts",
   "limit": null,
   "notes": ""
  },
  {
   "id": "hubris",
   "name": "Hubris",
   "category": "Risque",
   "effect": "Dégâts ×4 tant que tu n'as pas été touché dans le combat, ×0,5 ensuite",
   "limit": null,
   "notes": ""
  },
  {
   "id": "martyr",
   "name": "Martyr",
   "category": "Risque",
   "effect": "+10 % de dégâts par coup reçu dans le combat, mais tes soins font −50 %",
   "limit": null,
   "notes": ""
  },
  {
   "id": "immolation",
   "name": "Immolation",
   "category": "Risque",
   "effect": "Applique 5 brûlures à l'ennemi et 1 à toi",
   "limit": null,
   "notes": ""
  },
  {
   "id": "rappel",
   "name": "Rappel",
   "category": "Entre sorts",
   "effect": "30 % de chance de relancer le sort précédent",
   "limit": null,
   "notes": "Peut boucler"
  },
  {
   "id": "heritage",
   "name": "Héritage",
   "category": "Entre sorts",
   "effect": "Ce sort applique aussi 50 % des statuts appliqués par le sort précédent",
   "limit": null,
   "notes": ""
  },
  {
   "id": "amorce",
   "name": "Amorce",
   "category": "Entre sorts",
   "effect": "Si ce sort applique un statut, le sort suivant fait ×1,5",
   "limit": null,
   "notes": ""
  },
  {
   "id": "detonateur",
   "name": "Détonateur",
   "category": "Entre sorts",
   "effect": "Le sort suivant consomme les brûlures de l'ennemi et inflige leurs dégâts d'un coup",
   "limit": null,
   "notes": ""
  },
  {
   "id": "conduit",
   "name": "Conduit",
   "category": "Entre sorts",
   "effect": "Les effets de critique de ce sort se déclenchent aussi sur le sort suivant",
   "limit": null,
   "notes": ""
  },
  {
   "id": "contrepoint",
   "name": "Contrepoint",
   "category": "Entre sorts",
   "effect": "Dégâts ×2 si le sort précédent n'a fait aucun dégât",
   "limit": null,
   "notes": "Bon après Miasme, Sceau ou Égide"
  },
  {
   "id": "unisson",
   "name": "Unisson",
   "category": "Entre sorts",
   "effect": "+50 % de dégâts si le sort précédent a le même noyau",
   "limit": null,
   "notes": ""
  },
  {
   "id": "offrande",
   "name": "Offrande",
   "category": "Entre sorts",
   "effect": "Ce sort ne fait aucun dégât, mais le sort suivant fait ×3",
   "limit": null,
   "notes": ""
  },
  {
   "id": "echo-total",
   "name": "Écho total",
   "category": "Entre sorts",
   "effect": "Si ce sort se relance, le sort suivant se relance aussi",
   "limit": null,
   "notes": "Peut boucler"
  },
  {
   "id": "onde-porteuse",
   "name": "Onde porteuse",
   "category": "Entre sorts",
   "effect": "Chaque relance de ce sort donne +10 % de dégâts au sort suivant",
   "limit": null,
   "notes": ""
  },
  {
   "id": "experience",
   "name": "Expérience",
   "category": "Croissance",
   "effect": "+1 % de dégâts permanent pour la partie à chaque lancer",
   "limit": null,
   "notes": "Croissance sur toute la partie, très forte"
  },
  {
   "id": "festin",
   "name": "Festin",
   "category": "Croissance",
   "effect": "+5 % de PV max permanent à chaque ennemi vaincu",
   "limit": null,
   "notes": ""
  },
  {
   "id": "erudit",
   "name": "Érudit",
   "category": "Croissance",
   "effect": "+2 % de dégâts permanent par statut différent appliqué dans la partie",
   "limit": null,
   "notes": ""
  },
  {
   "id": "maturation",
   "name": "Maturation",
   "category": "Croissance",
   "effect": "+1 cumul de statut appliqué par ce sort à chaque combat gagné",
   "limit": null,
   "notes": ""
  },
  {
   "id": "avalanche",
   "name": "Avalanche",
   "category": "Croissance",
   "effect": "Chaque coup du sort fait +5 % de plus que le précédent, dans le même tour",
   "limit": null,
   "notes": ""
  },
  {
   "id": "vortex",
   "name": "Vortex",
   "category": "Croissance",
   "effect": "+1 % de chance de relance par tour écoulé dans le combat",
   "limit": null,
   "notes": ""
  },
  {
   "id": "abysse",
   "name": "Abysse",
   "category": "Croissance",
   "effect": "+1 % de dégâts par étage atteint",
   "limit": null,
   "notes": "Suit automatiquement la progression infinie"
  },
  {
   "id": "contamination",
   "name": "Contamination",
   "category": "Croissance",
   "effect": "10 % des statuts de l'ennemi vaincu passent au suivant",
   "limit": null,
   "notes": ""
  },
  {
   "id": "cicatrices",
   "name": "Cicatrices",
   "category": "Croissance",
   "effect": "+5 % de dégâts permanent chaque fois que tu passes sous 25 % de PV",
   "limit": null,
   "notes": ""
  }
 ]
};
