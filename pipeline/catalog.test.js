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
const Fisica = require('../game/js/sim/fisica.js');

test('todo nivel parseado tiene una ficha jugable estable', () => {
  const extras = Object.values(curated).filter((level) => level.externo);
  assert.equal(Object.keys(levels).length, Object.keys(parsed).length + extras.length);
  assert.equal(Object.values(levels).filter((level) => !level.generado).length, Object.keys(curated).length);
  for (const [id, level] of Object.entries(levels)) {
    assert.equal(level.id, id, `${id}: id incoherente`);
    assert.ok(level.wikiTitle, `${id}: falta wikiTitle`);
    assert.ok(Array.isArray(level.tam) && level.tam.length === 2, `${id}: tam invalido`);
    assert.ok(level.paleta && level.bioma, `${id}: falta aspecto procedural`);
    assert.ok(level.mapa?.topologia, `${id}: falta contrato de topologia`);
    assert.ok(['abierta', 'mixta', 'lineal', 'cerrada'].includes(level.mapa.apertura), `${id}: apertura invalida`);
    assert.ok(level.mapa.fuente, `${id}: falta procedencia del contrato`);
    assert.ok(new Set(BIOME_NAMES).has(level.bioma), `${id}: bioma desconocido`);
    assert.ok(Number.isFinite(level.oscuridad) && level.oscuridad >= 0 && level.oscuridad <= 1, `${id}: oscuridad invalida`);
    assert.ok(Number.isFinite(level.vision) && level.vision >= 2 && level.vision <= 12, `${id}: vision invalida`);
    for (const color of ['suelo', 'pared', 'detalle', 'luz', 'fondo'])
      assert.match(level.paleta[color], /^#[0-9a-f]{6}$/i, `${id}: color ${color} invalido`);
  }
  assert.equal(levels['level-7-77'].bioma, 'oceano', 'Level 7.77 debe conservar su entorno metropolitano sumergido');
  assert.ok(levels['level-7'].salidas.some((route) => route.destino === 'level-7-77'), 'Level 7 debe conectar con su subnivel 7.77');
});

test('los niveles prioritarios usan una topologia revisada contra la wiki', () => {
  assert.equal(levels['level-0'].mapa.topologia, 'laberinto_no_euclidiano');
  assert.equal(levels['level-0-01'].mapa.topologia, 'laberinto_longitudinal');
  assert.equal(levels['level-1'].mapa.topologia, 'garaje_infinito');
  assert.equal(levels['the-end'].mapa.topologia, 'biblioteca_abierta');
  for (const id of ['level-0', 'level-0-01', 'level-1', 'the-end']) {
    assert.equal(levels[id].mapa.fuente, 'wiki_prioritaria', `${id}: contrato sin revision prioritaria`);
    assert.equal(levels[id].mapa.soportada, true, `${id}: topologia sin generador`);
  }
});

test('el no-clip es una anomalía automática y no se confunde con una grieta', () => {
  const rutasNoclip = Object.values(levels).flatMap((level) => level.salidas || [])
    .filter((route) => /no.?clip/i.test(route.texto || ''));
  assert.ok(rutasNoclip.length > 500, `solo se encontraron ${rutasNoclip.length} rutas no-clip`);
  for (const route of rutasNoclip)
    assert.equal(MapGen.mecanicaDe(route), 'noclip', route.texto);

  assert.equal(MapGen.mecanicaDe({ texto: 'Romper una pared y atravesarla hacia otro nivel' }), 'romper');
  assert.equal(MapGen.mecanicaDe({ texto: 'Romper el suelo y caer a otro nivel' }), 'romper_suelo');

  const theEnd = MapGen.generate(levels['the-end'], RNG.create('audit-the-end-noclip'));
  const anomalía = theEnd.exits.find((exit) => /no.?clip/i.test(exit.def.texto || ''));
  assert.ok(anomalía, 'The End no materializa su zona de no-clip');
  assert.equal(anomalía.def._mec, 'noclip');
});

test('zoo, piscinas y complejos suspendidos conservan plantas distintas', () => {
  const zoo = MapGen.generate(levels['level-359'], RNG.create('audit-level-359-zoo'));
  assert.equal(levels['level-359'].mapa.topologia, 'zoologico');
  assert.ok(zoo.grid._zoologico?.recintos >= 4, 'Level 359 no tiene recintos visitables');
  assert.ok(Math.abs(zoo.spawn[0] - zoo.grid._zoologico.cx) <= 2 ||
    Math.abs(zoo.spawn[1] - zoo.grid._zoologico.cy) <= 2, 'Level 359 no empieza en un sendero principal');
  assert.ok([...zoo.grid.t].some((tile) => tile === MapGen.T.AGUA), 'Level 359 no tiene recintos acuaticos');
  assert.ok(zoo.props.some((prop) => ['cartel_zoo', 'carrito_zoo', 'tanque_acuatico'].includes(prop.id)),
    'Level 359 carece de mobiliario propio del zoo');

  const pools = MapGen.generate(levels['level-37-2'], RNG.create('audit-level-37-2-pools'));
  assert.equal(levels['level-37-2'].mapa.topologia, 'instalacion_inundada');
  assert.ok([...pools.grid.t].filter((tile) => tile === MapGen.T.AGUA).length > pools.grid.t.length * 0.55,
    'Level 37.2 no esta dominado por agua somera');
  assert.ok(pools.grid._piscinas?.camaras >= 5, 'Level 37.2 no tiene camaras de piscina diferenciadas');
  assert.ok(levels['level-37-2'].oscuridad < 0.3 && levels['level-37-2'].vision >= 8,
    'Sunlit Pools sigue representado como un nivel oscuro');

  for (const id of ['level-410', 'level-919']) {
    const map = MapGen.generate(levels[id], RNG.create(`audit-${id}-pasarelas`));
    assert.equal(levels[id].mapa.topologia, 'plataformas');
    assert.ok(map.grid._pasarelas?.nodos >= 6, `${id}: faltan pabellones conectados`);
    assert.ok([...map.grid.t].filter((tile) => tile === MapGen.T.VACIO).length > map.grid.t.length * 0.45,
      `${id}: las pasarelas ya no estan suspendidas`);
  }
});

test('Level 0.01 The Exit progresa por corredores largos y se deteriora con la distancia', () => {
  const level = levels['level-0-01'];
  const map = MapGen.generate(level, RNG.create('audit-level-0-01-exit'));
  assert.equal(level.generado, false);
  assert.equal(level.mapa.apertura, 'lineal');
  assert.ok(level.infinito);
  assert.ok(level.reglas.includes('deterioro_longitudinal'));
  assert.equal(map.entitySpawns.length, 0);
  assert.ok(map.grid._longitudinal?.bandas >= 4, 'faltan corredores longitudinales paralelos');
  assert.ok(map.grid._longitudinal?.deterioradas > 0, 'el extremo lejano no muestra daños');
  assert.ok(map.props.filter((prop) => prop.id === 'salida_falsa').length >= 7, 'faltan falsas salidas');
  let longest = 0;
  for (let y = 0; y < map.grid.h; y++) {
    let run = 0;
    for (let x = 0; x < map.grid.w; x++) {
      run = MapGen.walkable(MapGen.at(map.grid, x, y)) ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  assert.ok(longest > map.grid.w * 0.8, 'The Exit vuelve a comportarse como un laberinto celular');
  const world = {
    level, map, turn: 1, pasosNivel: Math.floor(level.deterioroPasos * 0.82), visionMod: -2,
    player: { x: map.spawn[0], y: map.spawn[1] },
    equipado: () => false, tienePasivo: () => false,
    sanity: () => {}, thirst: () => {}, hurt: () => {}, log: () => {}, hacerRuido: () => {},
  };
  Rules.aplicarEntrada(world);
  Rules.aplicarTurno(world, RNG.create('deterioro-exit'));
  assert.ok(world._deterioroNivel > 0.8, 'la distancia recorrida no incrementa el deterioro');
  assert.ok(world.visionMod <= -2, 'la niebla no empeora con la distancia');
});

test('Level 1 es un garaje abierto con charcos y coches fisicos muy escasos', () => {
  const level = levels['level-1'];
  const map = MapGen.generate(level, RNG.create('audit-level-1-garaje'));
  const tiles = [...map.grid.t];
  const cars = map.props.filter((prop) => prop.id === 'coche');
  assert.equal(level.bioma, 'garaje');
  assert.equal(level.mapa.topologia, 'garaje_infinito');
  assert.ok(level.reglas.includes('apagones'));
  assert.ok(level.reglas.includes('niebla'));
  assert.ok(map.grid._garaje?.charcos >= 5, 'faltan charcos que originan la niebla');
  assert.ok(cars.length >= 1 && cars.length <= 3, 'los coches deben existir pero ser muy raros');
  assert.equal(tiles.filter((tile) => tile === MapGen.T.OBSTACULO).length, cars.length * 2,
    'cada coche debe ocupar dos casillas fisicas');
  for (const car of cars) {
    assert.equal(Fisica.transitable(map.grid, car.x, car.y), false, 'se puede atravesar un coche');
    assert.equal(Fisica.transitable(map.grid, car.x + 1, car.y), false, 'el volumen del coche ocupa una sola casilla');
  }
  const puddle = tiles.indexOf(MapGen.T.CHARCO);
  assert.ok(puddle >= 0 && Fisica.factorTerreno(map.grid, puddle % map.grid.w, Math.floor(puddle / map.grid.w)) < 1,
    'los charcos no afectan al movimiento');
});

test('las arquitecturas reconocidas en la wiki usan plantas propias y mobiliario fisico', () => {
  const semantic = Object.values(levels).filter((level) => level.mapa.fuente === 'wiki_inferida');
  assert.ok(semantic.length >= 35, 'se estan desaprovechando demasiadas descripciones arquitectonicas');
  const bespoke = new Set(['hotel_atrio', 'aguas_someras', 'viviendas_conectadas', 'sotanos_conectados', 'recinto_deportivo',
    'castillo', 'cuevas', 'sala_columnada', 'parque_recreativo', 'cementerio', 'galerias_comerciales', 'prision', 'templo',
    'aeropuerto', 'estadio', 'teatro', 'museo', 'bunker', 'almacen', 'restaurante', 'planta_estudio',
    'banos_publicos', 'aeronave', 'corredor_longitudinal', 'sala_unica']);
  for (const level of semantic) {
    const map = MapGen.generate(level, RNG.create(`arquitectura-audit::${level.id}`));
    if (level.mapa.topologia === 'biblioteca_abierta') {
      assert.ok(map.grid._biblioteca, `${level.id}: biblioteca sin planta abierta`);
      continue;
    }
    if (!bespoke.has(level.mapa.topologia)) continue;
    assert.equal(map.grid._arquitectura?.tipo, level.mapa.topologia,
      `${level.id}: ${level.mapa.topologia} ha recaido en un generador generico`);
    const structuralIds = new Set(['asiento_terminal', 'grada', 'butaca', 'banco', 'altar', 'vitrina', 'palet',
      'mesa', 'encimera', 'cama', 'marcador', 'mostrador', 'maquina_arcade', 'lapida',
      'camara_estudio', 'foco_estudio', 'lavabo']);
    for (const prop of map.props.filter((item) => structuralIds.has(item.id)))
      assert.equal(Fisica.transitable(map.grid, prop.x, prop.y), false,
        `${level.id}: mobiliario ${prop.id} sin colision`);
  }
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

test('The End es una biblioteca abierta y no otro laberinto de oficinas', () => {
  const level = levels['the-end'];
  const map = MapGen.generate(level, RNG.create('audit-the-end-biblioteca'));
  const tiles = [...map.grid.t];
  const walkable = tiles.filter(MapGen.walkable).length;
  let openFiveByFive = 0;
  for (let y = 2; y < map.grid.h - 2; y++) for (let x = 2; x < map.grid.w - 2; x++) {
    let open = true;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      if (!MapGen.walkable(MapGen.at(map.grid, x + dx, y + dy))) open = false;
    if (open) openFiveByFive++;
  }

  assert.equal(level.bioma, 'biblioteca');
  assert.equal(level.generado, false, 'The End debe conservar su ficha artesanal');
  assert.ok(level.infinito, 'The End debe declararse infinito');
  assert.equal(level.estilo.pared, 'libreria_comercial', 'faltan paredes de librería comercial');
  assert.equal(level.estilo.suelo, 'moqueta', 'The End debe usar moqueta, no baldosas oscuras');
  assert.ok(level.reglas.includes('luces_inestables'));
  assert.ok(level.reglas.includes('no_euclidiano'));
  assert.ok(walkable / tiles.length > 0.84, 'la librería tiene demasiado obstáculo y deja de ser una tienda abierta');
  assert.ok(openFiveByFive > 500, 'faltan salas abiertas de al menos 5×5');
  assert.ok(map.grid._biblioteca?.corridorWidth >= 9, 'los pasillos comerciales son demasiado estrechos');
  assert.equal(map.grid._biblioteca?.readingHalls.length, 2, 'faltan salas de lectura despejadas');
  assert.ok(map.grid._biblioteca?.shelfTiles >= 500, 'faltan hileras físicas de estanterías');
  assert.ok(map.grid._biblioteca?.checkout.w >= 19, 'falta el gran mostrador frontal');
  assert.ok(map.grid._biblioteca?.columns >= 10, 'faltan pilares de la tienda');
  assert.equal(map.grid._biblioteca?.signs, 2, 'faltan los dos rótulos icónicos');
  assert.equal(tiles.filter((tile) => tile === MapGen.T.ESTANTERIA).length,
    map.grid._biblioteca?.shelfTiles, 'las estanterías declaradas no son geometría física');
  assert.ok(map.spawn[1] >= map.grid.h - 10, 'el jugador no aparece frente a la caja');
  assert.ok(map.props.filter((prop) => prop.id === 'mostrador').length >= 20, 'el mostrador no tiene cuerpo físico');
  assert.ok(map.props.filter((prop) => prop.id === 'mesa_expositora').length >= 4, 'faltan mesas de novedades');
  assert.ok(map.props.some((prop) => prop.id === 'cartel_the_end'), 'falta el rótulo THE END');
  assert.ok(map.props.some((prop) => prop.id === 'cartel_the_end_near'), 'falta el rótulo THE END IS NEAR');
  assert.ok(map.props.filter((prop) => prop.id === 'libros_caidos').length >= 18, 'faltan libros caídos');
  assert.ok(tiles.filter((tile) => tile === MapGen.T.LIBROS).length >= 18, 'los libros no afectan al terreno');
  assert.ok(map.props.filter((prop) => prop.id === 'ordenador').length >= 2, 'faltan ordenadores antiguos');
  assert.equal(map.entitySpawns.length, 0, 'The End debe estar desprovisto de vida');
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
