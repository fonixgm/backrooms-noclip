// Protocolo v2 de BACKROOMS MMO — JSON pequeño sobre WebSocket.
// M1 online: salas, movimiento autoritativo y chat. El mapa nunca viaja:
// servidor y cliente lo generan con la misma semilla.
'use strict';

const VERSION = 2;
const MAX_MSG = 65536;       // WebRTC SDP/ICE para voz puede ser grande.
const MAX_CHAT = 120;
const COOLDOWN_MOVER = 165;
const COOLDOWN_CHAT = 1500;
const CAP_PUBLICA = 36;       // 100 jugadores => 3 instancias aprox.; Level 0 no debe parecer una plaza.
const CAP_PRIVADA = 12;       // grupo pequeño: mantiene tensión y legibilidad.
const CAP_POR_IP = 8;

function limpiaCodigo(v) {
  return String(v || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 24);
}

function limpiaNivel(v) {
  const s = String(v || 'level-0').trim().toLowerCase();
  return /^level-[a-z0-9-]+$/.test(s) ? s : 'level-0';
}

function salaDe(m) {
  const rawTipo = String(m.sala || m.tipoSala || '').toLowerCase();
  const privada = rawTipo === 'privada' || rawTipo === 'private' || m.privada === true;
  if (!privada) return { tipo: 'publica', codigo: '' };
  return { tipo: 'privada', codigo: limpiaCodigo(m.codigo || m.room || m.salaCodigo) || 'ERRANTES' };
}

function leer(raw) {
  if (typeof raw !== 'string' && !Buffer.isBuffer(raw)) return null;
  if (raw.length > MAX_MSG) return null;
  let m;
  try { m = JSON.parse(raw.toString('utf8')); } catch (e) { return null; }
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return null;

  switch (m.t) {
    case 'hola':
      if (typeof m.nombre !== 'string' || typeof m.token !== 'string') return null;
      if (m.token.length > 64) return null;
      return {
        t: 'hola',
        nombre: m.nombre,
        token: m.token,
        v: m.v | 0,
        nivel: limpiaNivel(m.nivel),
        ...salaDe(m),
      };
    case 'mover': {
      const dx = m.dx | 0, dy = m.dy | 0;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
      return { t: 'mover', dx, dy };
    }
    case 'rot': {
      const rot = m.rot | 0;
      if (rot < 0 || rot > 3) return null;
      return { t: 'rot', rot };
    }
    case 'chat':
      if (typeof m.txt !== 'string') return null;
      return { t: 'chat', txt: m.txt.slice(0, MAX_CHAT) };
    case 'listo':
      return { t: 'listo', listo: m.listo !== false };
    case 'abrir_salida': {
      const i = m.i | 0;
      if (i < 0 || i > 999) return null;
      return { t: 'abrir_salida', i };
    }
    case 'cruzar_salida': {
      const i = m.i | 0;
      if (i < 0 || i > 999) return null;
      return { t: 'cruzar_salida', i };
    }
    case 'debug_tp':
      return { t: 'debug_tp', nivel: limpiaNivel(m.nivel || m.id) };
    case 'voz': {
      const to = m.to | 0;
      const kind = String(m.kind || '').slice(0, 16);
      if (!to || !['offer', 'answer', 'ice'].includes(kind)) return null;
      const data = m.data;
      if (typeof data !== 'object' || data === null) return null;
      return { t: 'voz', to, kind, data };
    }
    case 'ping':
      return { t: 'ping' };
    default:
      return null;
  }
}

module.exports = {
  VERSION, MAX_MSG, MAX_CHAT, COOLDOWN_MOVER, COOLDOWN_CHAT,
  CAP_PUBLICA, CAP_PRIVADA, CAP_POR_IP,
  leer, limpiaCodigo,
};
