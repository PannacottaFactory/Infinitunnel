# Infinitunnel — Grimoire

Roguelite de combat tour par tour en ASCII. Tu es un mage qui construit un grimoire de sorts, et les combats sont automatiques. Le but : construire le build le plus puissant pour descendre le plus loin possible dans des étages infinis.

## Lancer le jeu

Double-clique sur `index.html`. Il n'y a ni build ni serveur : tout est en HTML/CSS/JS vanilla.

## Structure

- `data/` : CSV des sorts et modificateurs, et `data.js` généré à partir d'eux (`node tools/csv-to-js.js`).
- `src/balance.js` : toutes les constantes d'équilibrage.
- `src/engine/` : logique pure, sans DOM (combat, sorts, statuts, modificateurs, ennemis, partie).
- `src/ui/` : affichage (log, arène, lecture animée, grimoire, récompenses, écrans).
- `NOTES.md` : règles et choix d'interprétation.
