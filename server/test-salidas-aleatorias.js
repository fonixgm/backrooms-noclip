// Regresión del issue #28: las salidas con destino "*aleatoria" deben
// resolverse en el servidor antes de cambiar de sala.
'use strict';

const { DATA } = require('./sim/mundo');
const { Sala } = require('./sala');

const fallos = [];
function ok(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) fallos.push(msg);
}

function cruzarLevel27(inst) {
  const sala = new Sala('level-27', inst);
  const salida = sala.map.exits.find((e) => e.def.destino === '*aleatoria');
  ok(!!salida, 'Level 27 genera su puerta de destino aleatorio');
  if (!salida) return { sala, salida: null, resuelta: null };

  const avisos = [];
  const jug = {
    x: salida.x,
    y: salida.y,
    muerto: false,
    ws: { readyState: 1, send: (raw) => avisos.push(JSON.parse(raw)) },
  };
  let resuelta = null;
  sala.alCruzar = (_jug, _sala, def) => { resuelta = def; };
  sala.cruzar(jug, true);
  return { sala, salida, resuelta, avisos };
}

const a = cruzarLevel27(2801);
ok(!!a.resuelta, 'la salida aleatoria llega al manejador de cambio de sala');
if (a.resuelta) {
  ok(!!DATA.levels[a.resuelta.destino], `el destino ${a.resuelta.destino} existe en el piloto`);
  ok(a.resuelta.destino !== 'level-27', 'el destino no devuelve al mismo nivel');
  ok(a.resuelta._destinoResuelto === a.resuelta.destino, 'el destino resuelto queda registrado en la copia');
}
ok(a.salida && a.salida.def.destino === '*aleatoria', 'la definición compartida de la puerta no se modifica');
ok(!a.avisos.some((m) => /no lleva a ninguna parte/.test(m.txt || '')), 'no se muestra el aviso de nivel fuera del piloto');

const b = cruzarLevel27(2801);
ok(a.resuelta && b.resuelta && a.resuelta.destino === b.resuelta.destino,
  'la misma semilla de sala produce el mismo destino');

// No basta con el caso histórico de Level 27: recorre todas las definiciones
// variables del catálogo que consume el servidor online.
const variables = [];
for (const [nivelId, level] of Object.entries(DATA.levels)) {
  for (const def of level.salidas || []) {
    if (def.destino === '*aleatoria') variables.push({ nivelId, def });
  }
}
ok(variables.length > 0, `el catálogo contiene rutas aleatorias (${variables.length})`);
for (const { nivelId, def } of variables) {
  const sala = new Sala(nivelId, `audit-random-${nivelId}`);
  const original = def.destino;
  const primera = sala.resolverDestino({ visitados: new Set([nivelId]) }, def);
  const repetida = sala.resolverDestino({ visitados: new Set([nivelId]) }, def);
  ok(!!primera && !!DATA.levels[primera.destino] && primera.destino !== nivelId,
    `${nivelId}: *aleatoria resuelve a otro nivel real (${primera?.destino || 'ninguno'})`);
  ok(primera?.destino === repetida?.destino,
    `${nivelId}: la resolución online es determinista durante el día`);
  ok(def.destino === original, `${nivelId}: resolver no muta la ruta catalogada`);
}

console.log(fallos.length ? `\n✗ ${fallos.length} fallos` : '\n✓ TODO OK');
process.exit(fallos.length ? 1 : 0);
