// BACKROOMS MMO — estáticos del juego + WebSocket de salas.
// Uso: node server/server.js [puerto]  (por defecto 8080)
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const P = require('./protocolo');
const filtro = require('./filtro');
const { asignar, asignarPartida, salaParaConexion, estado, limpiarVacias } = require('./sala');
const { DATA } = require('./sim/mundo');

const PUERTO = parseInt(process.argv[2] || process.env.PORT, 10) || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const RAIZ = path.join(__dirname, '..', 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const servidor = http.createServer((req, res) => {
  if (req.url === '/estado') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(estado()));
    return;
  }
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const ruta = path.normalize(path.join(RAIZ, url === '/' ? 'index.html' : url));
  if (!ruta.startsWith(RAIZ)) { res.writeHead(403); res.end(); return; }
  fs.readFile(ruta, (err, datos) => {
    if (err) { res.writeHead(404); res.end('no existe'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(ruta).toLowerCase()] || 'application/octet-stream' });
    res.end(datos);
  });
});

const wss = new WebSocketServer({ server: servidor, path: '/ws' });
const porIp = new Map();

function etiquetaSala(sala) {
  return sala.tipo === 'privada'
    ? `privada:***:${sala.nivelId}:${sala.inst}`
    : sala.clave;
}

function ipReal(req) {
  const directa = req.socket.remoteAddress || '?';
  const reenviada = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    directa,
    ip: reenviada || directa,
    esLocal: directa === '127.0.0.1' || directa === '::1' || directa === '::ffff:127.0.0.1',
    reenviada,
  };
}

function debugTeleport(jug, salaActual, nivelId) {
  if (!DATA.levels[nivelId]) {
    salaActual.enviar(jug.ws, { t: 'error', txt: `Nivel desconocido: ${nivelId}` });
    return salaActual;
  }
  const r = asignarPartida({
    tipo: salaActual.tipo,
    codigo: salaActual.codigo,
    nivelId,
  });
  if (r.error) {
    salaActual.enviar(jug.ws, { t: 'error', txt: r.error });
    return salaActual;
  }
  salaActual.salir(jug);
  const nueva = r.sala;
  nueva.entrarEnPartida(jug);
  nueva.enviar(jug.ws, { t: 'aviso', txt: `Debug TP servidor: ${nueva.def?.nombre || nivelId}` });
  console.log(`[tp] ${jug.nombre}#${jug.id} ${etiquetaSala(salaActual)} → ${etiquetaSala(nueva)}`);
  return nueva;
}

function hashDeterminista(txt) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function resolverDestinoSalida(sala, salida, indice) {
  const def = salida?.def || {};
  if (def.tipo === 'sellada') return { error: 'Ese camino aún no está cartografiado.' };
  if (def.tipo === 'escape') return { error: 'La salida a la realidad aún no está disponible en online.' };
  if (def.tipo === 'void') return { error: 'El Vacío no devuelve nada. Esta ruta queda bloqueada en online por ahora.' };
  let destino = def.destino;
  if (!destino) return { error: 'Esta salida no tiene destino jugable.' };
  if (destino === '*visitada') return { error: 'Esta salida depende del historial personal y aún no está disponible en online.' };
  if (destino === '*aleatoria') {
    const ids = Object.keys(DATA.levels).filter((id) => id !== sala.nivelId);
    destino = ids[hashDeterminista(`${sala.semilla}::salida::${indice}`) % ids.length];
  }
  if (!DATA.levels[destino]) return { error: `Nivel no jugable todavía: ${destino}` };
  return { destino };
}

