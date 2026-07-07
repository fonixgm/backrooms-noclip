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
    this.salidasAbiertas = new Set();
    this.conexiones = new Map();
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

  buscarSpawnCerca(x0, y0) {
    if (Number.isFinite(x0) && Number.isFinite(y0) &&
        esTransitable(this.map, x0, y0) && !this.ocupada(x0, y0)) return [x0, y0];
    for (let r = 1; r < 18; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = x0 + dx, y = y0 + dy;
          if (esTransitable(this.map, x, y) && !this.ocupada(x, y)) return [x, y];
        }
    return this.buscarSpawn();
  }

  buscarEntradaDesde(nivelOrigen) {
    const exits = this.map.exits || [];
    for (let i = 0; i < exits.length; i++) {
      const ex = exits[i];
      if (ex?.def?.destino === nivelOrigen) return { i, x: ex.x, y: ex.y };
    }
    return null;
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
        abiertas: [...this.salidasAbiertas],
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

  entrarEnPartida(jug, entrada = null) {
    const puertaEntrada = entrada?.desdeNivel ? this.buscarEntradaDesde(entrada.desdeNivel) : null;
    const [x, y] = puertaEntrada
      ? this.buscarSpawnCerca(puertaEntrada.x, puertaEntrada.y)
      : this.buscarSpawn();
    jug.x = x; jug.y = y; jug.rot = 2;
    jug.listo = true;
    jug.ultMov = 0;
    jug.ultChat = 0;
    this.empezada = true;
    this.jugadores.set(jug.id, jug);
    this.difundir({ t: 'entra', id: jug.id, nombre: jug.nombre, x, y, rot: jug.rot }, jug.id);
    this.enviar(jug.ws, {
      t: 'bienvenida',
      id: jug.id,
      nivel: this.nivelId,
      inst: this.inst,
      semilla: this.semilla,
      x,
      y,
      rot: jug.rot,
      jugadores: this.censo(),
      sala: this.infoPublica(),
      abiertas: [...this.salidasAbiertas],
      entrada: entrada ? { ...entrada, salidaRetorno: puertaEntrada?.i ?? null } : null,
      debug: true,
    });
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

  salidaPorIndice(i) {
    i = i | 0;
    const ex = (this.map.exits || [])[i];
    if (!ex) return null;
    return { i, ex };
  }

  jugadorSobreSalida(jug, ex) {
    return !!ex && jug.x === ex.x && jug.y === ex.y;
  }

  abrirSalida(jug, i) {
    const s = this.salidaPorIndice(i);
    if (!s) {
      this.enviar(jug.ws, { t: 'error', txt: 'Esa salida no existe en esta sala.' });
      return false;
    }
    if (!this.jugadorSobreSalida(jug, s.ex)) {
      this.enviar(jug.ws, { t: 'mueve', id: jug.id, x: jug.x, y: jug.y });
      this.enviar(jug.ws, { t: 'aviso', txt: 'Acércate a la salida para tocarla.' });
      return false;
    }
    if (!this.salidasAbiertas.has(s.i)) {
      this.salidasAbiertas.add(s.i);
      if (s.ex.def) s.ex.def._abierta = true;
      this.difundir({ t: 'salida_abierta', i: s.i, x: s.ex.x, y: s.ex.y, texto: s.ex.def?.texto || 'Una salida se abre.' });
      this.enviar(jug.ws, { t: 'salida_abierta', i: s.i, x: s.ex.x, y: s.ex.y, texto: s.ex.def?.texto || 'La salida se abre.' });
    }
    return true;
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

function asignarPartida({ tipo = 'publica', codigo = '', nivelId = 'level-0' }) {
  tipo = tipo === 'privada' ? 'privada' : 'publica';
  codigo = tipo === 'privada' ? P.limpiaCodigo(codigo) : '';
  if (tipo === 'privada') {
    const clave = claveSala(tipo, codigo || 'ERRANTES', nivelId, 1);
    let sala = salas.get(clave);
    if (sala && sala.dia !== diaUtc()) { salas.delete(clave); sala = null; }
    sala = sala || abrirSala({ tipo, codigo: codigo || 'ERRANTES', nivelId, inst: 1 });
    if (sala.llena) return { error: `La sala privada ${sala.codigo} está llena (${sala.max}).` };
    sala.empezada = true;
    return { sala };
  }
  for (let inst = 1; inst < 999; inst++) {
    const clave = claveSala('publica', '', nivelId, inst);
    let sala = salas.get(clave);
    if (sala && sala.dia !== diaUtc()) { salas.delete(clave); sala = null; }
    sala = sala || abrirSala({ tipo: 'publica', nivelId, inst });
    if (!sala.llena) {
      sala.empezada = true;
      return { sala };
    }
  }
  return { error: 'Todas las salas públicas están llenas.' };
}

function obtenerPartidaExacta({ tipo = 'publica', codigo = '', nivelId = 'level-0', inst = 1 }) {
  tipo = tipo === 'privada' ? 'privada' : 'publica';
  codigo = tipo === 'privada' ? P.limpiaCodigo(codigo) : '';
  inst = Math.max(1, inst | 0);
  const clave = claveSala(tipo, tipo === 'privada' ? (codigo || 'ERRANTES') : '', nivelId, inst);
  let sala = salas.get(clave);
  if (sala && sala.dia !== diaUtc()) { salas.delete(clave); sala = null; }
  sala = sala || abrirSala({ tipo, codigo: tipo === 'privada' ? (codigo || 'ERRANTES') : '', nivelId, inst });
  if (sala.llena) return { error: 'La sala destino está llena.' };
  sala.empezada = true;
  return { sala };
}

function salaParaConexion(origen, salidaIndice, nivelId) {
  const claveConexion = String(salidaIndice | 0);
  const previa = origen.conexiones.get(claveConexion);
  if (previa && previa.nivelId === nivelId) {
    return obtenerPartidaExacta({
      tipo: origen.tipo,
      codigo: origen.codigo,
      nivelId,
      inst: previa.inst,
    });
  }
  const r = asignarPartida({
    tipo: origen.tipo,
    codigo: origen.codigo,
    nivelId,
  });
  if (!r.error) origen.conexiones.set(claveConexion, { nivelId, inst: r.sala.inst });
  return r;
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

module.exports = { Sala, asignar, asignarPartida, salaParaConexion, estado, limpiarVacias, diaUtc };
