// Enjambre de bots para probar BACKROOMS MMO.
// Uso:
//   node server/bots.js 50 ws://localhost:8080/ws publica
//   node server/bots.js 12 ws://localhost:8080/ws privada TEST
'use strict';

const WebSocket = require('ws');

const N = parseInt(process.argv[2], 10) || 50;
const URL = process.argv[3] || 'ws://localhost:8080/ws';
const SALA = process.argv[4] || 'publica';
const CODIGO = process.argv[5] || 'TEST';
const FRASES = [
  'hola?', '¿alguien más oye el zumbido?', 'por aquí hay una grieta',
  'seguidme', 'me pierdo', 'este pasillo no estaba antes', 'corred',
  'llevo horas caminando', 'qué es ESO', 'las luces parpadean',
];

let conectados = 0, movidos = 0, chats = 0, cerrados = 0;

function bot(i) {
  const ws = new WebSocket(URL);
  ws.on('open', () => {
    conectados++;
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
}

for (let i = 1; i <= N; i++) setTimeout(() => bot(i), i * 25);

setInterval(() => {
  console.log(`bots: ${conectados}/${N} conectados · ${movidos} pasos · ${chats} chats · ${cerrados} cierres`);
  movidos = 0; chats = 0;
}, 5000);
