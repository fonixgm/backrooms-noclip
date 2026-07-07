// Voz por proximidad: WebRTC mesh + mezcla WebAudio.
// El servidor solo señaliza; cada cliente corta/atenúa según distancia real.
(function () {
  const RADIO = 10;
  const RADIO_CORTE = 11;
  const peers = new Map();
  let stream = null;
  let activo = false;
  let auto = false;
  let btn = null;
  let audioCtx = null;
  let reverb = null;
  let tick = null;

  function id() { return window.Net?.id || 0; }
  function enviar(msg) { if (window.Net?.enviar) Net.enviar(msg); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function ctxAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) {
      audioCtx = new AC();
      reverb = crearReverb(audioCtx);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function crearReverb(ctx) {
    try {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 0.55);
      const impulse = ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2) * 0.32;
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = impulse;
      return conv;
    } catch (e) { return null; }
  }

  function crearBoton() {
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'voice-toggle';
    btn.textContent = 'VOZ';
    btn.title = 'Voz de proximidad';
    btn.style.cssText =
      'position:fixed;right:14px;top:14px;z-index:48;padding:8px 12px;' +
      'background:rgba(10,9,6,.78);color:#9a9482;border:1px solid #3a352a;' +
      'font:16px VT323,monospace;cursor:pointer;';
    btn.onclick = () => activo ? desactivar() : activar({ auto: false });
    document.body.appendChild(btn);
    pintar();
    return btn;
  }

  function pintar(txt) {
    crearBoton();
    if (txt) btn.textContent = txt;
    else btn.textContent = activo ? (auto ? 'VOZ AUTO' : 'VOZ ON') : 'VOZ';
    btn.style.color = activo ? '#d9c66e' : '#9a9482';
    btn.style.borderColor = activo ? '#d9c66e' : '#3a352a';
  }

  async function activar(opts = {}) {
    auto = !!opts.auto;
    crearBoton();
    if (activo && stream) { pintar(); actualizar(); return true; }
    try {
      ctxAudio();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      activo = true;
      pintar();
      if (!tick) tick = setInterval(actualizar, 450);
      actualizar();
      return true;
    } catch (e) {
      activo = false;
      pintar('MIC OFF');
      setTimeout(pintar, 2200);
      return false;
    }
  }

  function desactivar() {
    activo = false;
    auto = false;
    for (const p of peers.values()) cerrarPeer(p);
    peers.clear();
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
      stream = null;
    }
    if (tick) { clearInterval(tick); tick = null; }
    pintar();
  }

  function remoto(pid) {
    return window.Otros?.lista?.find((o) => o.id === pid) || null;
  }

  function dist(o) {
    const p = Game?.world?.player;
    if (!p || !o) return Infinity;
    const dx = o.x - p.x, dy = o.y - p.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function cercanos() {
    if (!Game?.world?.player || !window.Otros) return [];
    return Otros.lista.filter((o) => dist(o) <= RADIO);
  }

  function actualizarAudio(p) {
    const o = remoto(p.id);
    const d = dist(o);
    if (!p.gain || !o || d > RADIO_CORTE) return false;
    const cerca = clamp(1 - d / RADIO, 0, 1);
    const vol = 0.03 + Math.pow(cerca, 1.8) * 0.97;
    const pan = clamp((o.x - Game.world.player.x) / Math.max(3, RADIO * 0.7), -1, 1);
    const wet = 0.08 + (1 - cerca) * 0.18;
    const now = audioCtx?.currentTime || 0;
    try {
      p.gain.gain.setTargetAtTime(vol, now, 0.08);
      if (p.pan) p.pan.pan.setTargetAtTime(pan, now, 0.08);
      if (p.wet) p.wet.gain.setTargetAtTime(wet, now, 0.12);
      if (p.dry) p.dry.gain.setTargetAtTime(1 - wet * 0.45, now, 0.12);
    } catch (e) {}
    return true;
  }

  function actualizar() {
    crearBoton();
    if (!activo || !stream || !id()) return;
    const cerca = new Set(cercanos().map((o) => o.id));
    for (const o of cercanos()) {
      if (!peers.has(o.id) && id() < o.id) abrirPeer(o.id, true);
    }
    for (const [pid, p] of peers) {
      const ok = cerca.has(pid) && actualizarAudio(p);
      if (!ok) {
        cerrarPeer(p);
        peers.delete(pid);
      }
    }
  }

  function conectarAudio(p, remoteStream) {
    const ctx = ctxAudio();
    if (!ctx) {
      const a = document.createElement('audio');
      a.autoplay = true;
      a.playsInline = true;
      a.srcObject = remoteStream;
      document.body.appendChild(a);
      p.audio = a;
      return;
    }
    try {
      const source = ctx.createMediaStreamSource(remoteStream);
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      gain.gain.value = 0.01;
      dry.gain.value = 0.92;
      wet.gain.value = 0.12;
      source.connect(gain);
      if (pan) {
        gain.connect(pan);
        pan.connect(dry);
        if (reverb) pan.connect(wet);
      } else {
        gain.connect(dry);
        if (reverb) gain.connect(wet);
      }
      dry.connect(ctx.destination);
      if (reverb) {
        wet.connect(reverb);
        reverb.connect(ctx.destination);
      }
      Object.assign(p, { source, gain, pan, dry, wet });
      actualizarAudio(p);
    } catch (e) {}
  }

  function abrirPeer(pid, inicia) {
    if (!activo || !stream) return null;
    if (peers.has(pid)) return peers.get(pid);
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    const p = { id: pid, pc, audio: null };
    peers.set(pid, p);
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    pc.onicecandidate = (ev) => {
      if (ev.candidate) enviar({ t: 'voz', to: pid, kind: 'ice', data: ev.candidate.toJSON() });
    };
    pc.ontrack = (ev) => conectarAudio(p, ev.streams[0]);
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        cerrarPeer(p);
        peers.delete(pid);
      }
    };
    if (inicia) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => enviar({ t: 'voz', to: pid, kind: 'offer', data: pc.localDescription.toJSON() }))
        .catch(() => {});
    }
    return p;
  }

  function cerrarPeer(p) {
    try { p.pc.close(); } catch (e) {}
    try { p.source?.disconnect(); } catch (e) {}
    try { p.gain?.disconnect(); } catch (e) {}
    try { p.pan?.disconnect(); } catch (e) {}
    try { p.dry?.disconnect(); } catch (e) {}
    try { p.wet?.disconnect(); } catch (e) {}
    if (p.audio) p.audio.remove();
  }

  async function recibir(m) {
    if (!activo || !stream || !m.from) return;
    const o = remoto(m.from);
    if (!o || dist(o) > RADIO_CORTE) return;
    let p = peers.get(m.from) || abrirPeer(m.from, false);
    if (!p) return;
    try {
      if (m.kind === 'offer') {
        await p.pc.setRemoteDescription(new RTCSessionDescription(m.data));
        const answer = await p.pc.createAnswer();
        await p.pc.setLocalDescription(answer);
        enviar({ t: 'voz', to: m.from, kind: 'answer', data: p.pc.localDescription.toJSON() });
      } else if (m.kind === 'answer') {
        await p.pc.setRemoteDescription(new RTCSessionDescription(m.data));
      } else if (m.kind === 'ice') {
        await p.pc.addIceCandidate(new RTCIceCandidate(m.data));
      }
      actualizarAudio(p);
    } catch (e) {}
  }

  window.Voz = { activar, desactivar, actualizar, recibir, get activo() { return activo; } };
  window.addEventListener('load', crearBoton);
})();
