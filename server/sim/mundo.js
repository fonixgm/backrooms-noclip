// Puente Node ↔ motor del juego: carga los mismos módulos que el navegador.
// El servidor valida contra el mapa real sin enviar el mapa por red.
'use strict';

global.window = global;
require('../../game/js/data.js');
require('../../game/js/engine/rng.js');
require('../../game/js/mapgen/mapgen.js');

const DATA = global.GAME_DATA;
const RNG = global.RNG;
const MapGen = global.MapGen;

function generarMapa(nivelId, semilla) {
  const def = DATA.levels[nivelId];
  if (!def) throw new Error(`nivel desconocido: ${nivelId}`);
  const map = MapGen.generate(def, RNG.create(semilla));
  return { def, map };
}

function esTransitable(map, x, y) {
  if (x < 0 || y < 0 || x >= map.grid.w || y >= map.grid.h) return false;
  return MapGen.walkable(MapGen.at(map.grid, x, y));
}

module.exports = { DATA, RNG, MapGen, generarMapa, esTransitable };
