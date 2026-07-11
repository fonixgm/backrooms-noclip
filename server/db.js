// BACKROOMS MMO — persistencia con el SQLite NATIVO de Node (node:sqlite,
// Node 22.13+): cero dependencias. Cada jugador es su token anónimo del
// navegador; aquí viven su sintonía, su códice de niveles y los baneos.
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DIR = path.join(__dirname, 'datos');
fs.mkdirSync(DIR, { recursive: true });
const db = new DatabaseSync(path.join(DIR, 'mmo.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS jugadores (
    token TEXT PRIMARY KEY,
    nombre TEXT,
    sintonia INTEGER DEFAULT 0,
    muertes INTEGER DEFAULT 0,
    escapes INTEGER DEFAULT 0,
    baneado INTEGER DEFAULT 0,
    creado INTEGER,
    visto INTEGER
  );
  CREATE TABLE IF NOT EXISTS visitas (
    token TEXT,
    nivel TEXT,
    veces INTEGER DEFAULT 0,
    PRIMARY KEY (token, nivel)
  );
`);

const qCarga = db.prepare('SELECT * FROM jugadores WHERE token = ?');
const qAlta = db.prepare(
  'INSERT INTO jugadores (token, nombre, creado, visto) VALUES (?, ?, ?, ?) ' +
  'ON CONFLICT(token) DO UPDATE SET nombre = excluded.nombre, visto = excluded.visto'
);
const qMuerte = db.prepare('UPDATE jugadores SET muertes = muertes + 1 WHERE token = ?');
const qEscape = db.prepare('UPDATE jugadores SET escapes = escapes + 1 WHERE token = ?');
const qBan = db.prepare('UPDATE jugadores SET baneado = ? WHERE token = ?');
const qVisita = db.prepare(
  'INSERT INTO visitas (token, nivel, veces) VALUES (?, ?, 1) ' +
  'ON CONFLICT(token, nivel) DO UPDATE SET veces = veces + 1'
);
const qNiveles = db.prepare('SELECT COUNT(*) AS n FROM visitas WHERE token = ?');

// Al conectar: da de alta (o refresca) y devuelve el expediente del errante.
function conectar(token, nombre) {
  console.log(`[db] conectar: token=${JSON.stringify(token)} (type=${typeof token}), nombre=${JSON.stringify(nombre)}`);
  const ahora = Date.now();
  qAlta.run(token, nombre, ahora, ahora);
  const fila = qCarga.get(token);
  return {
    muertes: fila.muertes | 0,
    escapes: fila.escapes | 0,
    baneado: !!fila.baneado,
    niveles: qNiveles.get(token).n | 0,
  };
}


function sumarMuerte(token) { qMuerte.run(token); }
function sumarEscape(token) { qEscape.run(token); }
function registrarVisita(token, nivel) {
  console.log(`[db] registrarVisita: token=${JSON.stringify(token)} (type=${typeof token}), nivel=${JSON.stringify(nivel)}`);
  try {
    qVisita.run(token, nivel);
  } catch (err) {
    console.error(`[db] registrarVisita ERROR:`, err);
    throw err;
  }
}
function ban(token, si = true) { qBan.run(si ? 1 : 0, token); }

// Exportamos 'db' junto con las funciones para evitar que el recolector de basura (GC)
// libere la instancia DatabaseSync y cierre la conexión a SQLite, lo que causaría
// que las sentencias preparadas lancen el error "statement has been finalized".
module.exports = { db, conectar, sumarMuerte, sumarEscape, registrarVisita, ban };
