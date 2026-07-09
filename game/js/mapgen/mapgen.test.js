const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
require('../engine/rng.js');
require('./mapgen.js');

function countTiles(g) {
  const counts = { walkable: 0, vacio: 0 };
  for (const tile of g.t) {
    if (MapGen.walkable(tile)) counts.walkable++;
    if (tile === MapGen.T.VACIO) counts.vacio++;
  }
  return counts;
}

test('invernadero con altura no divisible por 3 no cae al fallback de pasillos', () => {
  const def = {
    id: 'audit-invernadero',
    bioma: 'invernadero',
    tam: [84, 56],
    salidas: [],
    objetos: [],
    entidades: [],
  };

  const map = MapGen.generate(def, RNG.create('pre-fix-4'));
  const counts = countTiles(map.grid);

  assert.ok(counts.walkable >= 60, 'el mapa debe tener suelo suficiente para jugar');
  assert.ok(counts.vacio > 0, 'el invernadero debe conservar vacio; el fallback de pasillos no tiene vacio');
});
