// Regresion: una caminata con un destino obsoleto no puede tumbar el MMO.
'use strict';

const { asignar } = require('./sala');

const fallos = [];
function ok(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) fallos.push(msg);
}

function jugador(token) {
  const mensajes = [];
  return {
    jug: {
      id: 1,
      token,
      muerto: false,
      distSala: 0,
      pasosSala: 0,
      ws: {
        readyState: 1,
        send(raw) { mensajes.push(JSON.parse(raw)); },
      },
    },
    mensajes,
  };
}

try {
  const obsoleta = asignar('level-305');
  const caminatasOriginales = obsoleta.map.caminatas;
  obsoleta.map.caminatas = [{ destino: 'nivel-que-ya-no-existe' }];
  const j1 = jugador('caminata-obsoleta');
  obsoleta.prepararCaminata(j1.jug);
  ok(j1.jug.caminataObjetivo === 0, 'las caminatas obsoletas no crean objetivo personal');

  let cruzoObsoleta = false;
  obsoleta.alCruzar = () => { cruzoObsoleta = true; };
  j1.jug.caminataObjetivo = 1; // simula un objetivo viejo o corrupto en vuelo
  obsoleta.caminataAvanza(j1.jug, 1);
  ok(!cruzoObsoleta, 'una caminata sin destino valido no llama a alCruzar');
  ok(j1.jug.caminataObjetivo === 0, 'el objetivo invalido se desactiva');
  ok(j1.mensajes.some((m) => m.t === 'aviso'), 'el jugador recibe aviso en vez de crash');
  obsoleta.map.caminatas = caminatasOriginales;

  const abierta = asignar('level-0');
  const j2 = jugador('caminata-valida');
  abierta.prepararCaminata(j2.jug);
  ok(j2.jug.caminataObjetivo > 0, 'una caminata valida conserva objetivo personal');

  let destino = null;
  abierta.alCruzar = (jug, sala, def) => { destino = def.destino; };
  j2.jug.caminataObjetivo = 1;
  abierta.caminataAvanza(j2.jug, 1);
  ok(destino === 'level-1', 'la caminata valida cruza al destino esperado');

  j2.jug.visitados = new Set(['level-0', 'level-1']);
  const visitada = abierta.resolverDestino(j2.jug, { destino: '*visitada', tipo: 'llave' });
  ok(visitada.destino === 'level-1', 'el servidor resuelve una ruta a nivel visitado');
  const aleatoria = abierta.resolverDestino(j2.jug, { destino: '*aleatoria', tipo: 'rara' });
  ok(aleatoria.destino !== 'level-0', 'el servidor resuelve una ruta aleatoria fuera del nivel actual');
} catch (e) {
  ok(false, e.stack || e.message);
}

if (fallos.length) {
  console.error('\nFallos:');
  for (const f of fallos) console.error(' - ' + f);
  process.exit(1);
}

process.exit(0);
