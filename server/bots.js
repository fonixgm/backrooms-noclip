// Enjambre de bots para probar BACKROOMS MMO.
<<<<<<< Updated upstream
// Uso: node server/bots.js [n] [url]   → node server/bots.js 50 ws://localhost:8080/ws
// Cada bot camina al azar (respetando el cooldown) y suelta frases de vez en cuando.
=======
// Uso:
//   node server/bots.js 50 ws://localhost:8080/ws publica
//   node server/bots.js 12 ws://localhost:8080/ws privada TEST
>>>>>>> Stashed changes
'use strict';

const WebSocket = require('ws');

const N = parseInt(process.argv[2], 10) || 50;
const URL = process.argv[3] || 'ws://localhost:8080/ws';
<<<<<<< Updated upstream
const NIVEL = process.argv[4] || undefined; // p. ej. level-1 (prueba de entidades)
=======
const SALA = process.argv[4] || 'publica';
const CODIGO = process.argv[5] || 'TEST';
>>>>>>> Stashed changes
const FRASES = [
  'hola?', '¿alguien más oye el zumbido?', 'por aquí hay una grieta',
  'seguidme', 'me pierdo', 'este pasillo no estaba antes', 'corred',
  'llevo horas caminando', 'qué es ESO', 'las luces parpadean',
];

<<<<<<< Updated upstream
let conectados = 0, movidos = 0, chats = 0, cruces = 0;
=======
let conectados = 0, movidos = 0, chats = 0, cerrados = 0;
>>>>>>> Stashed changes

function bot(i) {
  const ws = new WebSocket(URL);
  ws.on('open', () => {
    conectados++;
<<<<<<< Updated upstream
    ws.send(JSON.stringify({ t: 'hola', nombre: `Bot-${i}`, token: `bot-${i}`, v: 2, nivel: NIVEL }));
    // v22: los bots cambian de RUMBO (vector continuo) en vez de dar pasos
    const rumbo = setInterval(() => {
      if (ws.readyState !== 1) { clearInterval(rumbo); return; }
      const quieto = Math.random() < 0.15;
      const ang = Math.random() * Math.PI * 2;
      ws.send(JSON.stringify({
        t: 'input',
        dx: quieto ? 0 : Math.sin(ang),
        dy: quieto ? 0 : -Math.cos(ang),
      }));
      if (!quieto) ws.send(JSON.stringify({ t: 'rot', th: ang }));
      movidos++;
      if (Math.random() < 0.08) {
        ws.send(JSON.stringify({ t: 'chat', txt: FRASES[Math.floor(Math.random() * FRASES.length)] }));
        chats++;
      }
    }, 600 + Math.random() * 900);
  });
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    // a veces cruzan la salida que pisan: prueba el cambio de sala en caliente
    if (m.t === 'oferta') {
      setTimeout(() => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'cruzar', si: Math.random() < 0.3 }));
      }, 300);
      cruces++;
    }
    if (m.t === 'aviso' && /ESPACIO/.test(m.txt) && Math.random() < 0.5) {
      ws.send(JSON.stringify({ t: 'accion' })); // intenta romper la grieta
    }
  });
  ws.on('error', (e) => console.error(`bot ${i}:`, e.message));
  ws.on('close', () => { conectados--; });
=======
    ws.send(JSON.stringify({
      t: 'hola',
      nombre: `Bot-${i}`,
      token: `bot-${SALA}-${CODIGO}-${i}`,
      v: 2,
      sala: SALA,
      codigo: CODIGO,
    }));
    const paso = setInterval(() => {
      if (ws.readyState !== 1) { clearInterval(paso); return; }
      const dir = [[0, -1], [0, 1], [-1, 0], [1, 0]][Math.floor(Math.random() * 4)];
      ws.send(JSON.stringify({ t: 'mover', dx: dir[0], dy: dir[1] }));
      movidos++;
      if (Math.random() < 0.02) {
        ws.send(JSON.stringify({ t: 'chat', txt: FRASES[Math.floor(Math.random() * FRASES.length)] }));
        chats++;
      }
    }, 170 + Math.random() * 160);
  });
  ws.on('error', (e) => console.error(`bot ${i}:`, e.message));
  ws.on('close', () => { conectados--; cerrados++; });
>>>>>>> Stashed changes
}

for (let i = 1; i <= N; i++) setTimeout(() => bot(i), i * 25);

setInterval(() => {
<<<<<<< Updated upstream
  console.log(`bots: ${conectados}/${N} conectados · ${movidos} pasos · ${chats} chats`);
=======
  console.log(`bots: ${conectados}/${N} conectados · ${movidos} pasos · ${chats} chats · ${cerrados} cierres`);
>>>>>>> Stashed changes
  movidos = 0; chats = 0;
}, 5000);
