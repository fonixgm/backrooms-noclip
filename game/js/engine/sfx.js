// Sonido v5: ambiente único por nivel (archivo del usuario > audio de la wiki >
// receta sintetizada de la ficha > bioma), efectos, pasos por material, cues de
// entidades y volumen regulable. WebAudio puro, sin dependencias.
(function () {
  let ctx = null, master = null;
  let muted = false, vol = 0.5;
  try {
    muted = localStorage.getItem('backrooms-mute') === '1';
    const v = parseFloat(localStorage.getItem('backrooms-vol'));
    if (!isNaN(v)) vol = Math.max(0, Math.min(1, v));
  } catch (e) {}
  let ambientStop = null;
  let ambientAudioEl = null;
  const overrides = {};

  const NOMBRES = ['paso', 'golpe', 'dano', 'recoger', 'dado', 'puerta', 'registrar', 'muerte', 'victoria', 'latido', 'ui'];
  for (const n of NOMBRES) {
    for (const ext of ['mp3', 'ogg', 'wav']) {
      const el = new window.Audio();
      el.addEventListener('canplaythrough', () => { if (!overrides[n]) overrides[n] = el; }, { once: true });
      el.src = 'assets/sounds/' + n + '.' + ext;
      el.preload = 'auto';
    }
  }

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : vol;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }

  function unlock() {
    try {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }

  // ---------- bloques de síntesis ----------
  function noiseBuffer(dur) {
    const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function ruido(dur, freq, gain, type = 'lowpass', slideTo) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f).connect(g).connect(master);
    src.start();
  }

  function tono(freq, dur, gain, type = 'sine', slideTo) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(master);
    o.start(); o.stop(ctx.currentTime + dur + 0.05);
  }

  // ---------- efectos ----------
  const PASOS = {
    moqueta: () => ruido(0.08, 500, 0.07),
    hormigon: () => ruido(0.06, 1400, 0.09, 'bandpass'),
    baldosa: () => ruido(0.05, 2000, 0.09, 'bandpass'),
    baldosa_oscura: () => ruido(0.05, 2000, 0.09, 'bandpass'),
    piedra: () => ruido(0.06, 1600, 0.09, 'bandpass'),
    adoquin: () => ruido(0.06, 1500, 0.09, 'bandpass'),
    tablones: () => { ruido(0.07, 800, 0.09); if (Math.random() < 0.2) tono(120, 0.16, 0.05, 'triangle', 90); },
    tablones_claros: () => { ruido(0.07, 800, 0.09); if (Math.random() < 0.2) tono(120, 0.16, 0.05, 'triangle', 90); },
    moqueta_cenefa: () => ruido(0.08, 500, 0.07),
    rejilla: () => { ruido(0.05, 2400, 0.07, 'bandpass'); tono(340, 0.09, 0.05, 'triangle', 280); },
    panel: () => ruido(0.06, 1800, 0.08, 'bandpass'),
    nieve: () => ruido(0.12, 350, 0.11),
    tierra: () => ruido(0.08, 600, 0.08),
    hierba: () => ruido(0.09, 500, 0.08),
    negro: () => ruido(0.08, 400, 0.06),
    blanco: () => { ruido(0.05, 2200, 0.08, 'bandpass'); setTimeout(() => ctx && ruido(0.09, 1400, 0.025, 'bandpass'), 120); },
  };

  let pasoAlt = false;
  const SYNTH = {
    paso(material) {
      pasoAlt = !pasoAlt;
      (PASOS[material] ?? PASOS.moqueta)();
    },
    golpe() { tono(90, 0.18, 0.5, 'triangle', 45); ruido(0.16, 1600, 0.28, 'bandpass'); },
    dano() { tono(160, 0.22, 0.32, 'sawtooth', 70); },
    recoger() { tono(660, 0.09, 0.2, 'sine'); setTimeout(() => ctx && tono(990, 0.12, 0.18), 70); },
    dado() {
      for (let i = 0; i < 6; i++)
        setTimeout(() => ctx && ruido(0.05, 2500 + Math.random() * 1500, 0.12, 'bandpass'), i * 110 + Math.random() * 40);
    },
    puerta() { ruido(0.35, 300, 0.22, 'lowpass', 90); tono(70, 0.3, 0.22, 'sine', 45); },
    registrar() { ruido(0.28, 1800, 0.14, 'bandpass', 500); tono(210, 0.12, 0.1, 'square', 190); },
    muerte() { tono(220, 1.4, 0.4, 'sawtooth', 40); ruido(1.2, 500, 0.2, 'lowpass', 60); },
    victoria() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => ctx && tono(f, 0.5, 0.2), i * 160)); },
    latido() { tono(55, 0.12, 0.5, 'sine', 40); setTimeout(() => ctx && tono(50, 0.14, 0.4, 'sine', 38), 180); },
    ui() { tono(440, 0.05, 0.06, 'sine'); },
  };

  // cues cuando una entidad te detecta (canon de cada criatura)
  const CUES = {
    hound() { tono(140, 0.4, 0.25, 'sawtooth', 70); ruido(0.4, 700, 0.14, 'bandpass', 300); },
    smiler() { ruido(0.8, 5000, 0.09, 'highpass', 2000); },              // siseo susurrado
    aranea() { tono(480, 0.07, 0.22, 'square'); setTimeout(() => ctx && tono(390, 0.07, 0.2, 'square'), 110); }, // clank metálico
    hunter() { tono(60, 0.3, 0.4, 'sine', 42); setTimeout(() => ctx && tono(58, 0.3, 0.4, 'sine', 40), 380); },  // pasos graves
    anethika() { ruido(0.5, 900, 0.16, 'bandpass', 200); },
    duller() { tono(90, 0.7, 0.18, 'sine', 60); },
    generico() { ruido(0.4, 2500, 0.1, 'highpass'); },
  };
  function cue(glyph) {
    try {
      if (muted || !ctx) return;
      (CUES[glyph] ?? CUES.generico)();
    } catch (e) {}
  }

  function play(nombre, arg) {
    try {
      if (muted) return;
      const ov = overrides[nombre];
      if (ov) { const el = ov.cloneNode(); el.volume = vol; el.play().catch(() => {}); return; }
      if (!ctx) return;
      SYNTH[nombre]?.(arg);
    } catch (e) {}
  }

  // ---------- recetas de ambiente por nivel ----------
  // cada receta devuelve nodos; el gain común hace fade in/out
  const RECETAS = {
    // EL zumbido clásico de las Backrooms: senos suaves 120/240/100 Hz con
    // batido lento, respiración de amplitud y soplo agudo mínimo. Sin asperezas.
    hum_clasico(g, nodes) {
      for (const [f, v] of [[120, 0.42], [240, 0.14], [100, 0.16], [360, 0.04]]) {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = f + (Math.random() - 0.5) * 0.6; // batido
        const og = ctx.createGain(); og.gain.value = v;
        o.connect(og).connect(g); o.start();
        nodes.push(o);
      }
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.16;       // respiración
      const lg = ctx.createGain(); lg.gain.value = 0.055;
      lfo.connect(lg).connect(g.gain); lfo.start();
      nodes.push(lfo);
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(2); n.loop = true;
      const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 7500;
      const ng = ctx.createGain(); ng.gain.value = 0.012;
      n.connect(nf).connect(ng).connect(g); n.start();
      nodes.push(n);
      // micro-corte de flicker ocasional
      const flick = setInterval(() => {
        if (!ctx || muted) return;
        if (Math.random() < 0.25) {
          g.gain.setValueAtTime(g.gain.value * 0.4, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.25);
        }
      }, 4000);
      nodes.push({ stop: () => clearInterval(flick) });
    },
    hum_suave(g, nodes) {
      for (const [f, v] of [[120, 0.28], [240, 0.08]]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = v;
        o.connect(og).connect(g); o.start(); nodes.push(o);
      }
    },
    futurista(g, nodes) {
      RECETAS.hum_suave(g, nodes);
      const beep = setInterval(() => {
        if (ctx && !muted && Math.random() < 0.5) tono(1180, 0.09, 0.03, 'sine');
      }, 5200);
      nodes.push({ stop: () => clearInterval(beep) });
    },
    goteo_tuberias(g, nodes) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 66;
      const og = ctx.createGain(); og.gain.value = 0.4;
      o.connect(og).connect(g); o.start(); nodes.push(o);
      const drip = setInterval(() => {
        if (ctx && !muted) tono(900 + Math.random() * 900, 0.07, 0.05, 'sine', 420);
      }, 2400 + Math.random() * 1600);
      nodes.push({ stop: () => clearInterval(drip) });
    },
    maquinas(g, nodes) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 47;
      const og = ctx.createGain(); og.gain.value = 0.12;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      o.connect(f).connect(og).connect(g); o.start(); nodes.push(o);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.8;
      const lg = ctx.createGain(); lg.gain.value = 0.05;
      lfo.connect(lg).connect(g.gain); lfo.start(); nodes.push(lfo);
    },
    relojes(g, nodes) {
      for (const periodo of [1000, 1130, 870]) {
        const iv = setInterval(() => {
          if (ctx && !muted) ruido(0.03, 3200, 0.05, 'bandpass');
        }, periodo);
        nodes.push({ stop: () => clearInterval(iv) });
      }
    },
    feria(g, nodes) {
      // caja de música lenta y desafinada
      const melodia = [392, 440, 392, 330, 294, 330, 392, 0, 440, 494, 440, 392, 0, 0];
      let i = 0;
      const iv = setInterval(() => {
        if (!ctx || muted) return;
        const f = melodia[i % melodia.length];
        if (f) tono(f * (1 + (Math.random() - 0.5) * 0.012), 0.55, 0.05, 'triangle');
        i++;
      }, 620);
      nodes.push({ stop: () => clearInterval(iv) });
      RECETAS.hum_suave(g, nodes);
    },
    estatica_nave(g, nodes) {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(3); n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const ng = ctx.createGain(); ng.gain.value = 0.35;
      n.connect(f).connect(ng).connect(g); n.start(); nodes.push(n);
      const ping = setInterval(() => {
        if (ctx && !muted && Math.random() < 0.35) tono(660, 1.2, 0.03, 'sine', 640);
      }, 7000);
      nodes.push({ stop: () => clearInterval(ping) });
    },
    susurros(g, nodes) {
      const iv = setInterval(() => {
        if (!ctx || muted || Math.random() > 0.55) return;
        // ráfaga con forma de susurro
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(0.7);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
        f.frequency.setValueAtTime(1400, ctx.currentTime);
        f.frequency.linearRampToValueAtTime(2600, ctx.currentTime + 0.35);
        f.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.7);
        const sg = ctx.createGain();
        sg.gain.setValueAtTime(0.0001, ctx.currentTime);
        sg.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.2);
        sg.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
        src.connect(f).connect(sg).connect(master);
        src.start();
      }, 5200);
      nodes.push({ stop: () => clearInterval(iv) });
      RECETAS.silencio_sub(g, nodes);
    },
    viento(g, nodes) {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(3); n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
      const lg = ctx.createGain(); lg.gain.value = 220;
      lfo.connect(lg).connect(f.frequency); lfo.start();
      const ng = ctx.createGain(); ng.gain.value = 0.6;
      n.connect(f).connect(ng).connect(g); n.start();
      nodes.push(n, lfo);
    },
    viento_nieve(g, nodes) {
      RECETAS.viento(g, nodes);
      const camp = setInterval(() => {
        if (ctx && !muted && Math.random() < 0.3) tono(1560, 1.8, 0.02, 'sine');
      }, 9000);
      nodes.push({ stop: () => clearInterval(camp) });
    },
    silencio_sub(g, nodes) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 42;
      const og = ctx.createGain(); og.gain.value = 0.3;
      o.connect(og).connect(g); o.start(); nodes.push(o);
    },
    invernadero(g, nodes) {
      RECETAS.viento(g, nodes);
      const tin = setInterval(() => {
        if (ctx && !muted && Math.random() < 0.4) tono(2100 + Math.random() * 600, 0.5, 0.02, 'sine');
      }, 6500);
      nodes.push({ stop: () => clearInterval(tin) });
    },
    oscuridad(g, nodes) {
      RECETAS.silencio_sub(g, nodes);
      const crujido = setInterval(() => {
        if (ctx && !muted && Math.random() < 0.4) ruido(0.2, 250, 0.06, 'lowpass', 90);
      }, 6000);
      nodes.push({ stop: () => clearInterval(crujido) });
    },
    cristales(g, nodes) {
      RECETAS.silencio_sub(g, nodes);
      const tin = setInterval(() => {
        if (ctx && !muted && Math.random() < 0.5) {
          const f = 1800 + Math.random() * 1400;
          tono(f, 1.4, 0.025, 'sine');
          setTimeout(() => ctx && tono(f * 1.5, 1.2, 0.015, 'sine'), 200);
        }
      }, 7000);
      nodes.push({ stop: () => clearInterval(tin) });
    },
    piscina(g, nodes) {
      RECETAS.hum_suave(g, nodes);
      const agua = setInterval(() => {
        if (ctx && !muted) ruido(0.6, 500, 0.045, 'lowpass', 200);
      }, 3200);
      nodes.push({ stop: () => clearInterval(agua) });
    },
    crujidos(g, nodes) {
      RECETAS.silencio_sub(g, nodes);
      const cru = setInterval(() => {
        if (ctx && !muted && Math.random() < 0.5) tono(110, 0.3, 0.05, 'triangle', 70);
      }, 5000);
      nodes.push({ stop: () => clearInterval(cru) });
    },
    ciudad_noche(g, nodes) { RECETAS.viento(g, nodes); },
  };

  const RECETA_BIOMA = {
    pasillos: 'hum_clasico', garaje: 'hum_suave', tuneles: 'goteo_tuberias',
    hospital: 'hum_suave', oficinas: 'hum_suave', exterior: 'viento',
    bosque: 'viento', ciudad: 'ciudad_noche', torres: 'viento',
  };

  function stopAmbient() {
    try { ambientStop?.(); } catch (e) {}
    ambientStop = null;
    ambientAudioEl = null;
  }

  function ambientSynth(levelDef) {
    if (!ctx) return;
    const nodes = [];
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 2);
    g.connect(master);
    const receta = RECETAS[levelDef.sonido] ?? RECETAS[RECETA_BIOMA[levelDef.bioma]] ?? RECETAS.hum_suave;
    receta(g, nodes);
    ambientStop = () => {
      try { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6); } catch (e) {}
      setTimeout(() => nodes.forEach((x) => { try { x.stop(); } catch (e) {} }), 700);
    };
  }

  function ambient(levelDef) {
    try {
      stopAmbient();
      if (muted) return;
      // 1) archivo del nivel (del usuario o de la wiki): prueba extensiones en cadena
      const candidatos = [];
      const wikiSrc = (window.AUDIO_MANIFEST || {})[levelDef.id];
      if (wikiSrc) candidatos.push(wikiSrc);
      for (const ext of ['mp3', 'wav', 'ogg']) {
        const ruta = `assets/sounds/niveles/${levelDef.id}.${ext}`;
        if (ruta !== wikiSrc) candidatos.push(ruta);
      }
      let i = 0;
      const intenta = () => {
        if (i >= candidatos.length) { if (ctx) ambientSynth(levelDef); return; }
        const el = new window.Audio(candidatos[i++]);
        el.loop = true;
        el.volume = 0.62 * vol;
        el.addEventListener('error', intenta, { once: true });
        el.play().then(() => {
          ambientAudioEl = el;
          ambientStop = () => { el.pause(); el.src = ''; };
        }).catch(intenta);
      };
      intenta();
    } catch (e) {}
  }

  // latido con cordura baja
  setInterval(() => {
    try {
      const w = window.Game?.world;
      if (!w || !w.player || w.over || muted || !ctx) return;
      if (w.player.cordura < 25 && w.level) SYNTH.latido();
    } catch (e) {}
  }, 1600);

  function setVolume(v) {
    vol = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('backrooms-vol', String(vol)); } catch (e) {}
    if (master && !muted) master.gain.value = vol;
    if (ambientAudioEl) ambientAudioEl.volume = 0.62 * vol;
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('backrooms-mute', muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = muted ? 0 : vol;
    if (muted) stopAmbient();
    else if (window.Game?.world?.level) ambient(window.Game.world.level);
    return muted;
  }

  window.Sfx = {
    unlock, play, cue, ambient, stopAmbient, toggleMute, setVolume,
    get muted() { return muted; },
    get volumen() { return vol; },
  };
})();
