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
2. Pour chaque coup : on tire le raté. On calcule ensuite les bonus propres au
   coup (`beforeHit` : « +X % par… », chance de critique), puis les
   multiplicateurs conditionnels (Si brûle, Exécution…) et le critique, et on
   inflige les dégâts.
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

## Étape 4 : tout le contenu

Les 32 noyaux et les 207 modificateurs sont implémentés. Voici, pour chacun
dont la description du CSV est ambiguë, l'interprétation retenue : la plus
simple possible.

### Règles générales ajoutées

- **Sorts sans dégâts** (Miasme, Sceau, Spore) : ils calculent quand même un
  « coup » à partir de leur palier de référence (faible). Les bonus, les
  multiplicateurs et les critiques renforcent ainsi les statuts qu'ils
  appliquent, sans infliger de dégâts.
- **« Le sort suivant »** désigne le prochain lancer, quel qu'il soit : une
  relance comprise, ou le premier sort du tour suivant.
- **« Le sort précédent »** désigne le lancer précédent, qui peut venir du tour
  d'avant.
- **Les effets globaux** (« les brûlures de l'ennemi ne baissent plus », « tu
  subis −10 % », Épines, Esquive…) sont actifs dès que le modificateur est
  quelque part dans le grimoire, peu importe le sort. Plusieurs exemplaires
  s'additionnent (Esquive ×2 = 20 %) ou se multiplient (Peau de pierre ×2 =
  ×0,81).
- **Les conversions et amplifications** (Combustion toxique, Brasier,
  Persistance, Alchimie…) ne concernent que les statuts appliqués par **ce
  sort**.
- **Les coûts en PV** (Sacrifice, Pacte de sang, Kamikaze, Comète, Compte à
  rebours) ne peuvent pas tuer : tu restes à 1 PV. Ce n'est pas le cas des vrais
  dégâts (Vertige, Immolation).
- **Les boucliers** retombent à 0 au début de chaque tour. Ils protègent de
  l'attaque du tour en cours et ne peuvent pas s'empiler indéfiniment.
- **Les seuils** sont testés après chaque coup du sort qui porte le
  modificateur. Ceux qui ne disent pas « consomme » se redéclenchent tant que la
  condition reste vraie (Contagion, Arc-en-ciel : croissance exponentielle
  voulue).
- **Les croissances permanentes** (Trophée, Expérience, Maturation, Cicatrices)
  sont stockées sur le sort (`spell.growth`) et le suivent quand on le
  réordonne. Chaque exemplaire du modificateur lit le même compteur.
- **Les « +X % »** sont affichés dans le log sous le premier coup du lancer,
  par exemple `├ Puissance → +50 %`.
- **Statut au hasard** : il est tiré parmi brûlure, poison, saignement, choc,
  fragilité, faiblesse, engourdissement, marque, malédiction, corrosion, fêlure
  et peur.

### Noyaux

- **Orbe** : +10 % par lancer **précédent** de ce sort dans le combat.
- **Prisme** : sur une base « moyen », dégâts ×0 à ×3, tirés à chaque coup.
- **Châtiment** : sa base vaut 20 % des dégâts subis depuis le début du
  combat. Il ne fait donc rien au tour 1.
- **Spirale** : autant de coups que le numéro du tour, chacun « minuscule ».
- **Comète** : coûte 10 % des PV actuels.
- **Égide** : bouclier de 20 % des PV max, multiplié par les bonus du sort
  (Puissance…). Elle n'a aucun coup, donc ses modificateurs « au coup » ne
  font rien.
- **Vide** : sans effet propre, il a des dégâts faibles pour que ses
  modificateurs aient une base. Ses modificateurs comptent ×1,5 :
  - les « +X % » sont multipliés par 1,5 ;
  - un multiplicateur conditionnel ×N devient ×(1 + (N−1) × 1,5) ;
  - les statuts sont multipliés par 1,5 (arrondi).
