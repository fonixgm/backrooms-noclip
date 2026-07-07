<<<<<<< Updated upstream
// BACKROOMS MMO — cliente de red.
// Se conecta al servidor de salas, construye el MISMO mapa que él a partir de
// la semilla (idéntico código MapGen/RNG a ambos lados) y a partir de ahí solo
// intercambia intenciones y eventos: por la red nunca viaja un mapa.
=======
// BACKROOMS MMO — cliente WebSocket.
>>>>>>> Stashed changes
(function () {
  let ws = null;
  let miId = null;
  let listo = false;
<<<<<<< Updated upstream
  let reintento = null;
  let inputChat = null;
  // v22 — movimiento libre: estado de input y reconciliación
  const input = { dx: 0, dy: 0 };
  let inputEnviado = { dx: 0, dy: 0 };
  let rotEnviada = 0, rotUltEnvio = 0;
  let tileFov = null; // último tile con FOV calculado
=======
  let ultPaso = 0;
  let reintento = null;
  let inputChat = null;
  let lobbyEl = null;
  let miListo = false;
  let opciones = null;

  const COOLDOWN = 170;
  const ROT_VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];
>>>>>>> Stashed changes

  function urlServidor() {
    const params = new URLSearchParams(location.search);
    if (params.get('ws')) return params.get('ws');
    if (location.protocol === 'http:' || location.protocol === 'https:')
      return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
<<<<<<< Updated upstream
    return 'ws://localhost:8080/ws'; // desarrollo desde file://
=======
    return 'ws://localhost:8080/ws';
  }

  function normalizarCodigo(v) {
    return String(v || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, 24);
  }

  function codigoAleatorio() {
    const a = new Uint8Array(4);
    try { crypto.getRandomValues(a); } catch (e) {
      for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 255);
    }
    return Array.from(a, (b) => (b % 36).toString(36).toUpperCase()).join('');
  }

  function opcionesDesdeUrl() {
    const params = new URLSearchParams(location.search);
    const sala = String(params.get('sala') || '').toLowerCase();
    const privada = sala === 'privada' || sala === 'private' || params.get('privada') === '1';
    return {
      sala: privada ? 'privada' : 'publica',
      codigo: normalizarCodigo(params.get('codigo') || params.get('room')),
      nivel: params.get('nivel') || 'level-0',
    };
>>>>>>> Stashed changes
  }

  function token() {
    try {
      let t = localStorage.getItem('mmo-token');
      if (!t) {
        t = Array.from(crypto.getRandomValues(new Uint8Array(16)),
          (b) => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('mmo-token', t);
      }
      return t;
    } catch (e) { return 'sin-token'; }
  }

  function enviar(msg) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

<<<<<<< Updated upstream
  function iniciar(nombre) {
    const w = Game.world;
    const params = new URLSearchParams(location.search);
    ws = new WebSocket(urlServidor());
    ws.onopen = () => enviar({
      t: 'hola', nombre, token: token(), v: 2,
      nivel: params.get('nivel') || undefined, // puerta de desarrollo (solo MMO_DEV=1)
=======
  function iniciar(nombre, opts = {}) {
    cerrar();
    opciones = { ...opcionesDesdeUrl(), ...opts };
    opciones.sala = opciones.sala === 'privada' ? 'privada' : 'publica';
    if (opciones.sala === 'privada' && !opciones.codigo) opciones.codigo = codigoAleatorio();
    mostrarLobby({
      id: null,
      sala: {
        tipo: opciones.sala,
        nombre: opciones.sala === 'privada' ? 'Sala privada' : 'Sala pública',
        max: '?',
      },
      jugadores: [{ id: null, nombre, listo: false }],
      conectando: true,
    });
    ws = new WebSocket(urlServidor());
    ws.onopen = () => enviar({
      t: 'hola',
      nombre,
      token: token(),
      v: 2,
      sala: opciones.sala,
      codigo: opciones.codigo || '',
      nivel: opciones.nivel || 'level-0',
>>>>>>> Stashed changes
    });
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
<<<<<<< Updated upstream
      recibir(m, w);
    };
    ws.onclose = () => {
      listo = false;
      if (w.level) w.log('Conexión perdida con las Backrooms… reintentando.', 'danger');
      clearTimeout(reintento);
      reintento = setTimeout(() => iniciar(nombre), 3000);
    };
    ws.onerror = () => {};
  }

  function nombreDe(id) {
    if (id === miId) return 'Tú';
    const o = Otros.lista.find((x) => x.id === id);
    return o ? o.nombre : '???';
  }

  function entidadDe(uid) {
    return Game.world.entities.find((e) => e.uid === uid);
  }

  function posDe(id) {
    const w = Game.world;
    if (id === miId) return [w.player.x, w.player.y, w.player];
    const o = Otros.lista.find((x) => x.id === id);
    return o ? [o.x, o.y, o] : null;
=======
      recibir(m, Game.world);
    };
    ws.onclose = () => {
      listo = false;
      if (Game.world.level) {
        ocultarLobby();
        Game.world.log('Conexión perdida con las Backrooms… reintentando.', 'danger');
      } else mostrarLobbyError('No se pudo conectar con la sala. Reintentando…');
      clearTimeout(reintento);
      reintento = setTimeout(() => iniciar(nombre, opciones), 3000);
    };
    ws.onerror = () => {
      if (!Game.world.level) mostrarLobbyError('La conexión con las Backrooms ha fallado.');
    };
  }

  function cerrar() {
    clearTimeout(reintento);
    reintento = null;
    listo = false;
    if (ws) {
      try { ws.onclose = null; ws.close(); } catch (e) {}
      ws = null;
    }
>>>>>>> Stashed changes
  }

  function recibir(m, w) {
    switch (m.t) {
<<<<<<< Updated upstream
      case 'bienvenida':
        miId = m.id;
        Game.startRun(m.semilla); // jugador, HUD y tarjeta de presentación
        construirNivel(m, w);
        w.log(`Estás en ${w.level.nombre} · instancia ${m.inst}. Pulsa T para hablar.`, 'good');
        crearChatUI();
        break;
      case 'nivel': { // cruce de salida: nivel nuevo (la caminata funde sin tarjeta)
        construirNivel(m, w);
        const def = w.level;
        const listo2 = () => {
          w.ui.updateHUD();
          w.log(`— ${def.nombre} —`, 'event');
          if (m.via) w.log(m.via, 'event');
          if (window.Sfx) { Sfx.stopAmbient(); Sfx.ambient(def); }
        };
        if (m.sinTarjeta) listo2();
        else w.ui.showLevelCard(def, listo2);
        break;
      }
      case 'entra': if (listo) Otros.entra(m); break;
      case 'sale': if (listo) Otros.sale(m.id); break;
      case 'mueve': // teleports: spawn, respawn, corrección dura
        if (!listo) return;
        if (m.id === miId) {
          w.player.x = m.x; w.player.y = m.y;
          w.player.rx = m.x; w.player.ry = m.y;
          fov(w);
        } else Otros.mueve(m.id, m.x, m.y);
        break;
      case 'pos': // v22: lote de posiciones del tick (jugadores y entidades)
        if (!listo) return;
        for (const [id, x, y] of m.j || []) {
          if (id === miId) reconciliar(w, x, y);
          else Otros.pos(id, x, y);
        }
        for (const [uid, x, y] of m.e || []) {
          const e = entidadDe(uid);
          if (e) { e.x = x; e.y = y; }
        }
        break;
=======
      case 'lobby': mostrarLobby(m); break;
      case 'bienvenida': construirMundo(m, w); break;
      case 'entra': if (listo) Otros.entra(m); break;
      case 'sale': if (listo) Otros.sale(m.id); break;
      case 'mueve':
        if (!listo) return;
        if (m.id === miId) {
          if (m.x !== w.player.x || m.y !== w.player.y) {
            w.player.x = m.x; w.player.y = m.y;
            fov(w);
            if (window.Voz) Voz.actualizar();
          }
        } else Otros.mueve(m.id, m.x, m.y);
        break;
>>>>>>> Stashed changes
      case 'gira': if (listo) Otros.gira(m.id, m.rot); break;
      case 'chat':
        if (!listo) return;
        Otros.chat(m.id, m.txt, performance.now());
<<<<<<< Updated upstream
        w.log(`${nombreDe(m.id)}: ${m.txt}`, 'event');
        break;

      // ---------- entidades ----------
      case 'entMueve': { const e = entidadDe(m.uid); if (e) { e.x = m.x; e.y = m.y; } break; }
      case 'entPrep': {
        const e = entidadDe(m.uid);
        if (!e) return;
        e.preparando = true;
        if (window.Effects) Effects.number(e.x, e.y, '⚠', '#ffd860');
        if (window.Sfx && cerca(w, e.x, e.y, 10)) Sfx.cue('generico');
        break;
      }
      case 'entAtaca': {
        const e = entidadDe(m.uid);
        if (e) { e.preparando = false; e._atkT = performance.now(); }
        if (m.id === miId) {
          if (window.Effects) { Effects.doShake(6, 180); Effects.particles(w.player.x, w.player.y, '#b03030', 12); }
          if (window.Sfx) Sfx.play('golpe');
          w.log(`¡${e ? e.def.nombre : 'Algo'} te ataca!`, 'danger');
        }
        break;
      }
      case 'entFalla': {
        const e = entidadDe(m.uid);
        if (!e) return;
        e.preparando = false;
        if (cerca(w, e.x, e.y, 8)) w.log(`${e.def.nombre} desgarra el aire.`, 'good');
        break;
      }
      case 'entMuere': { const e = entidadDe(m.uid); if (e) e.viva = false; break; }
      case 'entHit': { const e = entidadDe(m.uid); if (e) e._hitT = performance.now(); break; }
      case 'entRevela': {
        const e = entidadDe(m.uid);
        if (!e) return;
        e.revelada = true;
        if (cerca(w, e.x, e.y, 10)) w.log(`Esa figura no era humana. ¡${e.def.nombre}!`, 'danger');
        break;
      }
      case 'aviso2': w.log(m.txt, 'danger'); break;

      // ---------- estado propio ----------
      case 'salud':
        w.player.salud = m.valor;
        w.ui.updateHUD();
        break;
      case 'inv':
        w.player.inv = m.inv;
        w.player.manos = m.manos;
        if (m.equipo) w.player.equipo = m.equipo;
        w.ui.updateHUD();
        if (document.getElementById('backpack-panel').style.display !== 'none')
          w.ui.toggleBackpack(true); // repintar el panel abierto
        break;
      case 'itemSuelto': {
        w.map.items[m.idx] = { x: m.x, y: m.y, id: m.id, taken: false };
        w.itemsVersion = (w.itemsVersion || 0) + 1;
        break;
      }
      case 'muere':
        if (m.id === miId) {
          w.log(`La oscuridad te traga (${m.causa}).`, 'danger');
          if (window.Effects) Effects.doShake(9, 400);
          if (window.Sfx) Sfx.play('muerte');
        } else {
          const p = posDe(m.id);
          if (p && cerca(w, p[0], p[1], 12)) w.log(`${nombreDe(m.id)} cae al suelo…`, 'danger');
        }
        break;

      // ---------- objetos y salidas ----------
      case 'itemCogido': {
        const it = w.map.items[m.idx];
        if (it) it.taken = true;
        w.itemsVersion = (w.itemsVersion || 0) + 1;
        if (m.por === miId) {
          const def = w.data.objects[m.id];
          w.log(`Recoges: ${def ? def.nombre : m.id}.`, 'good');
          if (window.Sfx) Sfx.play('recoger');
        }
        break;
      }
      case 'dado': {
        const p = posDe(m.id);
        if (p && window.Effects)
          Effects.number(p[0], p[1], `d20 → ${m.valor}`, m.exito ? '#a8d8a0' : '#e88a7a');
        if (window.Sfx && p && cerca(w, p[0], p[1], 12)) Sfx.play('dado');
        break;
      }
      case 'canal': {
        const p = posDe(m.id);
        if (p && window.Effects) Effects.number(p[0], p[1], '*GOLPES*', '#e8c95a');
        if (window.Sfx && p && cerca(w, p[0], p[1], 12)) Sfx.play('golpe');
        break;
      }
      case 'canalFin': break;
      case 'abierto': {
        const ex = w.map.exits[m.i];
        if (!ex) return;
        ex.def._abierta = true;
        w.mapaVersion = (w.mapaVersion || 0) + 1; // el render reconstruye el hueco
        if (cerca(w, ex.x, ex.y, 14)) {
          w.log('Algo se DERRUMBA: un camino nuevo queda abierto.', 'good');
          if (window.Sfx) Sfx.play('derrumbe');
          if (window.Effects) Effects.doShake(5, 220);
        }
        break;
      }
      case 'oferta':
        w.ui.showChoice('Una salida', `${m.texto}.`, [
          { label: 'CRUZAR', cb: () => enviar({ t: 'cruzar', si: true }) },
          { label: 'Aún no', cb: () => enviar({ t: 'cruzar', si: false }) },
        ]);
        break;

      // ---------- escondites y luz ----------
      case 'esconde':
        if (m.id === miId) {
          w.escondido = m.si ? { delatado: false } : null;
          if (m.si) w.log('Te metes dentro. Contén la respiración.', 'good');
        } else Otros.esconde(m.id, m.si);
        break;
      case 'luzDe': Otros.luz(m.id, m.si); break;

      case 'caminata': {
        w.pasosNivel = m.pasos;
        w._caminataObjetivo = m.objetivo; // alimenta el fundido gris del render y el zumbido
        const f = m.pasos / Math.max(1, m.objetivo);
        const A = w._caminataAvisos || (w._caminataAvisos = {});
        const avisa = (key, limite, texto) => {
          if (f >= limite && !A[key]) {
            A[key] = true;
            if (window.Effects) Effects.bubble(w.player.x, w.player.y, texto, w.player);
          }
        };
        avisa('lejos1', 0.3, 'He perdido por completo el punto de partida.');
        avisa('lejos2', 0.65, 'El zumbido ya no suena igual… llevo demasiado caminando.');
        avisa('lejos3', 0.82, 'El amarillo se apaga. Bajo la moqueta asoma hormigón.');
        avisa('lejos4', 0.94, 'Hay columnas al final del pasillo. Ya no distingo dónde cambia el nivel.');
        break;
      }
      case 'anuncio':
        w.log(`📢 ${m.txt}`, 'danger');
        if (window.Effects) Effects.bubble(w.player.x, w.player.y, `📢 ${m.txt}`, w.player);
        break;

      // ---------- remodelación no euclidiana: el nivel cambia PARA TODOS ----------
      case 'remodel': {
        const g = w.map.grid;
        for (let y = 0; y < m.ch; y++)
          for (let x = 0; x < m.ch; x++) {
            g.t[(m.y + y) * g.w + (m.x + x)] = m.tiles[y * m.ch + x];
            w.explored[(m.y + y) * g.w + (m.x + x)] = 0; // la memoria de la zona se borra
          }
        w.mapaVersion = (w.mapaVersion || 0) + 1; // el render 3D reconstruye
        fov(w);
        w.log(w.level.id === 'level-0'
          ? 'El zumbido cambia de tono. En algún lugar, un pasillo ya no conduce al mismo sitio.'
          : 'Un crujido lejano recorre el nivel: las Backrooms se reorganizan.', 'danger');
        if (window.Sfx) Sfx.play(w.level.id === 'level-0' ? 'crujido' : 'derrumbe');
        break;
      }

      case 'aviso': w.log(m.txt, 'event'); break;
      case 'error': w.log(m.txt, 'danger'); break;
    }
  }

  function cerca(w, x, y, r) {
    return Math.abs(x - w.player.x) + Math.abs(y - w.player.y) <= r;
  }

  // Construye el estado local de una sala: mapa desde la semilla + estado
  // dinámico que la semilla no puede saber (entidades, objetos cogidos,
  // grietas ya abiertas, censo de jugadores).
  function construirNivel(m, w) {
    const def = w.data.levels[m.nivel];
    w.online = true;
    w.level = def;
    // MISMA transformación que hace el servidor (sim/mundo.js→defParaOnline):
    // online las salidas aparecen siempre — el campo `prob` era del modo solo
    const defOnline = {
      ...def,
      salidas: (def.salidas || []).map((s) => { const c = { ...s }; delete c.prob; return c; }),
    };
    w.map = MapGen.generate(defOnline, RNG.create(m.semilla));
    w.tiles = Tiles.build(def, RNG.create(m.semilla + '::tiles'));
    w.map.caminatas = []; // la caminata online (M3) es personal
    for (const i of m.itemsTomados || []) if (w.map.items[i]) w.map.items[i].taken = true;
    for (const i of m.abiertas || []) if (w.map.exits[i]) w.map.exits[i].def._abierta = true;
    w.entities = (m.ents || []).map((e) => ({
      uid: e.uid, id: e.id, def: w.data.entities[e.id],
      x: e.x, y: e.y, rx: e.x, ry: e.y,
      viva: e.viva, revelada: e.revelada,
      preparando: false, paralizada: 0, huyendo: 0, vida: 1,
    }));
    w.player.x = m.x; w.player.y = m.y;
    w.player.rx = m.x; w.player.ry = m.y;
    w.player.rot = m.rot ?? 2;
    w.player.salud = m.salud ?? 100;
    w.player.inv = m.inv || [];
    w.player.manos = m.manos || [null, null];
    w.pasosNivel = m.caminata ? m.caminata.pasos : 0;
    w._caminataObjetivo = m.caminata ? m.caminata.objetivo : 0;
    w._caminataAvisos = {};
    w.escondido = null;
    w._ignoraExit = null;
    // el códice local del navegador sigue coleccionando niveles transitados
    try { Game.Profiles.registrarEntrada(m.nivel); } catch (e) {}
    w.itemsVersion = (w.itemsVersion || 0) + 1;
    w.mapaVersion = (w.mapaVersion || 0) + 1;
    const g = w.map.grid;
    w.explored = new Uint8Array(g.w * g.h);
    w.light = new Float32Array(g.w * g.h);
=======
        w.log(`${m.id === miId ? 'Tú' : nombreDe(m.id)}: ${m.txt}`, 'event');
        break;
      case 'voz':
        if (window.Voz) Voz.recibir(m);
        break;
      case 'aviso': if (w.log) w.log(m.txt, 'event'); break;
      case 'error': if (w.log) w.log(m.txt, 'danger'); else alert(m.txt); break;
    }
  }

  function nombreDe(id) {
    const o = Otros.lista.find((x) => x.id === id);
    return o ? o.nombre : '???';
  }

  function ocultarCodigoPrivado(sala) {
    if (!sala || sala.tipo !== 'privada' || !history.replaceState) return;
    try {
      const url = new URL(location.href);
      if (!url.searchParams.has('codigo') && !url.searchParams.has('room')) return;
      url.searchParams.delete('codigo');
      url.searchParams.delete('room');
      url.searchParams.set('sala', 'privada');
      history.replaceState(null, document.title, url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function construirMundo(m, w) {
    miId = m.id;
    ocultarLobby();
    ocultarCodigoPrivado(m.sala);
    Game.startRun(m.semilla);
    const def = w.data.levels[m.nivel];
    w.online = true;
    w.onlineRoom = m.sala || null;
    w.realTime = true;
    w.level = def;
    w.map = MapGen.generate(def, RNG.create(m.semilla));
    w.tiles = Tiles.build(def, RNG.create(m.semilla + '::tiles'));
    w.entities = [];
    w.map.items = [];
    w.map.exits = [];
    w.map.caminatas = [];
    w.player.x = m.x; w.player.y = m.y;
    w.player.rx = m.x; w.player.ry = m.y;
    w.player.rot = m.rot ?? 2;
    w._ignoraExit = null;
>>>>>>> Stashed changes
    fov(w);
    Otros.reset(miId);
    for (const j of m.jugadores) Otros.entra(j);
    listo = true;
<<<<<<< Updated upstream
=======
    const sala = m.sala
      ? (m.sala.tipo === 'privada' ? 'Sala privada' : `${m.sala.nombre} (${m.sala.tipo})`)
      : `instancia ${m.inst}`;
    w.log(`Conectado a ${sala}. Pulsa T o Enter para hablar.`, 'good');
    crearChatUI();
  }

  function crearLobbyUI() {
    if (lobbyEl) return lobbyEl;
    lobbyEl = document.createElement('div');
    lobbyEl.id = 'mmo-lobby';
    lobbyEl.style.cssText =
      'position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;' +
      'background:radial-gradient(ellipse at center,rgba(18,15,8,.96),rgba(0,0,0,.96));padding:18px;';
    lobbyEl.innerHTML =
      '<div style="width:min(620px,94vw);max-height:92vh;overflow:auto;border:1px solid #8a7a3d;' +
      'background:rgba(10,9,6,.96);box-shadow:0 0 45px rgba(0,0,0,.8);padding:24px;text-align:center">' +
      '<h2 style="font:16px Press Start 2P,monospace;color:#d9c66e;line-height:1.5;margin-bottom:12px">ANTES DEL DESTIERRO</h2>' +
      '<p id="mmo-lobby-room" style="color:#9a9482;font-size:18px;margin-bottom:14px"></p>' +
      '<div id="mmo-lobby-list" style="display:grid;gap:7px;margin:14px auto 18px;max-width:420px;text-align:left"></div>' +
      '<button id="mmo-ready" class="btn-big">LISTO</button>' +
      '<button id="mmo-cancel" class="btn-small" style="margin-left:8px">VOLVER</button>' +
      '<p style="color:#6a6455;font-size:15px;line-height:1.45;margin-top:16px">La expedición empieza cuando todos estén listos. En sala privada el código no se muestra en pantalla.</p>' +
      '</div>';
    document.body.appendChild(lobbyEl);
    lobbyEl.querySelector('#mmo-ready').onclick = () => {
      miListo = !miListo;
      enviar({ t: 'listo', listo: miListo });
    };
    lobbyEl.querySelector('#mmo-cancel').onclick = () => {
      cerrar();
      ocultarLobby();
    };
    return lobbyEl;
  }

  function mostrarLobby(m) {
    miId = m.id;
    const el = crearLobbyUI();
    const sala = m.sala || {};
    const room = el.querySelector('#mmo-lobby-room');
    room.textContent = m.conectando
      ? `Conectando a ${sala.tipo === 'privada' ? 'sala privada' : 'sala pública'}…`
      : `${sala.tipo === 'privada' ? 'Sala privada' : 'Sala pública'} · ${m.jugadores.length}/${sala.max || '?'} errantes`;
    const list = el.querySelector('#mmo-lobby-list');
    list.innerHTML = '';
    for (const j of m.jugadores) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:12px;border:1px solid #3a352a;padding:6px 10px;background:#14120d;color:#efe8d0;font-size:18px';
      const yo = j.id === miId ? ' (tú)' : '';
      row.innerHTML = `<span>${j.nombre}${yo}</span><span style="color:${j.listo ? '#6aa86a' : '#9a9482'}">${j.listo ? 'LISTO' : 'esperando'}</span>`;
      list.appendChild(row);
    }
    const yo = m.jugadores.find((j) => j.id === miId);
    miListo = !!yo?.listo;
    const btn = el.querySelector('#mmo-ready');
    btn.textContent = miListo ? 'NO ESTOY LISTO' : 'LISTO';
    btn.disabled = !!m.conectando;
    btn.style.opacity = m.conectando ? '0.45' : '1';
    el.style.display = 'flex';
  }

  function mostrarLobbyError(txt) {
    const el = crearLobbyUI();
    el.querySelector('#mmo-lobby-room').textContent = txt;
    el.querySelector('#mmo-ready').disabled = true;
    el.querySelector('#mmo-ready').style.opacity = '0.45';
    el.style.display = 'flex';
  }

  function ocultarLobby() {
    if (lobbyEl) lobbyEl.style.display = 'none';
>>>>>>> Stashed changes
  }

  function fov(w) {
    const g = w.map.grid;
<<<<<<< Updated upstream
    // FOV.compute indexa arrays por tile: SIEMPRE coordenadas enteras (v22:
    // la posición es flotante — un índice fraccionario se escribe en el vacío)
    w.light = FOV.compute(g, Fisica.tileDe(w.player.x), Fisica.tileDe(w.player.y), w.visionActual());
    for (let i = 0; i < w.light.length; i++) if (w.light[i] > 0) w.explored[i] = 1;
  }

  // ---------- movimiento libre (v22): input vectorial + predicción local ----------
  function setInput(dx, dy) {
    input.dx = Math.max(-1, Math.min(1, dx || 0));
    input.dy = Math.max(-1, Math.min(1, dy || 0));
    // se envía solo al CAMBIAR (el servidor mantiene el último estado)
    if (Math.abs(input.dx - inputEnviado.dx) > 0.01 || Math.abs(input.dy - inputEnviado.dy) > 0.01) {
      inputEnviado = { dx: input.dx, dy: input.dy };
      enviar({ t: 'input', dx: input.dx, dy: input.dy });
    }
  }

  function setRot(th) {
    const w = Game.world;
    w.player.rot = th;
    const ahora = performance.now();
    if (Math.abs(th - rotEnviada) > 0.03 && ahora - rotUltEnvio > 80) {
      rotEnviada = th; rotUltEnvio = ahora;
      enviar({ t: 'rot', th: Math.round(th * 100) / 100 });
    }
  }

  // predicción: el cliente integra su propio movimiento con LA MISMA física
  // que el servidor — la reconciliación casi nunca tiene que corregir
  function frame(dt) {
    const w = Game.world;
    if (!listo || w.escondido || (!input.dx && !input.dy)) return;
    const [nx, ny] = Fisica.mover(w.map.grid, w.player.x, w.player.y, input.dx, input.dy, dt, Fisica.VEL_JUGADOR);
    w.player.x = nx; w.player.y = ny;
    const tx = Fisica.tileDe(nx), ty = Fisica.tileDe(ny);
    if (!tileFov || tileFov[0] !== tx || tileFov[1] !== ty) {
      tileFov = [tx, ty];
      fov(w);
    }
  }

  // posición autoritativa propia: desviación grande = snap; pequeña = mezcla
  function reconciliar(w, sx, sy) {
    const d = Fisica.dist(w.player.x, w.player.y, sx, sy);
    if (d > 0.5) { w.player.x = sx; w.player.y = sy; fov(w); }
    else if (d > 0.03) {
      w.player.x += (sx - w.player.x) * 0.15;
      w.player.y += (sy - w.player.y) * 0.15;
    }
  }

  // ---------- acciones ----------
  function accion() { enviar({ t: 'accion' }); }           // ESPACIO
  function usar(mano) { enviar({ t: 'usar', mano }); }     // Q/E
  function mochila(que, datos) { enviar({ t: 'mochila', que, ...datos }); }

  function luzToggle() {
    const w = Game.world;
    w.player.luz = !w.player.luz;
    enviar({ t: 'luz', si: w.player.luz });
  }

  // ---------- chat ----------
=======
    w.light = FOV.compute(g, w.player.x, w.player.y, w.visionActual());
    for (let i = 0; i < w.light.length; i++) if (w.light[i] > 0) w.explored[i] = 1;
  }

  function mover(dx, dy) {
    const w = Game.world;
    if (!listo || w.escondido) return;
    const ahora = performance.now();
    if (ahora - ultPaso < COOLDOWN) return;
    ultPaso = ahora;
    const nx = w.player.x + dx, ny = w.player.y + dy;
    if (MapGen.walkable(MapGen.at(w.map.grid, nx, ny))) {
      w.player.x = nx; w.player.y = ny;
      fov(w);
      if (window.Voz) Voz.actualizar();
    }
    enviar({ t: 'mover', dx, dy });
  }

  function avanzar(s) {
    const w = Game.world;
    const [dx, dy] = ROT_VEC[w.player.rot];
    mover(dx * s, dy * s);
  }

  function girar(d) {
    const w = Game.world;
    w.player.rot = ((w.player.rot + d) % 4 + 4) % 4;
    enviar({ t: 'rot', rot: w.player.rot });
  }

  function moverPantalla(dx, dy) {
    const w = Game.world;
    if (dy > 0) w.player.dir = 'down';
    else if (dy < 0) w.player.dir = 'up';
    else if (dx !== 0) { w.player.dir = 'side'; w.player.flip = dx < 0; }
    mover(dx, dy);
  }

>>>>>>> Stashed changes
  function crearChatUI() {
    if (inputChat) return;
    inputChat = document.createElement('input');
    inputChat.id = 'chat-input';
    inputChat.maxLength = 120;
    inputChat.placeholder = 'Di algo… (Enter envía, ESC cierra)';
    inputChat.autocomplete = 'off';
    inputChat.style.cssText =
      'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);width:min(480px,80vw);' +
      'display:none;padding:8px 12px;background:rgba(14,12,9,.94);color:#e8dcae;' +
      'border:1px solid #d8c98a;border-radius:4px;font:18px VT323,monospace;z-index:60;outline:none;';
    document.body.appendChild(inputChat);
    inputChat.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') {
        const txt = inputChat.value.trim();
        if (txt) enviar({ t: 'chat', txt });
        cerrarChat();
      } else if (ev.key === 'Escape') cerrarChat();
    });
  }

  function abrirChat() {
    if (!inputChat) return;
    inputChat.style.display = 'block';
    inputChat.value = '';
    inputChat.focus();
  }

  function cerrarChat() {
    inputChat.value = '';
    inputChat.style.display = 'none';
    inputChat.blur();
  }

  function chatAbierto() {
    return !!inputChat && inputChat.style.display !== 'none';
  }

  window.Net = {
<<<<<<< Updated upstream
    iniciar, setInput, setRot, frame,
    accion, usar, luzToggle, mochila,
    abrirChat, chatAbierto,
    get activo() { return listo; },
    get id() { return miId; },
=======
    iniciar, cerrar, mover, avanzar, girar, moverPantalla,
    abrirChat, chatAbierto, normalizarCodigo, enviar,
    get activo() { return listo; },
    get id() { return miId; },
    get opciones() { return opciones; },
>>>>>>> Stashed changes
  };
})();