function cruzarSalida(jug, salaActual, indice) {
  const s = salaActual.salidaPorIndice(indice);
  if (!s) {
    salaActual.enviar(jug.ws, { t: 'error', txt: 'Esa salida no existe en esta sala.' });
    return salaActual;
  }
  if (!salaActual.jugadorSobreSalida(jug, s.ex)) {
    salaActual.enviar(jug.ws, { t: 'mueve', id: jug.id, x: jug.x, y: jug.y });
    salaActual.enviar(jug.ws, { t: 'aviso', txt: 'La salida ya no está bajo tus pies.' });
    return salaActual;
  }
  const def = s.ex.def || {};
  if ((def._mec === 'romper' || def._mec === 'romper_suelo') && !salaActual.salidasAbiertas.has(s.i)) {
    salaActual.abrirSalida(jug, s.i);
    salaActual.enviar(jug.ws, { t: 'aviso', txt: 'La salida queda abierta. Vuelve a cruzarla si te atreves.' });
    return salaActual;
  }
  salaActual.abrirSalida(jug, s.i);
  const rDestino = resolverDestinoSalida(salaActual, s.ex, s.i);
  if (rDestino.error) {
    salaActual.enviar(jug.ws, { t: 'aviso', txt: rDestino.error });
    return salaActual;
  }
  const rSala = salaParaConexion(salaActual, s.i, rDestino.destino);
  if (rSala.error) {
    salaActual.enviar(jug.ws, { t: 'error', txt: rSala.error });
    return salaActual;
  }
  salaActual.salir(jug);
  const nueva = rSala.sala;
  nueva.entrarEnPartida(jug, {
    desdeNivel: salaActual.nivelId,
    desdeInst: salaActual.inst,
    desdeSalida: s.i,
    texto: def.texto || '',
  });
  nueva.enviar(jug.ws, { t: 'aviso', txt: `Has cruzado hacia ${nueva.def?.wikiTitle || rDestino.destino}.` });
  console.log(`[salida] ${jug.nombre}#${jug.id} ${etiquetaSala(salaActual)}:${s.i} → ${etiquetaSala(nueva)}`);
  return nueva;
}

wss.on('connection', (ws, req) => {
  const { ip, esLocal, reenviada } = ipReal(req);
  const n = (porIp.get(ip) || 0) + 1;
  if (n > P.CAP_POR_IP && !(esLocal && !reenviada)) {
    ws.close(1008, 'demasiadas conexiones desde la misma IP');
    return;
  }
  porIp.set(ip, n);

  let jug = null, sala = null;
  ws.vivo = true;
  ws.on('pong', () => { ws.vivo = true; });

  const timbre = setTimeout(() => { if (!jug) ws.close(1008, 'sin hola'); }, 5000);

  ws.on('message', (raw) => {
    const m = P.leer(raw);
    if (!m) return;
    if (m.t === 'hola') {
      if (jug) return;
      clearTimeout(timbre);
      const r = asignar({ tipo: m.tipo, codigo: m.codigo, nivelId: m.nivel });
      if (r.error) {
        ws.send(JSON.stringify({ t: 'error', txt: r.error }));
        ws.close(1013, r.error);
        return;
      }
      sala = r.sala;
      jug = sala.entrar(ws, filtro.nombreLimpio(m.nombre), m.token);
      console.log(`[+] ${jug.nombre}#${jug.id} → ${etiquetaSala(sala)} (${sala.jugadores.size}/${sala.max})`);
      return;
    }
    if (!jug || !sala) return;
    if (m.t === 'mover') sala.mover(jug, m.dx, m.dy);
    else if (m.t === 'rot') sala.girar(jug, m.rot);
    else if (m.t === 'listo') sala.listo(jug, m.listo);
    else if (m.t === 'abrir_salida') sala.abrirSalida(jug, m.i);
    else if (m.t === 'cruzar_salida') sala = cruzarSalida(jug, sala, m.i);
    else if (m.t === 'debug_tp') sala = debugTeleport(jug, sala, m.nivel);
    else if (m.t === 'voz') sala.voz(jug, m);
    else if (m.t === 'chat') {
      const txt = filtro.chatLimpio(m.txt);
      if (txt) sala.chat(jug, txt);
    } else if (m.t === 'ping') sala.enviar(ws, { t: 'pong' });
  });

  ws.on('close', () => {
    porIp.set(ip, (porIp.get(ip) || 1) - 1);
    if (porIp.get(ip) <= 0) porIp.delete(ip);
    clearTimeout(timbre);
    if (jug && sala) {
      sala.salir(jug);
      console.log(`[-] ${jug.nombre}#${jug.id} ← ${etiquetaSala(sala)} (${sala.jugadores.size}/${sala.max})`);
    }
  });
  ws.on('error', () => {});
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.vivo) { ws.terminate(); continue; }
    ws.vivo = false;
    try { ws.ping(); } catch (e) {}
  }
  limpiarVacias();
}, 30000);

servidor.listen(PUERTO, HOST, () => {
  console.log(`BACKROOMS MMO en http://${HOST}:${PUERTO}  (ws en /ws)`);
  console.log('Pública:  /');
  console.log('Privada:  /?sala=privada&codigo=TU-CODIGO');
});
