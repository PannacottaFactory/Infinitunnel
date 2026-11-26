# Grimoire — notes de conception

Choix d'interprétation et règles qui ne sont pas évidentes à la lecture des CSV.
Les valeurs chiffrées sont dans `src/balance.js`.

## Données

- Les CSV sont exportés en Windows-1252, donc les caractères hors de ce jeu ont
  été remplacés par `?` (→, ≥, −, la plupart des symboles de sorts).
  `tools/csv-to-js.js` les reconstruit : `X ? 10 ? Y` → `X ≥ 10 → Y`,
  `X ? Y` → `X → Y`, `?10 %` → `−10 %`, et chaque sort reçoit un symbole par
  défaut (table `SYMBOLS` dans le script). Si les CSV sont réexportés en UTF-8,
  ces réparations ne font rien.
- Après une modification des CSV, relancer `node tools/csv-to-js.js`.

## Calcul des dégâts

- Les « +X % » s'additionnent entre eux (Puissance ×3 = +150 % = ×2,5), alors que
  les « ×N » se multiplient (Sacrifice ×2 + Si brûle ×2 = ×4).
- Chaque coup varie de ±20 % autour de la moyenne. Critique de base : 5 %, ×2.
- Paliers des noyaux : minuscule 0,25 · très faible 0,4 · faible 0,6 ·
  moyen 1 · élevé 1,6 · énorme 3 (× BASE_DAMAGE = 10).

## Ordre de résolution d'un sort

1. Le noyau, puis les slots de gauche à droite, règlent le lancer (`onCast`) :
   coûts, bonus et nombre de coups.
2. Pour chaque coup : on tire le raté, puis on applique les multiplicateurs
   conditionnels (Si brûle, Exécution…) et le critique, et on inflige les dégâts.
   Ensuite viennent les effets « au coup » de gauche à droite (statuts,
   vampirisme), puis le tirage de gel.
3. En fin de lancer (`afterCast`) : relances, effets sur le sort suivant.

Conséquence : une condition est évaluée **avant** les statuts du même coup.
Sur un sort à 1 coup, `[Brûlure][Si brûle → ×2]` ne double donc pas le 1er
lancer du combat. Sur une Lame, le 2e coup profite de la brûlure posée par le 1er.

## Statuts

- La puissance d'un cumul vaut un % des « dégâts de référence » du coup qui l'a
  posé (dégâts après critique, avant marque, choc et fragilité). Le statut garde
  la somme des puissances de ses cumuls.
- **Brûlure** : 15 %/cumul en fin de tour. Perd 1 cumul par tour, et la
  puissance baisse en proportion.
- **Poison** : 6 %/cumul en fin de tour. Il ne disparaît pas et sa puissance
  augmente de 20 % après chaque tick.
- **Saignement** : 30 %/cumul, infligés chaque fois que l'ennemi attaque (pas
  quand il est gelé). Il ne diminue pas.
- **Gel** : un seul tirage par coup, avec la somme des chances (noyau Givre 20 %
  + 15 % par modificateur Gel). L'ennemi saute sa prochaine attaque.
- **Choc** : il est posé après le coup et consommé par le coup suivant
  (+50 %). Il ne se cumule pas : plusieurs Chocs sur un sort = un seul choc.
- **Fragilité** : +10 % de dégâts subis par cumul (additif), sur toutes les
  sources.
- **Faiblesse** : ×0,9 par cumul (multiplicatif, pour ne jamais atteindre 0 %).
- **Engourdissement** : +10 % de chance de rater par cumul, plafonné à 75 %.
- **Marque** : le « +5 dégâts fixes » du CSV devient 5 % des dégâts de
  référence par marque, ajoutés à chaque coup. Des dégâts fixes ne serviraient
  plus à rien aux étages élevés.
- **Malédiction** : à 10 cumuls, l'ennemi perd 25 % de ses PV max, puis les
  malédictions retombent à 0.

## Relances

- Elles passent par une file d'attente : une relance est insérée en tête de
  file, donc jouée immédiatement, avant le sort suivant du grimoire.
