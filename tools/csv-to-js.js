#!/usr/bin/env node
/*
 * Convertit data/sorts.csv et data/modificateurs.csv en data/data.js.
 *
 * Usage :  node tools/csv-to-js.js
 *
 * data.js est chargé par index.html avec une simple balise <script> (pas de
 * fetch, pour que le jeu marche en file://) et par les scripts Node.
 *
 * Réparations automatiques :
 *  - Encodage : accepte l'UTF-8 ; sinon décode en Windows-1252 (export Excel FR).
 *  - Les caractères hors Windows-1252 sont devenus « ? » à l'export
 *    (→, ≥, −, et la plupart des symboles de sorts). On les reconstruit :
 *      noms    : « X ? 10 ? Y »  → « X ≥ 10 → Y »,  « X ? Y » → « X → Y »
 *      effets  : « ?10 % »       → « −10 % »,       « X ? Y » → « X → Y »
 *      symbole : « ? » ou vide   → symbole par défaut (table SYMBOLS ci-dessous)
 *    Si le CSV est réexporté proprement en UTF-8, ces réparations ne font rien.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

// Symbole par défaut de chaque sort, utilisé quand le CSV n'en a pas (ou « ? »).
const SYMBOLS = {
  'Trait': '✦', 'Éclair': 'ϟ', 'Givre': '❄', 'Miasme': '☁', 'Lame': '⚔',
  'Orbe': '◉', 'Flamme': '♨', 'Épine': '†', 'Prisme': '◈', 'Ombre': '☾',
  'Sangsue': '∿', 'Châtiment': '⚖', 'Spirale': '@', 'Comète': '☄', 'Égide': '⛨',
  'Étincelle': '⁂', 'Vide': '○', 'Rayon': '☼', 'Tempête': '≋', 'Brume': '░',
  'Croix': '✚', 'Sceau': '⌘', 'Balance': '♎', 'Pique': '♠', 'Trèfle': '♣',
  'Sablier': '⧗', 'Ancre': '⚓', 'Reflet': '◐', 'Saignée': '♥', 'Lune': '☽',
  'Spore': '⁕', 'Propagation': '⁜',
};

function readText(file) {
  const buf = fs.readFileSync(file);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch (e) {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

// Parseur CSV minimal : guillemets, "" échappés, virgules et retours à la ligne dans les champs.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter(r => r.some(c => c.trim() !== ''));
  return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

const fixName = s => s
  .replace(/ \? (\d+) \? /g, ' ≥ $1 → ')
  .replace(/ \? /g, ' → ');
const fixText = s => s
  .replace(/\?(\d)/g, '−$1')
  .replace(/ \? /g, ' → ');

// Identifiant ASCII stable (utile pour les sauvegardes et les clés CSS).
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sorts = parseCsv(readText(path.join(DATA_DIR, 'sorts.csv'))).map(r => {
  const name = fixName(r['Sort']);
  const sym = r['Symbole'];
  return {
    id: slug(name),
    name,
    symbol: (!sym || sym === '?') ? (SYMBOLS[name] || '?') : sym,
    effect: fixText(r['Effet de base'] || ''),
    notes: fixText(r['Notes'] || ''),
  };
});

const modificateurs = parseCsv(readText(path.join(DATA_DIR, 'modificateurs.csv'))).map(r => {
  const name = fixName(r['Modificateur']);
  const limit = parseInt(r['Limite par sort'], 10);
  return {
    id: slug(name),
    name,
    category: r['Catégorie'] || r['Categorie'] || '',
    effect: fixText(r['Effet'] || ''),
    limit: Number.isFinite(limit) ? limit : null, // null = pas de limite
    notes: fixText(r['Notes'] || ''),
  };
});

const out =
  '// FICHIER GÉNÉRÉ par tools/csv-to-js.js — ne pas modifier à la main.\n' +
  '// Relancer « node tools/csv-to-js.js » après avoir modifié les CSV.\n' +
  'var G = globalThis.G = globalThis.G || {};\n' +
  'G.DATA = ' + JSON.stringify({ sorts, modificateurs }, null, 1) + ';\n';

fs.writeFileSync(path.join(DATA_DIR, 'data.js'), out, 'utf8');
console.log(`data/data.js : ${sorts.length} sorts, ${modificateurs.length} modificateurs.`);
const unknown = sorts.filter(s => s.symbol === '?').map(s => s.name);
if (unknown.length) console.log('Sorts sans symbole (à ajouter dans SYMBOLS) :', unknown.join(', '));