- **Rayon** : +20 % par tour consécutif où il a touché au moins une fois.
- **Tempête** : 5 coups « très faibles », 30 % de raté chacun.
- **Balance** : 10 % de l'écart entre tes PV et ceux de l'ennemi.
- **Pique** : critique ×4 au lieu de ×2.
- **Trèfle** : ×0,25 à ×1,75 d'une base « moyen », 25 % de critique de base.
- **Sablier** : base « minuscule », ×2^(tour − 1).
- **Ancre** : base de 5 % des PV max.
- **Reflet** : relance le lancer précédent à 60 % de puissance, et n'a aucun
  coup lui-même. Deux Reflets se relancent l'un l'autre jusqu'à la SURCHARGE.
- **Saignée** : quand elle est lancée, l'ennemi n'a pas encore attaqué ce
  tour-ci. « PV perdus ce tour » devient donc : PV perdus depuis le début du
  tour précédent.
- **Propagation** : +1 cumul de même valeur moyenne à chaque statut présent.

### Statut

- **Gelure** : à 5 cumuls, l'ennemi est gelé 1 tour et 5 gelures sont retirées.
- **Présage** : à 3 cumuls, le prochain coup reçu fait ×5 et 3 présages sont
  retirés.
- **Cendres** : en fin de tour, si l'ennemi ne brûle plus, toutes les cendres
  deviennent des brûlures de même puissance.
- **Fêlure** : chaque coup (pas les statuts) retire en plus 1 % des PV
  **actuels** par fêlure.
- **Peur** : 5 % par cumul de sauter son tour, plafonné à 60 %.
- **Lien de douleur** : l'ennemi subit 10 % par lien des PV que tu perds
  réellement (après bouclier).
- **Exposition** : +0,25 au multiplicateur critique par cumul.
- **Statut double** : deux statuts différents au hasard, 1 cumul chacun.

### Amplification de statut

- **Virulence** : +1 cumul à chaque application.
- **Glaciation** : +5 % de chance de gel pour ce sort, par gel déjà subi par
  l'ennemi dans le combat.
- **Prolifération** : en fin de tour, chaque statut a 10 % de chance (par
  exemplaire) de gagner 1 cumul.
- **Persistance** : les cumuls posés par ce sort résistent à toutes les
  consommations (Moisson, Gourmand, seuils, Si gelé → éclat…), mais la
  brûlure continue de baisser normalement avec le temps.

### Condition

- **Par saignement → +4 dégâts** : des dégâts fixes deviendraient inutiles,
  donc +4 % par saignement.
- **Si marqué / Si 3 statuts → critique** : le critique est garanti sur le
  coup concerné.
- **Riposte, Vengeance** : regardent le tour précédent (touché ; plus de 20 %
  de tes PV max perdus).
- **Revanche** : le lancer précédent a raté au moins un coup.
- **Si saigne → brûlures ×2** : double les cumuls **et** la puissance des
  brûlures, à chaque coup.
- **Coup de grâce** : tue l'ennemi s'il est sous 10 % de ses PV après le coup.
- **Frénésie** : un critique relance le sort, au plus une fois par lancer et par
  exemplaire.
- **Embuscade** : +100 % de chance de critique tant qu'aucun critique n'a eu
  lieu dans le combat.
- **Acharnement** : +10 % par tranche complète de 10 % de PV perdus par
  l'ennemi.

### Seuil

- **Fragilité ≥ 5 → brisure** : consomme les fragilités. Le prochain coup reçu
  par l'ennemi fait ×5.
- **Marques ≥ 5 → condamnation** : consomme les marques, et le coup en cours
  est multiplié par leur nombre.
- **Brûlure ≥ 25 → supernova** : consomme les brûlures, et le coup en cours
  fait ×10.
- **Chocs ≥ 3 → foudre en chaîne** : il faut Surtension pour cumuler des chocs.
  Consomme les chocs, +3 coups.
