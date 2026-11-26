#!/usr/bin/env node
/*
 * Petit serveur statique, sans dépendance, pour « npm run dev ».
 * Le jeu marche aussi en double-cliquant sur index.html ; le serveur est
 * juste plus pratique (URL stable, localStorage par origine http).
 *
 * Usage : npm run dev            (port 5173)
 *         PORT=8080 npm run dev
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = +process.env.PORT || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  // Interdit de sortir du dossier du projet.
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Interdit'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Introuvable : ' + urlPath); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', // toujours la dernière version après une modification
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Grimoire : http://localhost:${PORT}  (Ctrl+C pour arrêter)`);
});
