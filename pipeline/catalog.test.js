'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const parsedAll = require('../data/parsed/levels.json');
const { isJokeLevel, playableLevels } = require('./level-policy');
const { BIOME_NAMES } = require('./biomes');
const parsed = playableLevels(parsedAll);
const levels = require('../data/game/levels.es.json');
const curated = require('../data/game/levels.curated.es.json');

global.window = global;
require('../game/js/engine/rng.js');
const RouteSeed = require('../game/js/engine/route-seed.js');
require('../game/js/mapgen/mapgen.js');
require('../game/js/systems/rules.js');

test('todo nivel parseado tiene una ficha jugable estable', () => {
  assert.equal(Object.keys(levels).length, Object.keys(parsed).length);
  assert.equal(Object.values(levels).filter((level) => !level.generado).length, Object.keys(curated).length);
  for (const [id, level] of Object.entries(levels)) {
    assert.equal(level.id, id, `${id}: id incoherente`);
    assert.ok(level.wikiTitle, `${id}: falta wikiTitle`);
    assert.ok(Array.isArray(level.tam) && level.tam.length === 2, `${id}: tam invalido`);
    assert.ok(level.paleta && level.bioma, `${id}: falta aspecto procedural`);
    assert.ok(new Set(BIOME_NAMES).has(level.bioma), `${id}: bioma desconocido`);
    assert.ok(Number.isFinite(level.oscuridad) && level.oscuridad >= 0 && level.oscuridad <= 1, `${id}: oscuridad invalida`);
    assert.ok(Number.isFinite(level.vision) && level.vision >= 2 && level.vision <= 12, `${id}: vision invalida`);
    for (const color of ['suelo', 'pared', 'detalle', 'luz', 'fondo'])
      assert.match(level.paleta[color], /^#[0-9a-f]{6}$/i, `${id}: color ${color} invalido`);
  }
  assert.equal(levels['level-7-77'].bioma, 'oceano', 'Level 7.77 debe conservar su entorno metropolitano sumergido');
  assert.ok(levels['level-7'].salidas.some((route) => route.destino === 'level-7-77'), 'Level 7 debe conectar con su subnivel 7.77');
});

test('las categorías ambientales explícitas de la wiki prevalecen sobre overrides antiguos', () => {
  const byTitle = new Map(Object.values(levels).map((level) => [level.wikiTitle, level]));
  for (const [title, source] of Object.entries(parsed)) {
    const level = byTitle.get(title);
    const categories = new Set(source.wikiCategories || []);
    if (categories.has('Darkness')) {
      assert.ok(level.oscuridad >= 0.72, `${level.id}: Darkness demasiado iluminado`);
      assert.ok(level.vision <= 5, `${level.id}: Darkness con visión excesiva`);
    }
    if (categories.has('Aquatic')) {
      assert.ok(['acuatico', 'oceano'].includes(level.bioma), `${level.id}: Aquatic usa ${level.bioma}`);
      assert.ok(level.reglas.includes('respiracion_acuatica'), `${level.id}: Aquatic sin respiración`);
    }
  }
});

test('Level 7 es un océano jugable con tierra seca y respiraderos', () => {
  const level = levels['level-7'];
  const map = MapGen.generate(level, RNG.create('audit-level-7-oceano'));
  const water = [...map.grid.t].filter((tile) => tile === MapGen.T.AGUA).length;
  assert.equal(level.bioma, 'oceano');
  assert.ok(water / map.grid.t.length > 0.55, 'Level 7 no está dominado por agua');
  assert.notEqual(MapGen.at(map.grid, map.spawn[0], map.spawn[1]), MapGen.T.AGUA, 'spawn bajo el agua');
  assert.ok(map.airPockets.length >= 12, 'faltan puntos de respiración para el tamaño del océano');
  for (const air of map.airPockets)
    assert.equal(MapGen.at(map.grid, air.x, air.y), MapGen.T.AGUA, 'respiradero fuera del agua');
});

test('el oxígeno baja bajo el agua, causa ahogo y se recupera en un respiradero', () => {
  const map = MapGen.generate(levels['level-7'], RNG.create('audit-oxigeno'));
  const pocket = map.airPockets[0];
  const agua = [...map.grid.t].findIndex((tile, index) => tile === MapGen.T.AGUA &&
    map.airPockets.every((air) => Math.hypot(air.x - index % map.grid.w, air.y - Math.floor(index / map.grid.w)) > 2));
  let damage = 0;
  const world = {
    level: { reglas: ['respiracion_acuatica'] }, map, turn: 0,
    player: { x: agua % map.grid.w, y: Math.floor(agua / map.grid.w), oxigeno: 100 },
    hurt: (amount) => { damage += amount; }, log: () => {},
  };
  Rules.aplicarEntrada(world);
  for (let i = 1; i <= 26; i++) { world.turn = i; Rules.aplicarTurno(world, RNG.create(`oxigeno-${i}`)); }
  assert.equal(world.player.oxigeno, 0);
  assert.ok(damage > 0, 'oxígeno a cero no causa daño');
  world.player.x = pocket.x; world.player.y = pocket.y;
  Rules.aplicarTurno(world, RNG.create('respiradero'));
  assert.ok(world.player.oxigeno >= 28, 'el respiradero no recupera oxígeno');
});

test('ciudad y residencial contienen edificios transitables, no bloques macizos', () => {
  for (const biome of ['ciudad', 'residencial']) {
    const map = MapGen.generate({
      id: `audit-${biome}`, bioma: biome, tam: [84, 64], salidas: [], objetos: [], entidades: [], reglas: [],
    }, RNG.create(`urban-audit::${biome}`));
    let interiors = 0;
    for (let y = 2; y < map.grid.h - 2; y++) for (let x = 2; x < map.grid.w - 2; x++) {
      if (MapGen.at(map.grid, x, y) !== MapGen.T.SUELO) continue;
      const paredes = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) =>
        MapGen.at(map.grid, x + dx, y + dy) === MapGen.T.PARED).length;
      if (paredes >= 2) interiors++;
    }
    assert.ok(interiors >= 8, `${biome}: no se reconocen interiores de edificios`);
    assert.ok(map.props.some((prop) => prop.id === 'portico'), `${biome}: edificios sin accesos visibles`);
  }
});