- **Malédictions ≥ 5 → mauvais œil** : pendant 2 tours, chaque attaque ennemie
  a 50 % de chance de rater. Ne consomme rien, mais ne se relance qu'une fois
  l'effet terminé.
- **Faiblesse ≥ 10 → épuisement** : consomme les faiblesses, la prochaine
  attaque ennemie fait 1 dégât.
- **3 gels → glaciation** : effet global. Au 3e gel du combat, gelé 2 tours.
- **Saignement ≥ 8 → hémorragie** : −10 % des PV max, puis les saignements
  sont consommés.

### Conversion

- **Combustion toxique** : chaque brûlure appliquée par ce sort est remplacée
  par 2 poisons.
- **Moisson** : consomme **tous** les statuts au début du lancer, +20 % par
  cumul consommé.
- **Copie** : +1 cumul au statut qui a le plus de cumuls.
- **Transfusion** : tu es soigné de 30 % des dégâts du saignement quand
  l'ennemi attaque.
- **Ferveur / Bélier** : la valeur (50 % des soins du tour / ton bouclier)
  s'ajoute au 1er coup avant les multiplicateurs conditionnels.
- **Feu protecteur** : chaque brûlure appliquée donne un bouclier de 2 % des
  PV max.
- **Alchimie** : 25 % de chance par application de changer de statut.

### Amplificateur

- **Résonance** : une relance de ce sort a 10 % × sa profondeur de se relancer
  (10 %, puis 20 %…).
- **Unité** : +30 % par modificateur de ce sort qui a un double sur ce sort.
  `[Unité][Unité][Unité]` donne 3 × 3 × 30 % = +270 %.
- **Diversité** : +30 % par noyau différent dans le grimoire, lui compris.
- **Létalité** : le multiplicateur critique est doublé (×2 → ×4).
- **Brutalité** : +1 au multiplicateur critique (×2 → ×3, Pique ×4 → ×5).
- **Doublé / Ricochet** : le coup en plus ne peut pas lui-même redoubler.
  Ricochet frappe à 50 %.
- **Démultiplication / Avalanche** : chaque coup fait ×1,10 / ×1,05 de plus que
  le précédent (croissance composée).
- **Pureté** : ×2 si aucun élément du sort ne peut appliquer de statut (gel
  compris).
- **Chance** : favorable (critique, relance, gel, Instable) = meilleur de 2
  tirages. Raté = il faut rater 2 fois. Dégâts aléatoires = meilleur de 2.
- **Constance** : la variance et les dégâts aléatoires (Prisme, Chaos, Trèfle)
  ne descendent jamais sous la moyenne.
- **Tout ou rien** : la chance de critique est doublée, et les coups non
  critiques font 0.
- **Démesure** : chaque coup est arrondi à la puissance de 10 supérieure,
  après le critique.

### Survie

- **Régénération** : soigne 2 % des PV max à chaque lancer de ce sort.
- **Garde glaciale** : bouclier de 10 % des PV max, à chaque lancer, si
  l'ennemi est gelé.
- **Esquive / Parade** : effets globaux, 10 % / 15 % par exemplaire, plafonnés
  à 75 %.
- **Absorption** : 20 % des dégâts deviennent des PV max **et** des PV, pour
  ce combat seulement.
- **Ténacité, Seconde chance, Sang-froid, Mirage** : une fois par combat.
  Ténacité passe avant Seconde chance.

### Risque

- **Fragile** : ×2, et effet global : tu subis +15 %.
- **Vertige** : 20 % de chance, à chaque lancer, de perdre 10 % de tes PV max.
- **Compte à rebours** : ×max(1, 2 × (tour − 1)), donc ×2 au tour 2 et ×4 au
  tour 3. Effet global : −5 % des PV max au début de chaque tour.
