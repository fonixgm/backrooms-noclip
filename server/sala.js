// Salas MMO: públicas por instancias y privadas por código.
// Una sala es autoritativa para posición/chat de sus jugadores.
'use strict';

const crypto = require('crypto');
const { generarMapa, esTransitable } = require('./sim/mundo');
const P = require('./protocolo');

let siguienteId = 1;
const salas = new Map();
const RADIO_VOZ = 11;

function diaUtc() {
  return new Date().toISOString().slice(0, 10);
}

function claveSala(tipo, codigo, nivelId, inst) {
  return `${tipo}:${codigo || 'PUBLICA'}:${nivelId}:${inst}`;
}

function codigoParaSemilla(tipo, codigo) {
  if (tipo !== 'privada') return 'publica';
  return 'privada-' + crypto.createHash('sha256').update(String(codigo || '')).digest('hex').slice(0, 20);
}

class Sala {
  constructor({ tipo, codigo = '', nivelId = 'level-0', inst = 1 }) {
    this.tipo = tipo === 'privada' ? 'privada' : 'publica';
    this.codigo = this.tipo === 'privada' ? P.limpiaCodigo(codigo) : '';
    this.nivelId = nivelId;
    this.inst = inst;
    this.dia = diaUtc();
    this.max = this.tipo === 'privada' ? P.CAP_PRIVADA : P.CAP_PUBLICA;
    this.clave = claveSala(this.tipo, this.codigo, this.nivelId, this.inst);
    this.nombre = this.tipo === 'privada'
      ? `Privada ${this.codigo}`
      : `Pública ${this.inst}`;
    this.semilla = `mmo::${this.dia}::${this.tipo}::${codigoParaSemilla(this.tipo, this.codigo)}::${this.nivelId}::${this.inst}`;
    const { def, map } = generarMapa(this.nivelId, this.semilla);
    this.def = def;
    this.map = map;
    this.jugadores = new Map();
    this.creada = Date.now();
    this.empezada = false;
  }

  get llena() { return this.jugadores.size >= this.max; }

  ocupada(x, y) {
    for (const j of this.jugadores.values()) if (j.x === x && j.y === y) return true;
    return false;
  }

  buscarSpawn() {
    const [sx, sy] = this.map.spawn;
    for (let r = 0; r < 24; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = sx + dx, y = sy + dy;
          if (esTransitable(this.map, x, y) && !this.ocupada(x, y)) return [x, y];
        }
    return [sx, sy];
  }

  censo() {
    return [...this.jugadores.values()].map((j) => ({
      id: j.id, nombre: j.nombre, x: j.x, y: j.y, rot: j.rot, listo: !!j.listo,
    }));
  }

  infoPublica() {
    return {
      tipo: this.tipo,
      codigo: this.tipo === 'privada' ? '' : this.codigo,
      clave: this.tipo === 'privada' ? 'privada:***' : this.clave,
      nombre: this.tipo === 'privada' ? 'Sala privada' : this.nombre,
      max: this.max,
      dia: this.dia,
      estado: this.empezada ? 'partida' : 'lobby',
    };
  }

  enviarLobby() {
    const jugadores = this.censo();
    for (const j of this.jugadores.values()) {
      this.enviar(j.ws, {
        t: 'lobby',
        id: j.id,
        nivel: this.nivelId,
        inst: this.inst,
        sala: this.infoPublica(),
        jugadores,
      });
    }
  }

  enviarComienzo() {
    const jugadores = this.censo();
    for (const j of this.jugadores.values()) {
      this.enviar(j.ws, {
        t: 'bienvenida',
        id: j.id,
        nivel: this.nivelId,
        inst: this.inst,
        semilla: this.semilla,
        x: j.x,
        y: j.y,
        rot: j.rot,
        jugadores,
        sala: this.infoPublica(),
      });
    }
  }

  iniciarSiListos() {
    if (this.empezada || this.jugadores.size === 0) return;
    for (const j of this.jugadores.values()) if (!j.listo) return;
    this.empezada = true;
    this.enviarComienzo();
  }

  entrar(ws, nombre, token) {
    const id = siguienteId++;
    const [x, y] = this.buscarSpawn();
    const jug = { id, ws, nombre, token, x, y, rot: 2, listo: false, ultMov: 0, ultChat: 0 };
    this.jugadores.set(id, jug);
    this.enviarLobby();
    return jug;
  }

  salir(jug) {
    if (!this.jugadores.delete(jug.id)) return;
    if (this.empezada) this.difundir({ t: 'sale', id: jug.id });
    else this.enviarLobby();
  }