- Au maximum 50 relances par tour. Au-delà, chaque relance demandée ne lance
  rien et donne « SURCHARGE » : ×1,1 cumulatif aux **lancers suivants de ce
  tour** (c'est notre lecture de « dégâts du dernier sort »).
- Garde-fou : 5 000 actions par tour au maximum. Un combat qui dépasse
  100 tours est perdu (épuisement).

## Modificateurs de l'étape 1

- **Si rate → relance** : une seule relance par lancer, même si plusieurs coups
  ratent. Chaque exemplaire du modificateur en demande une.
- **Fracture** : nombre de coups du noyau ×3, puis on ajoute les coups bonus
  (Multicoup). Chaque coup fait 40 % des dégâts.
- **Écho** : chaque exemplaire tire 30 % séparément après le lancer. Une relance
  peut elle-même relancer.
- **Sacrifice** : coûte 5 % des PV **actuels** (arrondi vers le bas), donc il ne
  peut jamais tuer.
- **Préparation** : le prochain lancer, quel qu'il soit (une relance comprise, ou
  le premier sort du tour suivant), fait ×1,5. Plusieurs Préparations se
  multiplient.
- **Vampirisme** : soigne 10 % des dégâts du coup, jusqu'aux PV max.

## Entre deux combats (étape 2)

- Après chaque victoire, 3 cartes distinctes sont proposées. Chacune a 15 % de
  chance d'être un nouveau sort, sinon c'est un modificateur
  (`CORE_REWARD_CHANCE`). On peut aussi passer.
- Seul le contenu implémenté est proposé (`OFFER_UNIMPLEMENTED: false`), parce
  qu'un modificateur non codé ne ferait rien.
- **Modificateur** : on clique n'importe quel slot. Un slot plein est remplacé
  et l'ancien modificateur est perdu. Les slots interdits par la « Limite par
  sort » sont grisés.
- **Nouveau sort** : il est ajouté en fin de grimoire s'il reste de la place.
  Sinon, il **remplace le noyau** du sort choisi, qui **garde ses
  modificateurs**. Sans cela, un nouveau noyau ne vaudrait presque jamais la
  perte d'un sort déjà équipé.
- Un même noyau peut apparaître plusieurs fois dans le grimoire.
- On réordonne les sorts avec ▲▼, sur l'écran de récompense et sur l'écran de
  préparation qui précède chaque combat.
- Les récompenses d'un étage sont tirées avec un générateur dérivé de la graine
  et de l'étage. Même graine et mêmes choix, donc même partie.
- **Record** : c'est l'étage où l'on meurt. Il est enregistré dans
  `localStorage` (clé `grimoire.record`) avec la graine, la date et le grimoire.

## Affichage (étape 3)

- Le combat est entièrement calculé d'avance. L'UI rejoue ensuite ses lignes à
  la vitesse choisie : ×1 (environ 0,25 s par ligne), ×4, ou instantané (»).
  La vitesse est mémorisée.
  Entrée ou « Passer » affiche le reste du combat d'un coup.
- Chaque événement porte un instantané de l'état (`ev.snap` : PV, bouclier,
  statuts de l'ennemi). C'est lui qui met à jour l'arène ligne par ligne. Les
  simulations le désactivent avec `snapshots: false`.
- Un « gros chiffre » est un critique, ou un coup qui retire au moins 30 % des
  PV max de l'ennemi (`BIG_HIT_RATIO` dans `ui/log.js`). Il s'affiche plus
  grand, clignote et secoue fortement l'ennemi.
- Le record (étage le plus profond atteint) est mis à jour **à chaque
  victoire**, pas seulement à la mort, et rien n'est perdu si l'onglet est
  fermé. Le flash doré se déclenche une fois par partie, au moment où l'ancien
  record est dépassé (pas lors de la toute première partie).
- Les noms de statuts sont colorés automatiquement dans les textes (cartes,
  infobulles, log, noms des modificateurs) par `G.Log.colorize`.
- Nombres : `1 234` jusqu'à 9 999, puis `12,3K`, `123K`, `4,5M`, `7,8B`, puis
  `4,2e15` à partir de 10¹².

## Progression

- Ennemi : PV = 30 × 1,13^étage, ATK = 5 × 1,12^étage (±10 %).
- Joueur : 100 PV, ×1,10 par étage franchi, soin complet entre deux combats
  (`HEAL_BETWEEN_FIGHTS`). Les PV max augmentent pour que les effets en « % des
  PV max » restent utiles plus tard.
- Chaque étage a son propre générateur, dérivé de la graine. Avec la même graine,
  les combats sont identiques, quels que soient les choix faits entre eux.
