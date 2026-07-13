'use strict';

// Regresión unitaria de la semántica online: una anomalía no-clip se activa por
// proximidad y nunca se convierte en una oferta/modal. Las puertas sí preguntan.
const { Sala } = require('./sala');

const fallos = [];
function ok(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) fallos.push(msg);
}

function jugadorEn(exit) {
  const mensajes = [];
  return {
    mensajes,
    jug: {
      id: 'audit-noclip', x: exit.x, y: exit.y, muerto: false,
      ofertaEn: null, visitados: new Set(['the-end']),
      inv: [], manos: [null, null], equipo: {},
      ws: { readyState: 1, send: (raw) => mensajes.push(JSON.parse(raw)) },
    },
  };
}

const sala = new Sala('the-end', 'audit-noclip');
const anomalía = sala.map.exits.find((exit) => exit.def._mec === 'noclip');
const puerta = sala.map.exits.find((exit) => !exit.def._mec && /puerta/i.test(exit.def.texto || ''));
ok(!!anomalía, 'The End genera una zona no-clip diferenciada');
ok(!!puerta, 'The End conserva una puerta normal diferenciada');

if (anomalía) {
  const { jug, mensajes } = jugadorEn(anomalía);
  let cruce = null;
  sala.alCruzar = (_jug, _sala, def, opts) => { cruce = { def, opts }; };
  const cambióSala = sala.proximidad(jug);
  ok(cambióSala === true, 'pisar la anomalía detiene el procesamiento de la sala anterior');
  ok(!!cruce, 'pisar la anomalía cruza automáticamente');
  ok(!mensajes.some((m) => m.t === 'oferta'), 'la anomalía no envía oferta de cruce');
  ok(cruce?.opts?.sinTarjeta === true, 'el cruce no muestra tarjeta intermedia');
  ok(cruce?.opts?.sinRetorno === true, 'el cruce no crea una puerta de retorno');
  ok(cruce?.opts?.silencioso === true, 'el cruce no explica la ruta mediante un diálogo');
}

if (puerta) {
  const { jug, mensajes } = jugadorEn(puerta);
  sala.alCruzar = () => { throw new Error('una puerta no debe cruzarse automáticamente'); };
  const cambióSala = sala.proximidad(jug);
  ok(cambióSala === false, 'acercarse a una puerta normal no cambia de sala');
  ok(mensajes.some((m) => m.t === 'oferta'), 'la puerta normal conserva su oferta de cruce');
}

console.log(fallos.length ? `\n✗ ${fallos.length} fallos` : '\n✓ TODO OK');
process.exit(fallos.length ? 1 : 0);