  listo(jug, valor) {
    if (this.empezada) return;
    jug.listo = !!valor;
    this.enviarLobby();
    this.iniciarSiListos();
  }

  mover(jug, dx, dy) {
    const ahora = Date.now();
    if (ahora - jug.ultMov < P.COOLDOWN_MOVER) return;
    const nx = jug.x + dx, ny = jug.y + dy;
    if (esTransitable(this.map, nx, ny)) {
      jug.x = nx; jug.y = ny; jug.ultMov = ahora;
      this.difundir({ t: 'mueve', id: jug.id, x: nx, y: ny });
    } else {
      this.enviar(jug.ws, { t: 'mueve', id: jug.id, x: jug.x, y: jug.y });
    }
  }

  girar(jug, rot) {
    if (jug.rot === rot) return;
    jug.rot = rot;
    this.difundir({ t: 'gira', id: jug.id, rot }, jug.id);
  }

  chat(jug, txt) {
    const ahora = Date.now();
    if (ahora - jug.ultChat < P.COOLDOWN_CHAT) {
      this.enviar(jug.ws, { t: 'aviso', txt: 'Más despacio: un mensaje cada segundo y medio.' });
      return;
    }
    jug.ultChat = ahora;
    this.difundir({ t: 'chat', id: jug.id, txt });
  }

  voz(jug, msg) {
    const otro = this.jugadores.get(msg.to);
    if (!otro) return;
    const dx = jug.x - otro.x, dy = jug.y - otro.y;
    const cerca = Math.sqrt(dx * dx + dy * dy) <= RADIO_VOZ;
    if (!cerca) return;
    this.enviar(otro.ws, { t: 'voz', from: jug.id, kind: msg.kind, data: msg.data });
  }

  enviar(ws, msg) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

  difundir(msg, exceptoId) {
    const raw = JSON.stringify(msg);
    for (const j of this.jugadores.values())
      if (j.id !== exceptoId && j.ws.readyState === 1) j.ws.send(raw);
  }
}

function abrirSala(opts) {
  const s = new Sala(opts);
  salas.set(s.clave, s);
  const etiqueta = s.tipo === 'privada' ? `privada:***:${s.nivelId}:${s.inst}` : s.clave;
  console.log(`[sala] abierta ${etiqueta} (${s.map.grid.w}×${s.map.grid.h}, max ${s.max})`);
  return s;
}

function asignar({ tipo = 'publica', codigo = '', nivelId = 'level-0' }) {
  tipo = tipo === 'privada' ? 'privada' : 'publica';
  codigo = tipo === 'privada' ? P.limpiaCodigo(codigo) : '';
  if (tipo === 'privada') {
    const clave = claveSala(tipo, codigo || 'ERRANTES', nivelId, 1);
    let sala = salas.get(clave);
    if (sala && sala.dia !== diaUtc()) { salas.delete(clave); sala = null; }
    sala = sala || abrirSala({ tipo, codigo: codigo || 'ERRANTES', nivelId, inst: 1 });
    if (sala.empezada) return { error: 'Esa sala privada ya empezó. Crea otro código para una nueva expedición.' };
    if (sala.llena) return { error: `La sala privada ${sala.codigo} está llena (${sala.max}).` };
    return { sala };
  }
  for (let inst = 1; inst < 999; inst++) {
    const clave = claveSala('publica', '', nivelId, inst);
    let sala = salas.get(clave);
    if (sala && sala.dia !== diaUtc()) { salas.delete(clave); sala = null; }
    sala = sala || abrirSala({ tipo: 'publica', nivelId, inst });
    if (!sala.llena && !sala.empezada) return { sala };
  }
  return { error: 'Todas las salas públicas están llenas.' };
}

function limpiarVacias() {
  const ahora = Date.now();
  for (const [clave, sala] of salas) {
    if (sala.jugadores.size === 0 && ahora - sala.creada > 10 * 60 * 1000) salas.delete(clave);
  }
}

function estado() {
  return {
    diaUtc: diaUtc(),
    total: [...salas.values()].reduce((n, s) => n + s.jugadores.size, 0),
    salas: [...salas.values()].map((s) => ({
      clave: s.tipo === 'privada' ? 'privada:***' : s.clave,
      tipo: s.tipo,
      codigo: s.tipo === 'privada' ? '***' : '',
      nivel: s.nivelId,
      inst: s.inst,
      jugadores: s.jugadores.size,
      listos: [...s.jugadores.values()].filter((j) => j.listo).length,
      max: s.max,
      dia: s.dia,
      estado: s.empezada ? 'partida' : 'lobby',
    })),
  };
}

module.exports = { Sala, asignar, estado, limpiarVacias, diaUtc };
