'use strict';

const assert = require('node:assert/strict');
const DailySeed = require('../game/js/engine/daily-seed');
const RouteSeed = require('../game/js/engine/route-seed');
const { DATA, generarMapa } = require('./sim/mundo');
const { asignar, tickTodas } = require('./sala');

assert.equal(DailySeed.dayKey(new Date('2026-07-10T21:59:59Z')), '2026-07-10');
assert.equal(DailySeed.dayKey(new Date('2026-07-10T22:00:00Z')), '2026-07-11');
assert.equal(DailySeed.seed(new Date('2026-12-31T23:30:00Z')), 'backrooms-diaria::2027-01-01');
assert.match(DailySeed.seed(), /^backrooms-diaria::\d{4}-\d{2}-\d{2}$/);

console.log('PASS la semilla cambia a medianoche de Europe/Madrid');

const mapaHoy = generarMapa('level-57', 'backrooms-diaria::2026-07-11').map;
const mapaManana = generarMapa('level-57', 'backrooms-diaria::2026-07-12').map;
assert.notDeepEqual([...mapaHoy.grid.t], [...mapaManana.grid.t]);
assert.notDeepEqual(mapaHoy.spawn, mapaManana.spawn);
console.log('PASS la semilla diaria cambia la geometría y el punto de aparición');

const ids = Object.keys(DATA.levels).sort();
for (const [id, level] of Object.entries(DATA.levels)) {
  for (const route of (level.salidas || []).filter((item) => item.destino === '*aleatoria')) {
    const candidates = ids.filter((candidate) => candidate !== id);
    const hoy = RouteSeed.pick('backrooms-diaria::2026-07-11', id, route, candidates);
    const manana = RouteSeed.pick('backrooms-diaria::2026-07-12', id, route, candidates);
    assert.notEqual(hoy, manana, `${id}: la ruta variable no rotó en la muestra diaria`);
  }
}
console.log('PASS las rutas variables rotan con el ciclo diario de la muestra');

const sala = asignar('level-0');
const jug = { id: 999 };
sala.jugadores.set(jug.id, jug);
sala.dia = '2000-01-01';
let migracion = null;
sala.alCruzar = (jugador, origen, salida, opciones) => { migracion = { jugador, origen, salida, opciones }; };
tickTodas(Date.now());
assert.equal(migracion?.jugador, jug);
assert.equal(migracion?.salida.destino, 'level-0');
assert.equal(migracion?.opciones.sinRetorno, true);
console.log('PASS las salas activas rotan al mapa del nuevo día');

const acuatica = asignar('level-7');
acuatica.entidades = [];
const agua = [...acuatica.map.grid.t].findIndex((tile, index) => tile === 3 &&
  acuatica.map.airPockets.every((air) => Math.hypot(air.x - index % acuatica.map.grid.w,
    air.y - Math.floor(index / acuatica.map.grid.w)) > 2));
const mensajes = [];
const nadador = {
  id: 1001, ws: { readyState: 1, send: (raw) => mensajes.push(JSON.parse(raw)) },
  x: agua % acuatica.map.grid.w, y: Math.floor(agua / acuatica.map.grid.w),
  salud: 100, sed: 100, cordura: 100, oxigeno: 8, muerto: false,
  inv: [], manos: [null, null], equipo: { cara: null, cuerpo: null, pies: null },
  _oxigenoEn: 0,
};
acuatica.jugadores.set(nadador.id, nadador);
const ahora = Date.now();
acuatica.tick(ahora);
acuatica.tick(ahora + 1100);
assert.equal(nadador.oxigeno, 0);
assert.ok(nadador.salud < 100, 'el servidor no aplica daño por ahogo');
const air = acuatica.map.airPockets[0];
nadador.x = air.x; nadador.y = air.y;
acuatica.tick(ahora + 2200);
assert.ok(nadador.oxigeno >= 28, 'el servidor no recupera oxígeno en el respiradero');
assert.ok(mensajes.some((msg) => msg.t === 'estado' && Number.isFinite(msg.oxigeno)));
console.log('PASS el MMO drena oxígeno en reposo y los respiraderos lo recuperan');
process.exit(0);