test('ningún nivel Joke entra en el catálogo jugable', () => {
  const jokes = Object.entries(parsedAll).filter(([title, level]) => isJokeLevel(title, level));
  assert.ok(jokes.length > 0, 'el snapshot debe contener páginas Joke para validar el filtro');
  for (const [title] of jokes)
    assert.ok(!Object.values(levels).some((level) => level.wikiTitle === title), `${title}: Joke incluido`);
});

test('todos los biomas declarados tienen generador y paleta funcional', () => {
  const { PALETTES } = require('./biomes');
  for (const biome of BIOME_NAMES) {
    assert.ok(PALETTES[biome], `${biome}: falta paleta`);
    const map = MapGen.generate({
      id: `audit-${biome}`, bioma: biome, tam: [72, 54], salidas: [], objetos: [], entidades: [], reglas: [],
    }, RNG.create(`biome-audit::${biome}`));
    assert.ok(MapGen.walkable(MapGen.at(map.grid, map.spawn[0], map.spawn[1])), `${biome}: generador sin spawn transitable`);
  }
});

test('ninguna salida catalogada queda sellada o apunta a una sala inexistente', () => {
  for (const [id, level] of Object.entries(levels)) {
    for (const route of level.salidas || []) {
      assert.notEqual(route.tipo, 'sellada', `${id}: salida sellada`);
      assert.ok(route.tipo !== 'escape' || !route.destino, `${id}: un escape no puede apuntar a ${route.destino}`);
      if (route.destino && !route.destino.startsWith('*'))
        assert.ok(levels[route.destino], `${id}: destino inexistente ${route.destino}`);
    }
  }
});

test('las rutas variables son estables durante toda la semilla', () => {
  const ids = Object.keys(levels).sort();
  for (const [id, level] of Object.entries(levels)) {
    for (const route of level.salidas.filter((item) => item.destino === '*aleatoria')) {
      const candidates = ids.filter((candidate) => candidate !== id);
      const first = RouteSeed.pick('backrooms-diaria::2026-07-11', id, route, candidates);
      const repeated = RouteSeed.pick('backrooms-diaria::2026-07-11', id, route, candidates);
      assert.equal(first, repeated, `${id}: ruta diaria inestable`);
      assert.ok(levels[first], `${id}: ruta diaria sin destino valido`);
      assert.notEqual(first, id, `${id}: ruta diaria vuelve al origen`);
    }
  }
});

test('el contenido procedural visible esta redactado en español', () => {
  const englishProse = /\b(through|will|from|with|into|rarely|without|wanderer|might|carried|staring|passing|similarly|buildings|affected|entering|exiting)\b/i;
  const englishClasses = /\b(Undetermined|Threat Index|Deadzone|Environmental|Custom Image|In Progress|Secure|Contested|Deteriorating)\b/i;
  for (const [id, level] of Object.entries(levels)) {
    if (level.generado) {
      assert.match(level.descripcion, / se manifiesta como /, `${id}: descripcion procedural sin traducir`);
      assert.doesNotMatch(level.clase, englishClasses, `${id}: clase sin traducir`);
    }
    assert.doesNotMatch(level.descripcion, englishProse, `${id}: descripcion con prosa inglesa`);
    for (const route of level.salidas || [])
      assert.doesNotMatch(route.texto, englishProse, `${id}: ruta con prosa inglesa`);
  }
});

test('todas las fichas pueden generar una sala transitable', () => {
  for (const [id, level] of Object.entries(levels)) {
    for (let sample = 0; sample < 3; sample++) {
      const map = MapGen.generate(level, RNG.create(`catalog-audit::${sample}::${id}`));
      assert.ok(map.grid.w > 0 && map.grid.h > 0, `${id}: mapa vacio`);
      assert.ok(MapGen.walkable(MapGen.at(map.grid, map.spawn[0], map.spawn[1])), `${id}: spawn bloqueado`);
      const distances = MapGen.bfsDist(map.grid, map.spawn[0], map.spawn[1]);
      for (const exit of map.exits) {
        assert.ok(exit.x >= 0 && exit.y >= 0 && exit.x < map.grid.w && exit.y < map.grid.h, `${id}: salida fuera del mapa`);
        assert.ok(distances[exit.y * map.grid.w + exit.x] >= 0, `${id}: salida inalcanzable`);
      }
    }
  }
});
