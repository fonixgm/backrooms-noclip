// BACKROOMS MMO — cliente WebSocket.
(function () {
  let ws = null;
  let miId = null;
  let listo = false;
  let ultPaso = 0;
  let reintento = null;
  let inputChat = null;
  let lobbyEl = null;
  let miListo = false;
  let opciones = null;

  const COOLDOWN = 170;
  const ROT_VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  function urlServidor() {
    const params = new URLSearchParams(location.search);
    if (params.get('ws')) return params.get('ws');
    if (location.protocol === 'http:' || location.protocol === 'https:')
      return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
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
    });
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
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
  }

  function recibir(m, w) {
    switch (m.t) {
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
      case 'gira': if (listo) Otros.gira(m.id, m.rot); break;
      case 'salida_abierta':
        if (!listo) return;
        marcarSalidaAbierta(w, m.i);
        if (m.texto && w.log) w.log(m.texto, 'good');
        break;
      case 'chat':
        if (!listo) return;
        Otros.chat(m.id, m.txt, performance.now());
        w.log(`${m.id === miId ? 'Tú' : nombreDe(m.id)}: ${m.txt}`, 'event');
        break;
      case 'voz':
        if (window.Voz) Voz.recibir(m);
        break;
      case 'aviso': if (w.log) w.log(m.txt, 'event'); break;
      case 'error': if (w.log) w.log(m.txt, 'danger'); else alert(m.txt); break;
    }
  }

  function marcarSalidaAbierta(w, i) {
    const ex = w?.map?.exits?.[i | 0];
    if (!ex) return;
    ex.def._abierta = true;
    w.mapaVersion = (w.mapaVersion || 0) + 1;
  }

  function aplicarSalidasAbiertas(w, abiertas) {
    const exits = w?.map?.exits || [];
    for (let i = 0; i < exits.length; i++) exits[i].def._onlineIndex = i;
    for (const i of abiertas || []) marcarSalidaAbierta(w, i);
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
    aplicarSalidasAbiertas(w, m.abiertas);
    w.map.caminatas = [];
    w.player.x = m.x; w.player.y = m.y;
    w.player.rx = m.x; w.player.ry = m.y;
    w.player.rot = m.rot ?? 2;
    w._ignoraExit = null;
    fov(w);
    Otros.reset(miId);
    for (const j of m.jugadores) Otros.entra(j);
    listo = true;
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
  }

  function fov(w) {
    const g = w.map.grid;
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

  function debugTeleport(nivel) {
    enviar({ t: 'debug_tp', nivel });
  }

  function abrirSalida(i) {
    enviar({ t: 'abrir_salida', i });
  }

  function cruzarSalida(i) {
    enviar({ t: 'cruzar_salida', i });
  }

  window.Net = {
    iniciar, cerrar, mover, avanzar, girar, moverPantalla,
    abrirChat, chatAbierto, normalizarCodigo, enviar, debugTeleport, abrirSalida, cruzarSalida,
    get activo() { return listo; },
    get id() { return miId; },
    get opciones() { return opciones; },
  };
})();