- **Avarice** : ×3. Chaque Avarice posée sur un **autre** sort donne ×0,8.
- **Égoïsme** : ×2, et les modificateurs « Entre sorts » des **autres** sorts
  sont désactivés.
- **Hubris** : ×4 tant que tu n'as pas été touché dans le combat, ×0,5
  ensuite.
- **Martyr** : +10 % par coup reçu dans le combat, et tous tes soins font
  −50 %.
- **Immolation** : 5 brûlures par coup sur l'ennemi. Tu gagnes 1 brûlure par
  lancer : 3 % de tes PV max par tour, 1 cumul perdu par tour.

### Entre sorts

- **Fusion / Héritage** : au 1er coup, réappliquent 100 % / 50 % (arrondi vers
  le bas) des statuts du lancer précédent.
- **Miroir** : prend l'effet du modificateur placé au même slot sur le sort
  **au-dessus** dans le grimoire. Sur le 1er sort, ou face à un slot vide, il
  ne fait rien.
- **Chaîne / Rappel** : relancent le sort en dessous / au-dessus dans le
  grimoire. Il n'y a pas de bouclage du dernier au premier.
- **Écho total** : si ce lancer a déclenché une relance de lui-même, le sort
  en dessous est relancé aussi.
- **Onde porteuse** : chaque relance de ce sort ajoute +10 % au prochain
  lancer.
- **Offrande** : ce sort fait 0 (ses statuts ont donc une puissance nulle), et
  le prochain lancer fait ×3.
- **Harmonie** : +25 % par autre sort qui partage au moins un modificateur
  avec celui-ci.

### Croissance

- **Accumulation** : +n cumuls à chaque application, n étant le numéro du
  lancer de ce sort dans le combat (1, 2, 3…).
- **Crescendo** : +1 coup tous les 3 tours écoulés (tour 4 : +1, tour 7 : +2…).
- **Patience** : +25 % par tour consécutif sans avoir été touché.
- **Trophée / Expérience** : +1 % par victoire / par lancer, depuis que le
  modificateur est sur ce sort.
- **Festin** : +5 % de PV max permanent par exemplaire, appliqué après chaque
  victoire.
- **Érudit** : +2 % par type de statut différent appliqué depuis le début de la
  partie.
- **Maturation** : +1 cumul par application et par victoire depuis la pose.
- **Vortex** : +1 % de chance de relance par numéro de tour.
- **Contamination** : 10 % des cumuls (par exemplaire, arrondis) de l'ennemi
  vaincu sont transmis au suivant, sauf le gel et le choc.
- **Cicatrices** : +5 % chaque fois que tu passes sous 25 % de tes PV. Le
  compteur se réarme quand tu remontes au-dessus.

## Entre deux combats (étape 2)

- Après chaque victoire, 3 cartes distinctes sont proposées. Chacune a 15 % de
  chance d'être un nouveau sort, sinon c'est un modificateur
  (`CORE_REWARD_CHANCE`).
- **Jetons de refresh** (⟳, affichés dans la barre du haut) : on en gagne 1 par
  combat gagné (`REFRESH_PER_VICTORY`).
  - **Refresh** (touche R) : coûte 1 jeton et tire 3 nouvelles cartes,
    différentes de celles qu'on vient de voir. On peut enchaîner tant qu'il
    reste des jetons.
  - **Passer** (touche P) : ne prend aucune récompense et rapporte 1 jeton
    (`REFRESH_ON_SKIP`).
  - Les cartes de chaque tirage dépendent de la graine, de l'étage et du numéro
    du tirage. Une partie reste donc rejouable à l'identique.
- Les touches 1 à 3 sont lues par position physique (`e.code`) et marchent
  aussi en AZERTY, sans Maj.
- Seul le contenu implémenté est proposé (`OFFER_UNIMPLEMENTED: false`). Depuis
  l'étape 4, tout est implémenté, donc tout peut être proposé.
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
