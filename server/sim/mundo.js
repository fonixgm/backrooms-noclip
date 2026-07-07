<<<<<<< Updated upstream
// Puente Node ↔ motor del juego: carga los MISMOS módulos que el navegador
// (patrón de pipeline/level0-audit.js). El servidor genera mapas idénticos a
// los del cliente a partir de la misma semilla — por la red nunca viaja un mapa.
'use strict';

global.window = global;
require('../../game/js/data.js');        // window.GAME_DATA (niveles/entidades/objetos)
require('../../game/js/engine/rng.js');  // window.RNG (mulberry32 determinista)
require('../../game/js/mapgen/mapgen.js'); // window.MapGen (generate/walkable/bfsDist)
require('../../game/js/engine/fov.js');  // window.FOV (compute/los — matemática pura)
=======
// Puente Node ↔ motor del juego: carga los mismos módulos que el navegador.
// El servidor valida contra el mapa real sin enviar el mapa por red.
'use strict';

global.window = global;
require('../../game/js/data.js');
require('../../game/js/engine/rng.js');
require('../../game/js/mapgen/mapgen.js');
>>>>>>> Stashed changes

const DATA = global.GAME_DATA;
const RNG = global.RNG;
const MapGen = global.MapGen;
<<<<<<< Updated upstream
const FOV = global.FOV;

// Genera el mapa de una sala. La semilla es el contrato con el cliente:
// mismo string → mismo mapa en servidor y navegador.
// En el mundo compartido las salidas aparecen SIEMPRE (se ignora `prob`, que
// era para las ventanas infinitas del modo solo): una instancia fija sin
// puertas sería una trampa para 60 personas. El cliente hace lo MISMO.
function defParaOnline(def) {
  return {
    ...def,
    salidas: (def.salidas || []).map((s) => { const c = { ...s }; delete c.prob; return c; }),
  };
}
=======
>>>>>>> Stashed changes

function generarMapa(nivelId, semilla) {
  const def = DATA.levels[nivelId];
  if (!def) throw new Error(`nivel desconocido: ${nivelId}`);
<<<<<<< Updated upstream
  const map = MapGen.generate(defParaOnline(def), RNG.create(semilla));
=======
  const map = MapGen.generate(def, RNG.create(semilla));
>>>>>>> Stashed changes
  return { def, map };
}

function esTransitable(map, x, y) {
  if (x < 0 || y < 0 || x >= map.grid.w || y >= map.grid.h) return false;
  return MapGen.walkable(MapGen.at(map.grid, x, y));
}

<<<<<<< Updated upstream
module.exports = { DATA, RNG, MapGen, FOV, generarMapa, esTransitable };
=======
module.exports = { DATA, RNG, MapGen, generarMapa, esTransitable };
>>>>>>> Stashed changes
