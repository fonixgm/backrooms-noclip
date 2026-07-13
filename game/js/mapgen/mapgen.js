// Generación procedural de mapas por arquetipo de bioma.
// Tiles: 0 suelo · 1 pared · 2 vacío · 3 agua · 4 decorado · 5 estantería · 6 libros · 7 charco · 8 obstáculo
(function () {
  const T = {
    SUELO: 0, PARED: 1, VACIO: 2, AGUA: 3, DECOR: 4,
    ESTANTERIA: 5, LIBROS: 6, CHARCO: 7, OBSTACULO: 8,
  };

  function grid(w, h, fill) {
    return { w, h, t: new Uint8Array(w * h).fill(fill) };
  }
  const at = (g, x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? T.PARED : g.t[y * g.w + x]);
  const set = (g, x, y, v) => { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.t[y * g.w + x] = v; };
  const walkable = (v) => v === T.SUELO || v === T.AGUA || v === T.DECOR || v === T.LIBROS || v === T.CHARCO;

  // ---------- arquetipos ----------

  // Laberinto denso con salas abiertas (Level 0, 27, 130, 483...)
  // v11: se genera a 1/3 de resolución y se escala ×3 → pasillos de 3 huecos
  // (cabe un mueble de 1 tile y quedan 2 libres).
  function genPasillos(w, h, rng, opts = {}) {
    const hw = Math.ceil(w / 3), hh = Math.ceil(h / 3);
    const small = grid(hw, hh, T.PARED);
    const cw = Math.floor((hw - 1) / 2), ch = Math.floor((hh - 1) / 2);
    const seen = new Set();
    const stack = [[0, 0]];
    seen.add('0,0');
    set(small, 1, 1, T.SUELO);
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const dirs = rng.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      let moved = false;
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || seen.has(nx + ',' + ny)) continue;
        seen.add(nx + ',' + ny);
        set(small, cx * 2 + 1 + dx, cy * 2 + 1 + dy, T.SUELO);
        set(small, nx * 2 + 1, ny * 2 + 1, T.SUELO);
        stack.push([nx, ny]);
        moved = true;
        break;
      }
      if (!moved) stack.pop();
    }
    // escala ×3 al tamaño real, con borde exterior de pared
    const g = grid(w, h, T.PARED);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++)
        g.t[y * w + x] = small.t[((y / 3) | 0) * hw + ((x / 3) | 0)];
    // abre salas y atajos para que respire
    const salas = opts.salas ?? 8;
    const minW = opts.salaMinW ?? 3, maxW = opts.salaMaxW ?? 6;
    const minH = opts.salaMinH ?? 3, maxH = opts.salaMaxH ?? 5;
    const separacion = opts.separacionSalas ?? 0;
    const rects = [];
    for (let creadas = 0, intentos = 0; creadas < salas && intentos < salas * 16; intentos++) {
      const rw = rng.int(minW, maxW), rh = rng.int(minH, maxH);
      const rx = rng.int(1, w - rw - 2), ry = rng.int(1, h - rh - 2);
      const piezas = [{ x: rx, y: ry, w: rw, h: rh }];
      // Level 0: algunas salas reciben un anexo desplazado. Solo se ABRE suelo,
      // nunca se cierran corredores existentes, por lo que no rompe conectividad.
      if (opts.irregulares && rng.chance(0.55)) {
        const aw = rng.int(2, Math.max(2, Math.floor(rw * 0.7)));
        const ah = rng.int(2, Math.max(2, Math.floor(rh * 0.7)));
        const ax = Math.max(1, Math.min(w - aw - 2,
          rx + rng.pick([-Math.floor(aw * 0.6), rw - Math.floor(aw * 0.4)])));
        const ay = Math.max(1, Math.min(h - ah - 2,
          ry + rng.int(0, Math.max(0, rh - ah))));
        piezas.push({ x: ax, y: ay, w: aw, h: ah });
      }
      const x0 = Math.min(...piezas.map((r) => r.x));
      const y0 = Math.min(...piezas.map((r) => r.y));
      const x1 = Math.max(...piezas.map((r) => r.x + r.w));
      const y1 = Math.max(...piezas.map((r) => r.y + r.h));
      const union = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      const solapa = rects.some((r) =>
        union.x < r.x + r.w + separacion && union.x + union.w + separacion > r.x &&
        union.y < r.y + r.h + separacion && union.y + union.h + separacion > r.y);
      if (solapa) continue;
      for (const p of piezas)
        for (let y = p.y; y < p.y + p.h; y++)
          for (let x = p.x; x < p.x + p.w; x++) set(g, x, y, T.SUELO);
      rects.push(union);
      creadas++;
    }
    for (let i = 0; i < (opts.atajos ?? w); i++) {
      const x = rng.int(2, w - 3), y = rng.int(2, h - 3);
      if (at(g, x, y) === T.PARED &&
        ((walkable(at(g, x - 1, y)) && walkable(at(g, x + 1, y))) ||
         (walkable(at(g, x, y - 1)) && walkable(at(g, x, y + 1)))))
        if (rng.chance(0.4)) set(g, x, y, T.SUELO);
    }
    // Conserva el contrato común de todos los generadores (devolver la
    // cuadrícula) y adjunta las salas como metadato para Sala Manila.
    g._rects = rects;
    return g;
  }

  // Level 0.01: corredores muy largos y paralelos. La estructura conserva
  // cruces suficientes para jugar, pero obliga a recorrer ejes longitudinales
  // en lugar de serpentear por el laberinto celular de Level 0.
  function genLaberintoLongitudinal(w, h, rng) {
    const g = grid(w, h, T.PARED);
    const bandas = [];
    for (let y = 5; y < h - 4; y += 10) {
      bandas.push(y);
      for (let x = 1; x < w - 1; x++) for (let dy = -1; dy <= 1; dy++) set(g, x, y + dy, T.SUELO);
      // Ensanchamientos escasos: descansos visuales, nunca una retícula de salas.
      for (let x = rng.int(12, 20); x < w - 12; x += rng.int(20, 34)) {
        const arriba = rng.chance(0.5);
        const y0 = arriba ? y - 5 : y + 2;
        for (let yy = y0; yy < y0 + 4; yy++) for (let xx = x; xx < x + rng.int(6, 11); xx++) set(g, xx, yy, T.SUELO);
      }
    }
    // Conectores alternos garantizan un único componente sin borrar la lectura
    // horizontal. Algunos son torcidos para que la repetición no sea perfecta.
    for (let i = 0; i < bandas.length - 1; i++) {
      const x = 10 + ((i * 23 + rng.int(0, 12)) % Math.max(14, w - 24));
      for (let y = bandas[i]; y <= bandas[i + 1]; y++) for (let dx = -1; dx <= 1; dx++) set(g, x + dx, y, T.SUELO);
      if (rng.chance(0.65)) {
        const x2 = Math.min(w - 8, x + rng.int(18, 36));
        for (let y = bandas[i]; y <= bandas[i + 1]; y++) set(g, x2, y, T.SUELO);
      }
    }
    // El extremo oriental ya muestra daños; durante la partida la regla
    // ambiental amplifica esos síntomas según la distancia caminada.
    let deterioradas = 0;
    for (let y = 2; y < h - 2; y++) for (let x = Math.floor(w * 0.62); x < w - 2; x++) {
      if (at(g, x, y) === T.SUELO && rng.chance(((x / w) - 0.55) * 0.12)) {
        set(g, x, y, T.DECOR); deterioradas++;
      }
    }
    g._longitudinal = { bandas: bandas.length, eje: 'x', deterioradas };
    return g;
  }

  // Espacio abierto con pilares (Level 1)
  function genGaraje(w, h, rng, opts = {}) {
    const g = grid(w, h, T.SUELO);
    for (let x = 0; x < w; x++) { set(g, x, 0, T.PARED); set(g, x, h - 1, T.PARED); }
    for (let y = 0; y < h; y++) { set(g, 0, y, T.PARED); set(g, w - 1, y, T.PARED); }
    for (let y = 4; y < h - 4; y += rng.int(5, 7))
      for (let x = 4; x < w - 4; x += rng.int(5, 7)) {
        set(g, x, y, T.PARED); set(g, x + 1, y, T.PARED);
        set(g, x, y + 1, T.PARED); set(g, x + 1, y + 1, T.PARED);
      }
    // muros parciales y coches (decoración sólida)
    for (let i = 0; i < 10; i++) {
      const x = rng.int(4, w - 8), y = rng.int(4, h - 5), len = rng.int(3, 7);
      if (rng.chance(0.5)) for (let j = 0; j < len; j++) set(g, x + j, y, T.PARED);
      else for (let j = 0; j < len; j++) set(g, x, y + j, T.PARED);
    }
    for (let i = 0; i < 26; i++) set(g, rng.int(2, w - 3), rng.int(2, h - 3), T.DECOR);
    if (opts.level1) {
      const props = [];
      // Charcos persistentes de agua de almendras: transitables pero más
      // lentos, y visualmente responsables de la niebla del nivel.
      for (let i = 0; i < Math.max(5, Math.floor(w * h / 900)); i++) {
        const cx = rng.int(4, w - 5), cy = rng.int(4, h - 5);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
          if ((dx * dx) / 4 + dy * dy > 1.4 || !walkable(at(g, cx + dx, cy + dy))) continue;
          set(g, cx + dx, cy + dy, T.CHARCO);
        }
      }
      // Los coches son deliberadamente rarísimos. Cada uno ocupa dos tiles
      // sólidos: se ven como vehículos y no se atraviesan como una pegatina.
      const cars = Math.max(1, Math.min(3, Math.floor(w * h / 3200) + 1));
      for (let i = 0; i < cars; i++) {
        for (let intento = 0; intento < 80; intento++) {
          const x = rng.int(4, w - 6), y = rng.int(4, h - 5);
          if (!walkable(at(g, x, y)) || !walkable(at(g, x + 1, y))) continue;
          set(g, x, y, T.OBSTACULO); set(g, x + 1, y, T.OBSTACULO);
          props.push({ x, y, id: 'coche', ancho: 2, color: rng.pick(['rojo', 'azul', 'blanco', 'negro']) });
          break;
        }
      }
      g._propsEstructurales = props;
      g._garaje = {
        charcos: [...g.t].filter((tile) => tile === T.CHARCO).length,
        coches: props.length,
      };
    }
    return g;
  }

  // Túneles serpenteantes (Level 2, 268, The Hub, L13) — v11: a 1/3 de
  // resolución escalado ×3 → túneles de 3 de ancho.
  function genTuneles(w, h, rng, opts = {}) {
    const hw = Math.ceil(w / 3), hh = Math.ceil(h / 3);
    const small = grid(hw, hh, T.PARED);
    let x = rng.int(2, hw - 3), y = rng.int(2, hh - 3);
    const walkers = opts.walkers ?? 5;
    for (let k = 0; k < walkers; k++) {
      let wx = x, wy = y, dir = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      for (let i = 0; i < hw * 4; i++) {
        set(small, wx, wy, T.SUELO);
        if (rng.chance(0.22)) dir = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        wx = Math.max(1, Math.min(hw - 2, wx + dir[0]));
        wy = Math.max(1, Math.min(hh - 2, wy + dir[1]));
      }
      const floors = collectFloors(small);
      const p = rng.pick(floors); x = p[0]; y = p[1];
    }
    const g = grid(w, h, T.PARED);
    for (let yy = 1; yy < h - 1; yy++)
      for (let xx = 1; xx < w - 1; xx++)
        g.t[yy * w + xx] = small.t[((yy / 3) | 0) * hw + ((xx / 3) | 0)];
    return g;
  }

  // Ala de hospital (Level 14, 16, 188): varias alas horizontales APILADAS
  // (según la altura disponible) unidas por un pasillo vertical, con
  // habitaciones UNIFORMES en "peine" a ambos lados de cada ala (alguna más
  // grande: quirófano/almacén) — más rígido y repetitivo que el BSP orgánico
  // de oficinas, como la planta real de un edificio. El ala central aloja el
  // puesto de enfermería, donde confluye el pasillo vertical.
  function genHospital(w, h, rng) {
    const g = grid(w, h, T.PARED);
    const room = (x, y, rw, rh) => {
      for (let yy = Math.max(1, y); yy < Math.min(h - 1, y + rh); yy++)
        for (let xx = Math.max(1, x); xx < Math.min(w - 1, x + rw); xx++) set(g, xx, yy, T.SUELO);
    };
    const roomW = 5, roomH = 5, paso = roomW + 2;

    // reparte N alas horizontales en el alto disponible (cada una necesita
    // sitio para una fila de habitaciones arriba y otra abajo)
    const yMin = roomH + 3, yMax = h - roomH - 4;
    const nBandas = Math.max(2, Math.min(4, Math.floor((yMax - yMin) / (roomH * 2 + 5)) + 1));
    const bandas = [];
    for (let i = 0; i < nBandas; i++)
      bandas.push(Math.round(yMin + (nBandas === 1 ? 0 : (i * (yMax - yMin)) / (nBandas - 1))));

    const midX = Math.floor(w / 2);
    room(midX - 1, 2, 2, h - 4); // pasillo vertical, de punta a punta
    for (const y of bandas) room(2, y - 1, w - 4, 2); // cada ala horizontal

    const hubBanda = bandas[Math.floor(bandas.length / 2)];
    const hubW = Math.min(w - 10, rng.int(8, 11)), hubH = Math.min(roomH * 2 + 1, rng.int(7, 9));
    const hubX = midX - Math.floor(hubW / 2), hubY = hubBanda - Math.floor(hubH / 2);
    room(hubX, hubY, hubW, hubH); // puesto de enfermería

    const peineH = (y, x0, x1) => {
      for (let x = x0; x + roomW <= x1; x += paso) {
        const rw = rng.chance(0.2) ? roomW + 3 : roomW; // de vez en cuando, quirófano
        const puerta = x + Math.floor(rw / 2);
        if (y - 3 - roomH > 1) { room(x, y - 3 - roomH, rw, roomH); set(g, puerta, y - 2, T.SUELO); }
        if (y + 2 + roomH < h - 1) { room(x, y + 2, rw, roomH); set(g, puerta, y + 1, T.SUELO); }
      }
    };
    for (const y of bandas) {
      if (y === hubBanda) {
        peineH(y, 4, hubX - 2);
        peineH(y, hubX + hubW + 2, w - roomW - 2);
      } else {
        peineH(y, 4, midX - 3);
        peineH(y, midX + 3, w - roomW - 2);
      }
    }
    return g;
  }

  // Habitaciones BSP + corredores (oficinas, hoteles)
  function genOficinas(w, h, rng) {
    const g = grid(w, h, T.PARED);
    const rooms = [];
    function split(x, y, rw, rh, depth) {
      if (depth <= 0 || (rw < 12 && rh < 12)) {
        const pw = rng.int(Math.max(4, rw - 6), rw - 2);
        const ph = rng.int(Math.max(3, rh - 6), rh - 2);
        const px = x + rng.int(1, Math.max(1, rw - pw - 1));
        const py = y + rng.int(1, Math.max(1, rh - ph - 1));
        rooms.push({ x: px, y: py, w: pw, h: ph });
        for (let yy = py; yy < py + ph; yy++)
          for (let xx = px; xx < px + pw; xx++) set(g, xx, yy, T.SUELO);
        return;
      }
      if (rw > rh) {
        const cut = rng.int(Math.floor(rw * 0.35), Math.floor(rw * 0.65));
        split(x, y, cut, rh, depth - 1);
        split(x + cut, y, rw - cut, rh, depth - 1);
      } else {
        const cut = rng.int(Math.floor(rh * 0.35), Math.floor(rh * 0.65));
        split(x, y, rw, cut, depth - 1);
        split(x, y + cut, rw, rh - cut, depth - 1);
      }
    }
    split(1, 1, w - 2, h - 2, 4);
    // conecta habitaciones consecutivas con pasillos en L de 2 de ancho (v11)
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      let x1 = Math.floor(a.x + a.w / 2), y1 = Math.floor(a.y + a.h / 2);
      const x2 = Math.floor(b.x + b.w / 2), y2 = Math.floor(b.y + b.h / 2);
      while (x1 !== x2) { set(g, x1, y1, T.SUELO); set(g, x1, y1 + 1, T.SUELO); x1 += Math.sign(x2 - x1); }
      while (y1 !== y2) { set(g, x1, y1, T.SUELO); set(g, x1 + 1, y1, T.SUELO); y1 += Math.sign(y2 - y1); }
    }
    return g;
  }

  // The End no es una biblioteca académica ni cuatro laberintos de anaqueles:
  // es una librería comercial tipo Borders abandonada. La mitad delantera es
  // una sala de venta muy abierta, con caja, expositores, pilares y rótulos;
  // al fondo quedan hileras bajas de estanterías separadas por pasillos anchos.
  function genBiblioteca(w, h, rng) {
    const g = grid(w, h, T.SUELO);
    for (let x = 0; x < w; x++) { set(g, x, 0, T.PARED); set(g, x, h - 1, T.PARED); }
    for (let y = 0; y < h; y++) { set(g, 0, y, T.PARED); set(g, w - 1, y, T.PARED); }
    const midX = Math.floor(w / 2);
    const pasillo = Math.max(7, Math.min(11, Math.floor(w / 11) | 1));
    const fondoHasta = h - 27;
    const props = [];

    // Dos bloques de hileras bajas. Cada fila tiene un corte irregular, como
    // si faltase un módulo o alguien hubiese desplazado una estantería.
    const fila = (x0, x1, y) => {
      const hueco = rng.int(x0 + 5, x1 - 5);
      for (let x = x0 + rng.int(0, 1); x <= x1 - rng.int(0, 1); x++) {
        if (Math.abs(x - hueco) <= 1) continue;
        set(g, x, y, T.ESTANTERIA);
      }
    };
    for (let y = 6; y <= fondoHasta; y += 5) {
      fila(5, midX - Math.ceil(pasillo / 2) - 1, y);
      fila(midX + Math.ceil(pasillo / 2) + 1, w - 6, y);
    }

    // Dos zonas sin anaqueles rompen la repetición y funcionan como áreas de
    // lectura/exposición, como las grandes manchas de moqueta de las fotos.
    const readingHalls = [
      { x: 8, y: 13, w: 13, h: 10 },
      { x: w - 23, y: Math.max(9, fondoHasta - 12), w: 14, h: 10 },
    ];
    for (const hall of readingHalls)
      for (let y = hall.y; y < hall.y + hall.h; y++)
        for (let x = hall.x; x < hall.x + hall.w; x++) set(g, x, y, T.SUELO);

    // Pilares cuadrados de centro comercial, siempre en los pasillos entre
    // filas. Son obstáculos reales, no decoración atravesable.
    for (let y = 8; y < h - 20; y += 15) for (let x = 12; x < w - 10; x += 16) {
      if (Math.abs(x - midX) < pasillo / 2 + 1 || at(g, x, y) !== T.SUELO) continue;
      set(g, x, y, T.OBSTACULO);
      props.push({ x, y, id: 'pilar_biblioteca' });
    }

    // Mostrador de caja en U frente al punto de aparición. La abertura trasera
    // evita encerrar al jugador y los terminales descansan sobre el propio mueble.
    const cajaY = h - 15, cajaX0 = midX - 10, cajaX1 = midX + 10;
    for (let x = cajaX0; x <= cajaX1; x++) {
      if (Math.abs(x - midX) <= 1) continue;
      set(g, x, cajaY, T.OBSTACULO);
      props.push({ x, y: cajaY, id: 'mostrador' });
    }
    for (const x of [cajaX0, cajaX1]) for (let y = cajaY - 3; y < cajaY; y++) {
      set(g, x, y, T.OBSTACULO);
      props.push({ x, y, id: 'mostrador', orientacion: 'vertical' });
    }
    for (const x of [cajaX0 + 4, cajaX1 - 4])
      props.push({ x, y: cajaY, id: 'terminal_biblioteca' });

    // Mesas bajas de novedades en la zona abierta. También tienen colisión.
    const expositores = [
      [midX - 20, h - 24], [midX + 18, h - 24],
      [midX - 29, h - 12], [midX + 27, h - 11],
    ];
    for (const [x, y] of expositores) {
      set(g, x, y, T.OBSTACULO);
      props.push({ x, y, id: 'mesa_expositora' });
    }

    // Los dos encuadres icónicos: THE END sobre la caja y THE END IS NEAR al
    // fondo. Al ser carteles suspendidos no bloquean el suelo.
    props.push({ x: midX, y: cajaY, id: 'cartel_the_end' });
    props.push({ x: midX, y: 5, id: 'cartel_the_end_near' });

    let shelfTiles = 0;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) if (at(g, x, y) === T.ESTANTERIA) shelfTiles++;
    g._biblioteca = {
      shelfTiles, corridorWidth: pasillo, readingHalls,
      checkout: { x: cajaX0, y: cajaY, w: cajaX1 - cajaX0 + 1 },
      columns: props.filter((prop) => prop.id === 'pilar_biblioteca').length,
      signs: 2,
    };
    g._propsEstructurales = props;
    g._spawnPool = [];
    for (let y = h - 9; y <= h - 6; y++)
      for (let x = midX - 4; x <= midX + 4; x++) if (at(g, x, y) === T.SUELO) g._spawnPool.push([x, y]);
    return g;
  }

  // Autómata celular: cuevas / exteriores (Level 6, 144, 909, 996)
  function genExterior(w, h, rng, opts = {}) {
    const g = grid(w, h, T.PARED);
    const density = opts.density ?? 0.44;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++)
        if (!rng.chance(density)) set(g, x, y, T.SUELO);
    for (let it = 0; it < 4; it++) {
      const nt = new Uint8Array(g.t);
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          let walls = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              if (at(g, x + dx, y + dy) === T.PARED) walls++;
          nt[y * g.w + x] = walls >= 5 ? T.PARED : T.SUELO;
        }
      g.t = nt;
    }
    return g;
  }

  // Bosque: claros + arboledas + lagos (Level 45, 186, 626)
  function genBosque(w, h, rng, opts = {}) {
    const g = genExterior(w, h, rng, { density: 0.36 });
    if (opts.lagos) {
      for (let i = 0; i < opts.lagos; i++) {
        const cx = rng.int(6, w - 7), cy = rng.int(6, h - 7), r = rng.int(2, 4);
        for (let y = cy - r; y <= cy + r; y++)
          for (let x = cx - r; x <= cx + r; x++)
            if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && at(g, x, y) === T.SUELO)
              set(g, x, y, T.AGUA);
      }
    }
    for (let i = 0; i < 30; i++) set(g, rng.int(2, w - 3), rng.int(2, h - 3), T.DECOR);
    return g;
  }

  // Invernadero flotante (Level 13): corredores lineales de cristal SOBRE EL
  // VACÍO — «afloat amongst an empty, obscure sky». Nada de laberinto.
  function genInvernadero(w, h, rng) {
    const g = grid(w, h, T.VACIO);
    const carve = (x, y, ancho) => {
      for (let dy = 0; dy < ancho; dy++)
        for (let dx = 0; dx < ancho; dx++)
          set(g, x + dx, y + dy, T.SUELO);
    };
    // corredor principal serpenteante: segmentos rectos largos con quiebros
    let x = 4, y = rng.int(Math.floor(h / 3), Math.floor((h * 2) / 3));
    let dirY = 0;
    const hitos = [[x, y]];
    while (x < w - 8) {
      const largo = rng.int(8, 16);
      for (let i = 0; i < largo && x < w - 5; i++) { carve(x, y, 3); x++; }
      hitos.push([x, y]);
      // quiebro vertical
      dirY = rng.pick([-1, 1]);
      const salto = rng.int(4, 9);
      for (let i = 0; i < salto; i++) {
        const ny = y + dirY;
        if (ny < 3 || ny > h - 7) break;
        y = ny;
        carve(x, y, 3);
      }
      hitos.push([x, y]);
    }
    // pasarelas laterales cortas con mirador
    for (const [hx, hy] of rng.shuffle(hitos).slice(0, 4)) {
      const dir = rng.pick([-1, 1]);
      const largo = rng.int(4, 7);
      for (let i = 1; i <= largo; i++) {
        const ny = hy + dir * i;
        if (ny < 3 || ny > h - 6) break;
        carve(hx, ny, 2);
      }
    }
    // salas-jardín con vegetación
    for (let i = 0; i < 3; i++) {
      const [hx, hy] = rng.pick(hitos);
      const rw = rng.int(6, 9), rh = rng.int(5, 8);
      const rx = Math.max(2, Math.min(w - rw - 2, hx - 2));
      const ry = Math.max(2, Math.min(h - rh - 2, hy - 2));
      for (let yy = ry; yy < ry + rh; yy++)
        for (let xx = rx; xx < rx + rw; xx++)
          set(g, xx, yy, rng.chance(0.18) ? T.DECOR : T.SUELO);
    }
    // paredes de cristal: todo borde del suelo que da al vacío
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        if (at(g, xx, yy) !== T.VACIO) continue;
        const vecinoSuelo = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
          walkable(at(g, xx + dx, yy + dy)));
        if (vecinoSuelo) set(g, xx, yy, T.PARED);
      }
    return g;
  }

  // Ciudad y barrios: edificios transitables con fachada, puerta e interior.
  function genCiudad(w, h, rng, opts = {}) {
    const g = grid(w, h, T.SUELO);
    for (let x = 0; x < w; x++) { set(g, x, 0, T.PARED); set(g, x, h - 1, T.PARED); }
    for (let y = 0; y < h; y++) { set(g, 0, y, T.PARED); set(g, w - 1, y, T.PARED); }
    let y = 3;
    while (y < h - 6) {
      let x = 3;
      const bh = rng.int(opts.residencial ? 7 : 8, opts.residencial ? 11 : 14);
      while (x < w - 6) {
        const bw = rng.int(opts.residencial ? 8 : 9, opts.residencial ? 13 : 16);
        const x2 = Math.min(x + bw, w - 3), y2 = Math.min(y + bh, h - 3);
        if (x2 - x >= 6 && y2 - y >= 6 && rng.chance(0.9)) {
          for (let xx = x; xx <= x2; xx++) { set(g, xx, y, T.PARED); set(g, xx, y2, T.PARED); }
          for (let yy = y; yy <= y2; yy++) { set(g, x, yy, T.PARED); set(g, x2, yy, T.PARED); }
          const puerta = rng.int(x + 2, x2 - 2);
          set(g, puerta, y2, T.SUELO);
          if (x2 - x >= 10) {
            const tabique = rng.int(x + 4, x2 - 4);
            for (let yy = y + 1; yy < y2; yy++) set(g, tabique, yy, T.PARED);
            set(g, tabique, rng.int(y + 2, y2 - 2), T.SUELO);
          }
          if (!opts.residencial && y2 - y >= 10) {
            const tabique = rng.int(y + 4, y2 - 4);
            for (let xx = x + 1; xx < x2; xx++) if (at(g, xx, tabique) !== T.PARED) set(g, xx, tabique, T.PARED);
            set(g, rng.int(x + 2, x2 - 2), tabique, T.SUELO);
          }
        }
        x += bw + rng.int(3, 5);
      }
      y += bh + rng.int(4, 6);
    }
    for (let i = 0; i < 32; i++) {
      const x = rng.int(2, w - 3), yy = rng.int(2, h - 3);
      if (at(g, x, yy) === T.SUELO) set(g, x, yy, T.DECOR);
    }
    return g;
  }

  // Torres: plataformas sobre el vacío unidas por vigas (Level 385)
  function genTorres(w, h, rng) {
    const g = grid(w, h, T.VACIO);
    const plats = [];
    const n = rng.int(9, 12);
    for (let i = 0; i < n; i++) {
      const pw = rng.int(5, 9), ph = rng.int(4, 7);
      const px = rng.int(2, w - pw - 3), py = rng.int(2, h - ph - 3);
      plats.push({ x: px, y: py, w: pw, h: ph });
      for (let y = py; y < py + ph; y++)
        for (let x = px; x < px + pw; x++) set(g, x, y, T.SUELO);
    }
    for (let i = 1; i < plats.length; i++) {
      const a = plats[i - 1], b = plats[i];
      let x1 = Math.floor(a.x + a.w / 2), y1 = Math.floor(a.y + a.h / 2);
      const x2 = Math.floor(b.x + b.w / 2), y2 = Math.floor(b.y + b.h / 2);
      while (x1 !== x2) { if (at(g, x1, y1) === T.VACIO) set(g, x1, y1, T.DECOR); x1 += Math.sign(x2 - x1); }
      while (y1 !== y2) { if (at(g, x1, y1) === T.VACIO) set(g, x1, y1, T.DECOR); y1 += Math.sign(y2 - y1); }
    }
    return g;
  }

  // Redes de pasarelas: el espacio negativo domina y los nodos habitables se
  // conectan mediante puentes anchos. Sirve para complejos sobre agua o vacio
  // sin convertirlos en una coleccion de torres inconexas.
  function genPasarelas(w, h, rng) {
    const g = grid(w, h, T.VACIO);
    const nodos = [];
    const carve = (x, y, rw, rh, tile = T.SUELO) => {
      for (let yy = Math.max(1, y); yy < Math.min(h - 1, y + rh); yy++)
        for (let xx = Math.max(1, x); xx < Math.min(w - 1, x + rw); xx++) set(g, xx, yy, tile);
    };
    const total = Math.max(6, Math.floor(w / 17));
    for (let i = 0; i < total; i++) {
      const rw = rng.int(8, 13), rh = rng.int(6, 10);
      const x = Math.min(w - rw - 2, 3 + Math.floor(i * (w - 18) / Math.max(1, total - 1)));
      const banda = i % 3;
      const yCentro = banda === 0 ? Math.floor(h * 0.28) : banda === 1 ? Math.floor(h * 0.7) : Math.floor(h * 0.5);
      const y = Math.max(2, Math.min(h - rh - 2, yCentro - Math.floor(rh / 2) + rng.int(-3, 3)));
      carve(x, y, rw, rh);
      nodos.push({ x, y, w: rw, h: rh, cx: x + Math.floor(rw / 2), cy: y + Math.floor(rh / 2) });
    }
    const bridge = (a, b) => {
      let x = a.cx, y = a.cy;
      while (x !== b.cx) {
        for (let d = -1; d <= 1; d++) if (at(g, x, y + d) === T.VACIO) set(g, x, y + d, T.DECOR);
        x += Math.sign(b.cx - x);
      }
      while (y !== b.cy) {
        for (let d = -1; d <= 1; d++) if (at(g, x + d, y) === T.VACIO) set(g, x + d, y, T.DECOR);
        y += Math.sign(b.cy - y);
      }
    };
    for (let i = 1; i < nodos.length; i++) bridge(nodos[i - 1], nodos[i]);
    if (nodos.length > 4) { bridge(nodos[0], nodos[3]); bridge(nodos[2], nodos[nodos.length - 1]); }

    // Algunas plataformas alojan cabinas o pabellones con una puerta real.
    for (const [i, n] of nodos.entries()) if (i % 2 === 0 && n.w >= 9 && n.h >= 7) {
      const x0 = n.x + 2, y0 = n.y + 2, x1 = n.x + n.w - 3, y1 = n.y + n.h - 3;
      for (let x = x0; x <= x1; x++) { set(g, x, y0, T.PARED); set(g, x, y1, T.PARED); }
      for (let y = y0; y <= y1; y++) { set(g, x0, y, T.PARED); set(g, x1, y, T.PARED); }
      set(g, Math.floor((x0 + x1) / 2), y1, T.SUELO);
    }
    g._pasarelas = { nodos: nodos.length, puentes: nodos.length + (nodos.length > 4 ? 1 : -1) };
    return g;
  }

  // Complejo inundado: islas de suelo conectadas entre grandes bolsas de agua.
  function genAcuatico(w, h, rng, opts = {}) {
    const g = genExterior(w, h, rng, { density: opts.density ?? 0.32 });
    const lagos = opts.lagos ?? 12;
    for (let i = 0; i < lagos; i++) {
      const cx = rng.int(5, w - 6), cy = rng.int(5, h - 6);
      const rx = rng.int(2, 6), ry = rng.int(2, 5);
      for (let y = cy - ry; y <= cy + ry; y++)
        for (let x = cx - rx; x <= cx + rx; x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && at(g, x, y) === T.SUELO)
            set(g, x, y, T.AGUA);
    }
    return g;
  }

  // Level 37.2: salas blancas anchas cubiertas por agua somera. El agua no
  // aparece como charcos aislados: domina todas las camaras, con plataformas
  // secas escasas y vanos amplios entre tabiques.
  function genPiscinas(w, h, rng) {
    const g = grid(w, h, T.AGUA);
    for (let x = 0; x < w; x++) { set(g, x, 0, T.PARED); set(g, x, h - 1, T.PARED); }
    for (let y = 0; y < h; y++) { set(g, 0, y, T.PARED); set(g, w - 1, y, T.PARED); }
    let camaras = 1;
    for (let x = 17; x < w - 8; x += rng.int(15, 20)) {
      for (let y = 1; y < h - 1; y++) set(g, x, y, T.PARED);
      for (let y = 7; y < h - 5; y += 15) for (let dx = -1; dx <= 2; dx++) set(g, x + dx, y, T.AGUA);
      camaras++;
    }
    for (let y = 15; y < h - 8; y += rng.int(13, 18)) {
      for (let x = 1; x < w - 1; x++) set(g, x, y, T.PARED);
      for (let x = 9; x < w - 6; x += 19) for (let dy = -1; dy <= 2; dy++) set(g, x, y + dy, T.AGUA);
      camaras++;
    }
    let plataformas = 0;
    for (let i = 0; i < 9; i++) {
      const x0 = rng.int(3, w - 10), y0 = rng.int(3, h - 8);
      const rw = rng.int(3, 7), rh = rng.int(2, 5);
      for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++)
        if (at(g, x, y) === T.AGUA) set(g, x, y, T.DECOR);
      plataformas++;
    }
    g._piscinas = { camaras, plataformas };
    return g;
  }

  // Océano real: el agua domina y las zonas secas son búnkeres o plataformas
  // dispersas. El agua es transitable porque aquí el jugador está nadando.
  function genOceano(w, h, rng) {
    const g = grid(w, h, T.AGUA);
    for (let x = 0; x < w; x++) { set(g, x, 0, T.PARED); set(g, x, h - 1, T.PARED); }
    for (let y = 0; y < h; y++) { set(g, 0, y, T.PARED); set(g, w - 1, y, T.PARED); }
    const estructuras = [{ x: Math.floor(w / 2) - 7, y: Math.floor(h / 2) - 5, w: 14, h: 10 }];
    for (let i = 0; i < 7; i++) estructuras.push({
      x: rng.int(3, w - 11), y: rng.int(3, h - 9), w: rng.int(5, 9), h: rng.int(4, 7),
    });
    for (const r of estructuras) {
      const x2 = Math.min(w - 2, r.x + r.w), y2 = Math.min(h - 2, r.y + r.h);
      for (let yy = r.y; yy <= y2; yy++) for (let xx = r.x; xx <= x2; xx++) set(g, xx, yy, T.SUELO);
      if (r === estructuras[0]) {
        for (let xx = r.x; xx <= x2; xx++) { set(g, xx, r.y, T.PARED); set(g, xx, y2, T.PARED); }
        for (let yy = r.y; yy <= y2; yy++) { set(g, r.x, yy, T.PARED); set(g, x2, yy, T.PARED); }
        set(g, Math.floor((r.x + x2) / 2), y2, T.SUELO);
      }
    }
    for (let i = 0; i < Math.floor(w * h * 0.012); i++) {
      const x = rng.int(2, w - 3), y = rng.int(2, h - 3);
      if (at(g, x, y) === T.AGUA && rng.chance(0.35)) set(g, x, y, T.PARED);
    }
    return g;
  }

  // Carretera anómala con arcenes, cruces y áreas de servicio.
  function genCarretera(w, h, rng) {
    const g = grid(w, h, T.PARED);
    const midY = Math.floor(h / 2);
    for (let y = midY - 3; y <= midY + 3; y++)
      for (let x = 1; x < w - 1; x++) set(g, x, y, y === midY ? T.DECOR : T.SUELO);
    for (let branch = 0; branch < 5; branch++) {
      const bx = rng.int(8, w - 9);
      const up = rng.chance(0.5);
      const end = up ? rng.int(3, midY - 7) : rng.int(midY + 7, h - 4);
      const y0 = Math.min(midY, end), y1 = Math.max(midY, end);
      for (let y = y0; y <= y1; y++) for (let dx = -1; dx <= 1; dx++) set(g, bx + dx, y, T.SUELO);
      const sy = up ? end - 2 : end;
      for (let y = sy; y < sy + 5; y++) for (let x = bx - 5; x <= bx + 5; x++) set(g, x, y, T.SUELO);
    }
    return g;
  }

  // Vagones encadenados por un corredor ferroviario estrecho.
  function genTren(w, h, rng) {
    const g = grid(w, h, T.PARED);
    const cy = Math.floor(h / 2);
    for (let x = 1; x < w - 1; x++) for (let y = cy - 2; y <= cy + 2; y++) set(g, x, y, T.SUELO);
    for (let x = 4; x < w - 10; x += rng.int(10, 15)) {
      const arriba = rng.chance(0.5);
      const y0 = arriba ? cy - 8 : cy + 3;
      for (let y = y0; y < y0 + 6; y++) for (let xx = x; xx < Math.min(w - 2, x + 8); xx++) set(g, xx, y, T.SUELO);
      const puertaY = arriba ? cy - 3 : cy + 3;
      set(g, x + 4, puertaY, T.SUELO);
    }
    return g;
  }

  // Arquitecturas semanticas detectadas en la wiki. Comparten utilidades,
  // pero no la planta: una prision, un teatro y un aeropuerto dejan de caer
  // en el mismo laberinto aunque tengan materiales parecidos.
  function genArquitectura(w, h, rng, tipo) {
    const g = grid(w, h, T.PARED);
    const props = [];
    const carve = (x, y, rw, rh, tile = T.SUELO) => {
      for (let yy = Math.max(1, y); yy < Math.min(h - 1, y + rh); yy++)
        for (let xx = Math.max(1, x); xx < Math.min(w - 1, x + rw); xx++) set(g, xx, yy, tile);
    };
    const prop = (x, y, id, extra = {}) => {
      if (!walkable(at(g, x, y))) return;
      set(g, x, y, T.OBSTACULO);
      props.push({ x, y, id, contenedor: false, ...extra });
    };

    if (tipo === 'sala_unica') {
      // Una camara unica conserva escala y lineas de vision; solo unos pocos
      // soportes o muebles rompen el vacio sin crear corredores artificiales.
      carve(2, 2, w - 4, h - 4);
      for (let y = 8; y < h - 7; y += 12) for (let x = 9; x < w - 8; x += 16)
        if (rng.chance(0.55)) prop(x, y, 'mesa');
      g._salaUnica = { area: (w - 4) * (h - 4) };
    } else if (tipo === 'hotel_atrio') {
      carve(2, 2, w - 4, h - 4);
      const ax = Math.floor(w * 0.27), ay = Math.floor(h * 0.25);
      const aw = Math.max(12, Math.floor(w * 0.46)), ah = Math.max(10, Math.floor(h * 0.5));
      // Patio central rodeado por un anillo de pasillos y habitaciones. Las
      // cuatro aperturas impiden que el patio sea una caja decorativa aislada.
      for (let x = ax; x < ax + aw; x++) { set(g, x, ay, T.PARED); set(g, x, ay + ah - 1, T.PARED); }
      for (let y = ay; y < ay + ah; y++) { set(g, ax, y, T.PARED); set(g, ax + aw - 1, y, T.PARED); }
      carve(ax + 1, ay + 1, aw - 2, ah - 2, T.DECOR);
      carve(ax + Math.floor(aw / 2) - 1, ay - 1, 3, 3);
      carve(ax + Math.floor(aw / 2) - 1, ay + ah - 2, 3, 3);
      carve(ax - 1, ay + Math.floor(ah / 2) - 1, 3, 3);
      carve(ax + aw - 2, ay + Math.floor(ah / 2) - 1, 3, 3);
      for (let x = 8; x < w - 7; x += 9) {
        for (let y = 3; y < ay - 2; y++) set(g, x, y, T.PARED);
        for (let y = ay + ah + 2; y < h - 3; y++) set(g, x, y, T.PARED);
        prop(x - 3, 5, 'cama'); prop(x - 3, h - 6, 'cama');
      }
      g._atrio = { x: ax, y: ay, w: aw, h: ah };
    } else if (tipo === 'viviendas_conectadas') {
      carve(2, 2, w - 4, h - 4);
      const cx = Math.floor(w / 2);
      // Dos ejes comunes y una reticula de viviendas, cada tabique con puerta.
      for (let x = 2; x < w - 2; x++) if (Math.abs(x - cx) > 1)
        for (let y = 11; y < h - 3; y += 11) set(g, x, y, T.PARED);
      for (let x = 10; x < w - 3; x += 10)
        for (let y = 2; y < h - 2; y++) if (y % 11 > 2) set(g, x, y, T.PARED);
      carve(cx - 1, 2, 3, h - 4);
      for (let y = 11; y < h - 3; y += 11)
        for (let x = 5; x < w - 4; x += 10) carve(x, y - 1, 2, 3);
      for (let y = 6; y < h - 4; y += 11)
        for (let x = 6; x < w - 5; x += 10) prop(x, y, 'cama');
    } else if (tipo === 'sotanos_conectados') {
      carve(2, 2, w - 4, h - 4);
      const cy = Math.floor(h / 2);
      // Sotanos domesticos unidos por una galeria comun, con tabiques
      // irregulares y pequenas filtraciones que alteran el movimiento.
      carve(2, cy - 2, w - 4, 5);
      for (let x = 11; x < w - 7; x += 12) {
        for (let y = 3; y < h - 3; y++) if (Math.abs(y - cy) > 2) set(g, x, y, T.PARED);
        carve(x - 1, cy - 3, 3, 7);
      }
      let filtraciones = 0;
      for (let y = 6; y < h - 5; y += 9) for (let x = 6; x < w - 5; x += 11)
        if (at(g, x, y) === T.SUELO && rng.chance(0.45)) { set(g, x, y, T.CHARCO); filtraciones++; }
      g._sotanos = { filtraciones };
    } else if (tipo === 'recinto_deportivo') {
      carve(2, 2, w - 4, h - 4);
      const banda = Math.max(10, Math.floor((w - 8) / 3));
      for (let k = 0; k < 3; k++) {
        const x0 = 4 + k * banda;
        for (let y = 6; y < h - 8; y++) {
          set(g, x0, y, T.DECOR); set(g, Math.min(w - 4, x0 + banda - 2), y, T.DECOR);
        }
        for (let y = 8; y < h - 9; y += 8) prop(Math.min(w - 5, x0 + banda - 4), y, 'marcador');
      }
      for (let x = 5; x < w - 5; x += 5) prop(x, h - 5, 'banco');
      g._pistas = 3;
    } else if (tipo === 'galerias_comerciales') {
      carve(2, 2, w - 4, h - 4);
      const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
      for (let x = 3; x < w - 3; x += 10)
        for (let y = 3; y < h - 3; y++) if (Math.abs(y - cy) > 2 && y % 12 > 2) set(g, x, y, T.PARED);
      for (let y = 9; y < h - 4; y += 12)
        for (let x = 3; x < w - 3; x++) if (Math.abs(x - cx) > 2 && x % 10 > 2) set(g, x, y, T.PARED);
      carve(cx - 2, 2, 5, h - 4); carve(2, cy - 2, w - 4, 5);
      for (let y = 6; y < h - 5; y += 8) for (let x = 6; x < w - 5; x += 10)
        if (Math.abs(x - cx) > 3 && Math.abs(y - cy) > 3) prop(x, y, 'mostrador');
    } else if (tipo === 'planta_estudio') {
      carve(2, 2, w - 4, h - 4);
      // Platós grandes alrededor de una espina técnica; cada set conserva
      // accesos anchos y equipamiento sólido, no cubículos de oficina.
      const cy = Math.floor(h / 2);
      carve(2, cy - 2, w - 4, 5);
      for (let x = 12; x < w - 8; x += 16) {
        for (let y = 3; y < h - 3; y++) if (Math.abs(y - cy) > 2) set(g, x, y, T.PARED);
        carve(x - 1, cy - 3, 3, 7);
        prop(x - 5, Math.max(5, cy - 8), 'camara_estudio');
        prop(x + 5, Math.min(h - 6, cy + 8), 'foco_estudio');
      }
      g._platos = Math.max(2, Math.floor(w / 16));
    } else if (tipo === 'banos_publicos') {
      carve(2, 2, w - 4, h - 4);
      const cy = Math.floor(h / 2);
      for (let x = 5; x < w - 4; x += 5) {
        for (let y = 3; y < cy - 2; y++) set(g, x, y, T.PARED);
        for (let y = cy + 2; y < h - 3; y++) set(g, x, y, T.PARED);
        carve(x - 1, cy - 3, 2, 3); carve(x - 1, cy + 1, 2, 3);
        prop(x - 2, 4, 'lavabo'); prop(x - 2, h - 5, 'lavabo');
      }
      carve(2, cy - 2, w - 4, 5);
    } else if (tipo === 'castillo') {
      carve(2, 2, w - 4, h - 4);
      const mx = Math.max(8, Math.floor(w * 0.22)), my = Math.max(7, Math.floor(h * 0.2));
      // Patio de armas, galerias perimetrales y cuatro bloques de torre.
      for (let x = mx; x < w - mx; x++) { set(g, x, my, T.PARED); set(g, x, h - my - 1, T.PARED); }
      for (let y = my; y < h - my; y++) { set(g, mx, y, T.PARED); set(g, w - mx - 1, y, T.PARED); }
      carve(Math.floor(w / 2) - 2, my - 1, 5, 3); carve(Math.floor(w / 2) - 2, h - my - 1, 5, 3);
      carve(mx - 1, Math.floor(h / 2) - 2, 3, 5); carve(w - mx - 1, Math.floor(h / 2) - 2, 3, 5);
      for (const [x, y] of [[4, 4], [w - 10, 4], [4, h - 10], [w - 10, h - 10]]) {
        for (let yy = y; yy < y + 6; yy++) for (let xx = x; xx < x + 6; xx++)
          if (xx === x || yy === y || xx === x + 5 || yy === y + 5) set(g, xx, yy, T.PARED);
        carve(x + 2, y + 2, 2, 2);
      }
      prop(Math.floor(w / 2), Math.floor(h / 2), 'altar');
    } else if (tipo === 'sala_columnada') {
      carve(1, 1, w - 2, h - 2);
      let pilares = 0;
      for (let y = 6; y < h - 5; y += 7) for (let x = 6; x < w - 5; x += 7) {
        set(g, x, y, T.PARED); set(g, x + 1, y, T.PARED);
        set(g, x, y + 1, T.PARED); set(g, x + 1, y + 1, T.PARED); pilares++;
      }
      g._columnas = pilares;
    } else if (tipo === 'zoologico') {
      // Senderos de tierra en cruz y en anillo; los recintos tienen puertas y
      // terreno propio, y por tanto son visitables en lugar de simples muros.
      carve(2, 2, w - 4, h - 4, T.DECOR);
      const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
      for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++)
        if (Math.abs(x - cx) > 2 && Math.abs(y - cy) > 2) set(g, x, y, T.PARED);
      carve(cx - 2, 2, 5, h - 4, T.DECOR); carve(2, cy - 2, w - 4, 5, T.DECOR);
      let recintos = 0;
      for (let y = 5; y < h - 12; y += 15) for (let x = 5; x < w - 15; x += 18) {
        const rw = Math.min(12, w - x - 3), rh = Math.min(10, h - y - 3);
        carve(x + 1, y + 1, rw - 2, rh - 2, rng.chance(0.3) ? T.AGUA : T.DECOR);
        for (let xx = x; xx < x + rw; xx++) { set(g, xx, y, T.PARED); set(g, xx, y + rh - 1, T.PARED); }
        for (let yy = y; yy < y + rh; yy++) { set(g, x, yy, T.PARED); set(g, x + rw - 1, yy, T.PARED); }
        const puertaX = x + Math.floor(rw / 2), puertaY = y < cy ? y + rh - 1 : y;
        set(g, puertaX, puertaY, T.SUELO);
        // Une cada recinto al eje mas cercano para garantizar acceso.
        for (let yy = Math.min(puertaY, cy); yy <= Math.max(puertaY, cy); yy++) set(g, puertaX, yy, T.DECOR);
        prop(x + 2, y + 2, rng.chance(0.3) ? 'tanque_acuatico' : 'cartel_zoo');
        recintos++;
      }
      for (let x = 9; x < w - 8; x += 22) if (at(g, x, cy) === T.DECOR) prop(x, cy, 'carrito_zoo');
      g._zoologico = { recintos, senderos: 2, cx, cy };
    } else if (tipo === 'parque_recreativo') {
      carve(2, 2, w - 4, h - 4);
      for (let y = 7; y < h - 6; y += 9) for (let x = 7; x < w - 6; x += 10) {
        prop(x, y, 'maquina_arcade');
        if (rng.chance(0.45)) prop(x + 2, y, 'maquina_arcade');
      }
      for (let y = 12; y < h - 7; y += 18) carve(3, y, w - 6, 3, T.DECOR);
    } else if (tipo === 'cementerio') {
      carve(1, 1, w - 2, h - 2, T.DECOR);
      // Senderos ortogonales entre hileras de tumbas y mausoleos cerrados.
      for (let y = 6; y < h - 5; y += 5) for (let x = 5; x < w - 4; x += 4)
        if (x % 16 > 3 && y % 20 > 3) prop(x, y, 'lapida');
      for (let x = 3; x < w - 3; x++) set(g, x, Math.floor(h / 2), T.SUELO);
      for (let y = 3; y < h - 3; y++) set(g, Math.floor(w / 2), y, T.SUELO);
      for (const [x, y] of [[5, 5], [w - 12, 5], [5, h - 11], [w - 12, h - 11]]) {
        for (let yy = y; yy < y + 6; yy++) for (let xx = x; xx < x + 7; xx++)
          if (xx === x || yy === y || xx === x + 6 || yy === y + 5) set(g, xx, yy, T.PARED);
        carve(x + 3, y + 5, 1, 2);
      }
    } else if (tipo === 'prision') {
      const cx = Math.floor(w / 2);
      carve(cx - 2, 1, 5, h - 2);
      for (let y = 3; y < h - 6; y += 7) {
        for (const side of [-1, 1]) {
          const x = side < 0 ? 2 : cx + 4;
          const rw = side < 0 ? cx - 5 : w - cx - 6;
          carve(x, y, rw, 5);
          carve(side < 0 ? cx - 3 : cx + 3, y + 2, 2, 1);
          for (let xx = x + 3; xx < x + rw - 1; xx += 5) set(g, xx, y + 4, T.PARED);
        }
      }
    } else if (tipo === 'aeropuerto') {
      const cy = Math.floor(h / 2);
      carve(1, cy - 4, w - 2, 9);                         // terminal longitudinal
      for (let x = 4; x < w - 9; x += 11) {
        carve(x, 3, 8, cy - 7); carve(x, cy + 5, 8, h - cy - 8);
        carve(x + 3, cy - 5, 2, 11);                      // puertas de embarque
        for (let yy = 7; yy < cy - 5; yy += 3) prop(x + 2, yy, 'asiento_terminal');
        for (let yy = cy + 7; yy < h - 5; yy += 3) prop(x + 5, yy, 'asiento_terminal');
      }
    } else if (tipo === 'estadio') {
      carve(1, 1, w - 2, h - 2);
      const margenX = Math.max(8, Math.floor(w * 0.18));
      const margenY = Math.max(7, Math.floor(h * 0.2));
      for (let y = 3; y < h - 3; y += 3) for (let x = 3; x < w - 3; x += 3) {
        const campo = x >= margenX && x < w - margenX && y >= margenY && y < h - margenY;
        const pasillo = x === margenX - 2 || x === w - margenX + 1 || y === margenY - 2 || y === h - margenY + 1;
        if (!campo && !pasillo) prop(x, y, 'grada');
      }
      g._campo = { x: margenX, y: margenY, w: w - margenX * 2, h: h - margenY * 2 };
    } else if (tipo === 'teatro') {
      carve(2, 2, w - 4, h - 4);
      const escenarioY = Math.max(5, Math.floor(h * 0.22));
      for (let y = escenarioY + 5; y < h - 4; y += 3)
        for (let x = 4; x < w - 4; x += 3)
          if (Math.abs(x - w / 2) > 2) prop(x, y, 'butaca');
      for (let x = 4; x < w - 4; x++) set(g, x, escenarioY, T.DECOR);
      g._escenario = { x: 4, y: escenarioY - 4, w: w - 8, h: 5 };
    } else if (tipo === 'templo') {
      const naveX = Math.max(4, Math.floor(w * 0.18));
      carve(naveX, 2, w - naveX * 2, h - 4);
      carve(2, Math.floor(h * 0.42), w - 4, Math.max(7, Math.floor(h * 0.16))); // crucero
      for (let y = 8; y < h - 9; y += 5)
        for (const x of [naveX + 3, w - naveX - 4]) prop(x, y, 'banco');
      prop(Math.floor(w / 2), 5, 'altar');
    } else if (tipo === 'museo') {
      carve(2, 2, w - 4, h - 4);
      for (let x = 10; x < w - 8; x += 12) {
        for (let y = 3; y < h - 3; y++) if (y % 14 > 3) set(g, x, y, T.PARED);
      }
      for (let y = 10; y < h - 8; y += 14) {
        for (let x = 3; x < w - 3; x++) if (x % 12 > 3) set(g, x, y, T.PARED);
      }
      for (let y = 6; y < h - 5; y += 8) for (let x = 6; x < w - 5; x += 8) prop(x, y, 'vitrina');
    } else if (tipo === 'almacen') {
      carve(1, 1, w - 2, h - 2);
      for (let x = 5; x < w - 5; x += 6)
        for (let y = 4; y < h - 4; y++)
          if (y % 13 > 2) { set(g, x, y, T.ESTANTERIA); set(g, x + 1, y, T.ESTANTERIA); }
      for (let x = 3; x < w - 3; x += 14) prop(x, h - 4, 'palet');
    } else if (tipo === 'restaurante') {
      carve(2, 2, w - 4, h - 4);
      const cocinaX = Math.floor(w * 0.7);
      for (let y = 3; y < h - 3; y++) if (y % 9 > 2) set(g, cocinaX, y, T.PARED);
      for (let y = 6; y < h - 5; y += 5) for (let x = 6; x < cocinaX - 3; x += 6) prop(x, y, 'mesa');
      for (let y = 5; y < h - 5; y += 6) prop(w - 6, y, 'encimera');
    } else { // bunker
      carve(2, 2, w - 4, h - 4);
      for (let x = 10; x < w - 7; x += 11) {
        for (let y = 3; y < h - 3; y++) if (y % 12 > 2) set(g, x, y, T.PARED);
        carve(x - 1, Math.floor(h / 2) - 1, 3, 3);
      }
      for (let y = 10; y < h - 7; y += 12) {
        for (let x = 3; x < w - 3; x++) if (x % 11 > 2) set(g, x, y, T.PARED);
      }
    }
    g._propsEstructurales = props;
    g._arquitectura = { tipo, props: props.length };
    return g;
  }

  // ---------- utilidades comunes ----------

  function collectFloors(g) {
    const out = [];
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (walkable(at(g, x, y))) out.push([x, y]);
    return out;
  }

  // conserva solo el mayor componente conexo de suelo
  function keepLargest(g) {
    const compOf = new Int32Array(g.w * g.h).fill(-1);
    let best = -1, bestSize = 0, comp = 0;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (!walkable(at(g, x, y)) || compOf[y * g.w + x] !== -1) continue;
        let size = 0;
        const q = [[x, y]];
        compOf[y * g.w + x] = comp;
        while (q.length) {
          const [cx, cy] = q.pop();
          size++;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
            if (walkable(at(g, nx, ny)) && compOf[ny * g.w + nx] === -1) {
              compOf[ny * g.w + nx] = comp;
              q.push([nx, ny]);
            }
          }
        }
        if (size > bestSize) { bestSize = size; best = comp; }
        comp++;
      }
    for (let i = 0; i < g.t.length; i++)
      if (walkable(g.t[i]) && compOf[i] !== best)
        g.t[i] = T.PARED;
    return g;
  }

  // distancias BFS desde un punto (para colocar salidas lejos del spawn)
  function bfsDist(g, sx, sy) {
    const d = new Int32Array(g.w * g.h).fill(-1);
    d[sy * g.w + sx] = 0;
    const q = [[sx, sy]];
    let head = 0;
    while (head < q.length) {
      const [cx, cy] = q[head++];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        if (walkable(at(g, nx, ny)) && d[ny * g.w + nx] === -1) {
          d[ny * g.w + nx] = d[cy * g.w + cx] + 1;
          q.push([nx, ny]);
        }
      }
    }
    return d;
  }

  const GENS = {
    pasillos: (w, h, rng, lv) => lv.id === 'level-0'
      ? genPasillos(w, h, rng, {
          salas: 16, salaMinW: 4, salaMaxW: 14,
          salaMinH: 3, salaMaxH: 10, irregulares: true,
          separacionSalas: 3,
          atajos: Math.floor(w * 1.35),
        })
      : genPasillos(w, h, rng),
    garaje: (w, h, rng, lv) => genGaraje(w, h, rng, { level1: lv.id === 'level-1' }),
    tuneles: (w, h, rng) => genTuneles(w, h, rng, { ancho: true }),
    hospital: (w, h, rng) => genHospital(w, h, rng),
    oficinas: (w, h, rng) => genOficinas(w, h, rng),
    biblioteca: (w, h, rng) => genBiblioteca(w, h, rng),
    recreativo: (w, h, rng) => genArquitectura(w, h, rng, 'parque_recreativo'),
    cementerio: (w, h, rng) => genArquitectura(w, h, rng, 'cementerio'),
    exterior: (w, h, rng) => genExterior(w, h, rng),
    bosque: (w, h, rng, lv) => genBosque(w, h, rng, { lagos: (lv.reglas || []).includes('agua_traicionera') ? 5 : 2 }),
    ciudad: (w, h, rng) => genCiudad(w, h, rng),
    torres: (w, h, rng) => genTorres(w, h, rng),
    invernadero: (w, h, rng) => genInvernadero(w, h, rng),
    acuatico: (w, h, rng) => genAcuatico(w, h, rng, { lagos: 10 }),
    oceano: (w, h, rng) => genOceano(w, h, rng),
    desierto: (w, h, rng) => genExterior(w, h, rng, { density: 0.25 }),
    nevado: (w, h, rng) => genExterior(w, h, rng, { density: 0.3 }),
    espacial: (w, h, rng) => genTorres(w, h, rng),
    cielo: (w, h, rng) => genTorres(w, h, rng),
    hotel: (w, h, rng) => genOficinas(w, h, rng),
    centro_comercial: (w, h, rng) => genGaraje(w, h, rng),
    residencial: (w, h, rng) => genCiudad(w, h, rng, { residencial: true }),
    escuela: (w, h, rng) => genHospital(w, h, rng),
    industrial: (w, h, rng) => genGaraje(w, h, rng),
    fabrica: (w, h, rng) => genGaraje(w, h, rng),
    laboratorio: (w, h, rng) => genHospital(w, h, rng),
    alcantarillas: (w, h, rng) => genTuneles(w, h, rng, { walkers: 7 }),
    estacion: (w, h, rng) => genGaraje(w, h, rng),
    tren: (w, h, rng) => genTren(w, h, rng),
    carretera: (w, h, rng) => genCarretera(w, h, rng),
    parque: (w, h, rng) => genBosque(w, h, rng, { lagos: 1 }),
    granja: (w, h, rng) => genExterior(w, h, rng, { density: 0.28 }),
    pantano: (w, h, rng) => genBosque(w, h, rng, { lagos: 7 }),
    ruinas: (w, h, rng) => genCiudad(w, h, rng),
    surreal: (w, h, rng) => genPasillos(w, h, rng, { salas: 14, irregulares: true, atajos: Math.floor(w * 1.5) }),
  };
  Object.assign(GENS, {
    laberinto_salas: GENS.pasillos,
    garaje_abierto: GENS.garaje,
    tuneles_anchos: GENS.tuneles,
    alas_hospitalarias: GENS.hospital,
    planta_oficinas: GENS.oficinas,
    terreno_abierto: GENS.exterior,
    bosque_claros: GENS.bosque,
    ciudad_transitable: GENS.ciudad,
    vertical: GENS.torres,
    invernadero: GENS.invernadero,
    instalacion_inundada: (w, h, rng, lv) => lv.id === 'level-37-2'
      ? genPiscinas(w, h, rng)
      : genAcuatico(w, h, rng, { lagos: 10 }),
    oceano_abierto: GENS.oceano,
    plataformas: (w, h, rng) => genPasarelas(w, h, rng),
    planta_hotel: GENS.hotel,
    galerias_comerciales: GENS.centro_comercial,
    barrio_transitable: GENS.residencial,
    alas_escolares: GENS.escuela,
    nave_industrial: GENS.industrial,
    alas_laboratorio: GENS.laboratorio,
    andenes: GENS.estacion,
    vagones: GENS.tren,
    carretera: GENS.carretera,
    geometria_surreal: GENS.surreal,
    laberinto_no_euclidiano: GENS.pasillos,
    laberinto_longitudinal: (w, h, rng) => genLaberintoLongitudinal(w, h, rng),
    garaje_infinito: GENS.garaje,
    biblioteca_abierta: GENS.biblioteca,
    hotel_atrio: (w, h, rng) => genArquitectura(w, h, rng, 'hotel_atrio'),
    aguas_someras: (w, h, rng) => { const g = genOceano(w, h, rng); g._arquitectura = { tipo: 'aguas_someras', props: 0 }; return g; },
    viviendas_conectadas: (w, h, rng) => genArquitectura(w, h, rng, 'viviendas_conectadas'),
    sotanos_conectados: (w, h, rng) => genArquitectura(w, h, rng, 'sotanos_conectados'),
    recinto_deportivo: (w, h, rng) => genArquitectura(w, h, rng, 'recinto_deportivo'),
    galerias_comerciales: (w, h, rng) => genArquitectura(w, h, rng, 'galerias_comerciales'),
    castillo: (w, h, rng) => genArquitectura(w, h, rng, 'castillo'),
    cuevas: (w, h, rng) => { const g = genTuneles(w, h, rng, { walkers: 7 }); g._arquitectura = { tipo: 'cuevas', props: 0 }; return g; },
    sala_columnada: (w, h, rng) => genArquitectura(w, h, rng, 'sala_columnada'),
    parque_recreativo: (w, h, rng) => genArquitectura(w, h, rng, 'parque_recreativo'),
    cementerio: (w, h, rng) => genArquitectura(w, h, rng, 'cementerio'),
    zoologico: (w, h, rng) => genArquitectura(w, h, rng, 'zoologico'),
    planta_estudio: (w, h, rng) => genArquitectura(w, h, rng, 'planta_estudio'),
    banos_publicos: (w, h, rng) => genArquitectura(w, h, rng, 'banos_publicos'),
    aeronave: (w, h, rng) => { const g = genTren(w, h, rng); g._arquitectura = { tipo: 'aeronave', props: 0 }; return g; },
    estacion_espacial: (w, h, rng) => genArquitectura(w, h, rng, 'bunker'),
    vacio_cosmico: (w, h, rng) => genPasarelas(w, h, rng),
    sala_unica: (w, h, rng) => genArquitectura(w, h, rng, 'sala_unica'),
    corredor_longitudinal: (w, h, rng) => { const g = genLaberintoLongitudinal(w, h, rng); g._arquitectura = { tipo: 'corredor_longitudinal', props: 0 }; return g; },
    prision: (w, h, rng) => genArquitectura(w, h, rng, 'prision'),
    templo: (w, h, rng) => genArquitectura(w, h, rng, 'templo'),
    aeropuerto: (w, h, rng) => genArquitectura(w, h, rng, 'aeropuerto'),
    estadio: (w, h, rng) => genArquitectura(w, h, rng, 'estadio'),
    teatro: (w, h, rng) => genArquitectura(w, h, rng, 'teatro'),
    museo: (w, h, rng) => genArquitectura(w, h, rng, 'museo'),
    bunker: (w, h, rng) => genArquitectura(w, h, rng, 'bunker'),
    almacen: (w, h, rng) => genArquitectura(w, h, rng, 'almacen'),
    restaurante: (w, h, rng) => genArquitectura(w, h, rng, 'restaurante'),
  });

  // mecánicas de salida derivadas del texto de la wiki (v20): las salidas no
  // son solo puertas — romper paredes agrietadas, caminar hasta perderte…
  function mecanicaDe(s) {
    if (s.mecanica) return s.mecanica;
    const t = (s.texto || '').toLowerCase();
    // El no-clip no es una puerta ni una pared que se rompe: es una zona
    // desfasada que se atraviesa y transporta al jugador al tocarla.
    if (/no.?clip/.test(t)) return 'noclip';
    if (/(romp|quebr|abre)[^.]*(suelo|piso)|suelo (falso|débil|agrietado)/.test(t)) return 'romper_suelo';
    if (/(romp|derrib|golpea|atraviesa|agriet)[^.]*(pared|muro)|pared (falsa|débil|agrietada)/.test(t)) return 'romper';
    if (/caminar sin rumbo|camina[r]? (durante|hasta|lejos)|andar (durante|hasta|sin)|deambul|vagar? (por|durante|hasta)|durante horas|durante días|kilómetros/.test(t)) return 'caminata';
    return null;
  }

  // Las caminatas largas son reproducibles por semilla, pero no idénticas en
  // cada partida. Solo cuentan desplazamientos reales, nunca turnos en espera.
  function walkingGoal(levelDef, runSeed, entry = 1, attempt = 0) {
    const range = levelDef.pasosCaminata || [800, 1200];
    const a = Math.max(1, Math.floor(range[0]));
    const b = Math.max(a, Math.floor(range[1]));
    return RNG.create(`${runSeed}::${levelDef.id}::caminata::${entry}::${attempt}`).int(a, b);
  }

  // Permanencia en la Sala Manila: minutos reales, no turnos ni pasos. `seedKey`
  // ya incluye partida/nivel/instancia — cada nueva estancia en la sala (attempt)
  // vuelve a tirar dentro del rango declarado en la propia salida.
  function manilaGoal(salidaDef, seedKey, attempt = 0) {
    const range = salidaDef.permanenciaS || [180, 300];
    const a = Math.max(1, Math.floor(range[0]));
    const b = Math.max(a, Math.floor(range[1]));
    return RNG.create(`${seedKey}::manila::${attempt}`).int(a, b);
  }

  // ---------- generación completa de un nivel ----------
  function generate(levelDef, rng) {
    let [w, h] = levelDef.tam;
    // v20: los niveles con varias salidas CRECEN — que te sientas perdido de
    // verdad y cada salida quede en su propio rincón del nivel
    const nSal = (levelDef.salidas || []).length;
    // Un nivel infinito conserva el tamaño declarado: es una VENTANA móvil,
    // no un único mapa gigante. Level 0 permanece en 150×150.
    const esc = levelDef.infinito ? 1 : nSal >= 5 ? 1.45 : nSal >= 3 ? 1.25 : 1;
    if (esc > 1) {
      w = Math.min(190, Math.round(w * esc));
      h = Math.min(190, Math.round(h * esc));
    }
    const gen = GENS[levelDef.mapa?.topologia] ?? GENS[levelDef.bioma] ?? GENS.pasillos;
    let g = gen(w, h, rng, levelDef);
    keepLargest(g);
    let floors = collectFloors(g);
    if (floors.length < 60) { // mapa degenerado: reintenta con variante
      g = genPasillos(w, h, rng, { salas: 10 });
      keepLargest(g);
      floors = collectFloors(g);
    }

    const requiereAire = (levelDef.reglas || []).includes('respiracion_acuatica');
    const sueloSeco = floors.filter(([x, y]) => at(g, x, y) !== T.AGUA);
    const accesoTematico = g._zoologico ? floors.filter(([x, y]) =>
      Math.abs(x - g._zoologico.cx) <= 2 || Math.abs(y - g._zoologico.cy) <= 2) : [];
    const urbano = ['ciudad', 'residencial'].includes(levelDef.bioma);
    const accesosUrbanos = urbano ? floors.filter(([x, y]) =>
      (at(g, x - 1, y) === T.PARED && at(g, x + 1, y) === T.PARED) ||
      (at(g, x, y - 1) === T.PARED && at(g, x, y + 1) === T.PARED)) : [];
    const juntoAcceso = urbano ? floors.filter(([x, y]) => accesosUrbanos.some(([ax, ay]) =>
      Math.abs(ax - x) + Math.abs(ay - y) === 1)) : [];
    const spawnTematico = (g._spawnPool || []).filter(([x, y]) => walkable(at(g, x, y)));
    const spawnPool = spawnTematico.length ? spawnTematico
      : requiereAire && sueloSeco.length ? sueloSeco
      : accesoTematico.length ? accesoTematico
      : juntoAcceso.length ? juntoAcceso : floors;
    const spawn = rng.pick(spawnPool);
    const dist = bfsDist(g, spawn[0], spawn[1]);
    const reach = floors.filter(([x, y]) => dist[y * g.w + x] > 0);
    const far = reach.slice().sort((a, b) => dist[b[1] * g.w + b[0]] - dist[a[1] * g.w + a[0]]);

    // salidas (v20): REPARTIDAS por el nivel — cada una elige el punto que
    // maximiza su distancia mínima al spawn Y a las salidas ya colocadas.
    // Se acabaron los racimos de puertas juntas.
    const exits = [];
    const caminatas = []; // salidas SIN casilla: se cruzan caminando mucho
    const usable = [];
    let manilaSalida = null; // salida SIN casilla: se cruza por PERMANENCIA en map.manila
    for (const source of levelDef.salidas || []) {
      if (source.tipo === 'void') continue;
      // Cada aparición tiene estado propio: romper una grieta no abre todas
      // las copias de esa salida en un nivel infinito.
      const s = { ...source, _mec: mecanicaDe(source), _abierta: false };
      if (s.prob !== undefined && !rng.chance(s.prob)) continue;
      if (s._mec === 'caminata') { caminatas.push(s); continue; }
      if (s._mec === 'manila') { manilaSalida = s; continue; }
      usable.push(s);
    }

    // Sala Manila (Level 0): sala rara y tranquila, aparece con probabilidad
    // baja y lejos del spawn — su presencia habilita la mecánica de permanencia
    let manila = null;
    if (manilaSalida && g._rects && g._rects.length && rng.chance(0.2)) {
      const candidatas = g._rects.filter((r) =>
        Math.hypot((r.x + r.w / 2) - spawn[0], (r.y + r.h / 2) - spawn[1]) > 12);
      if (candidatas.length) manila = rng.pick(candidatas);
    }
    // pool ANCHO: toda casilla a más del 45% de la distancia máxima al spawn —
    // cubre regiones opuestas del nivel, no solo el rincón más profundo
    const maxDist = far.length ? dist[far[0][1] * g.w + far[0][0]] : 0;
    const farPool = reach.filter(([x, y]) => dist[y * g.w + x] >= Math.max(12, maxDist * 0.45));
    const conPared = farPool.filter(([x, y]) => at(g, x, y - 1) === T.PARED);
    const sinPared = farPool.filter(([x, y]) => at(g, x, y - 1) !== T.PARED);
    // puertas/grietas EXIGEN pared al norte; trampillas/escaleras van libres
    const esDeSuelo = (s) => s._mec !== 'romper' &&
      /suelo|caer|agujero|fosa|hoyo|trampilla|pozo|precipicio|fall|escalera|ascensor|elevador/i.test(s.texto || '');
    const puestas = [];
    const keyCasilla = (p) => p[1] * g.w + p[0];
    const elegir = (pool) => {
      let best = null, bestScore = -1;
      for (const p of pool) {
        if (puestas.some((q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 3)) continue;
        let score = dist[p[1] * g.w + p[0]]; // lejos del spawn…
        for (const q of puestas)             // …y lejos de las otras salidas
          score = Math.min(score, Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]));
        if (score > bestScore) { bestScore = score; best = p; }
      }
      return best;
    };
    for (const s of usable) {
      const pool = esDeSuelo(s)
        ? (sinPared.length ? sinPared : conPared)
        : (conPared.length ? conPared : sinPared);
      const p = elegir(pool);
      if (p) { puestas.push(p); exits.push({ x: p[0], y: p[1], def: s }); }
    }
    const ocupadas = new Set(exits.map((e) => e.y * g.w + e.x));
    const libre = (p) => p && !ocupadas.has(keyCasilla(p));
    const reservar = (p) => { ocupadas.add(keyCasilla(p)); return p; };
    const elegirLibre = (pool) => {
      const libres = pool.filter(libre);
      return libres.length ? rng.pick(libres) : null;
    };

    // Los muebles estructurales ya forman parte de la planta: reserva sus
    // celdas antes de repartir objetos y decoración aleatoria para que nada se
    // superponga al mostrador, los pilares o los expositores.
    for (const prop of g._propsEstructurales || []) reservar([prop.x, prop.y]);

    // objetos
    const items = [];
    for (const o of levelDef.objetos || []) {
      const n = rng.int(o.n[0], o.n[1]);
      for (let i = 0; i < n; i++) {
        const p = elegirLibre(reach);
        if (!p) continue;
        reservar(p);
        items.push({ x: p[0], y: p[1], id: o.id });
      }
    }

    // props decorativos y contenedores registrables por bioma
    const PROPS_BIOMA = {
      pasillos: ['cable'], garaje: ['cono', 'bidon'], tuneles: ['bidon', 'cable'],
      hospital: ['camilla', 'silla'], oficinas: ['silla', 'caja'], biblioteca: [],
      recreativo: ['silla'], cementerio: ['roca_p'],
      bosque: ['seta', 'roca_p'], exterior: ['roca_p'], ciudad: ['farola'], torres: ['caja'],
      invernadero: ['silla', 'caja'],
      acuatico: ['roca_p', 'bidon'], oceano: ['roca_p', 'caja'],
      desierto: ['roca_p', 'bidon'], nevado: ['roca_p', 'caja'],
      espacial: ['cable', 'caja'], cielo: ['roca_p', 'caja'],
      hotel: ['silla', 'caja'], centro_comercial: ['silla', 'caja'],
      residencial: ['silla', 'caja'], escuela: ['silla', 'caja'],
      industrial: ['bidon', 'cable'], fabrica: ['bidon', 'cable'], laboratorio: ['camilla', 'cable'],
      alcantarillas: ['bidon', 'cable'], estacion: ['silla', 'caja'], tren: ['silla', 'caja'],
      carretera: ['cono', 'bidon'], parque: ['seta', 'roca_p'], granja: ['caja', 'roca_p'],
      pantano: ['seta', 'roca_p'], ruinas: ['roca_p', 'cable'], surreal: ['silla', 'cable'],
    };
    const CONT_BIOMA = {
      pasillos: 'taquilla', garaje: 'taquilla', tuneles: 'cofre', hospital: 'nevera',
      oficinas: 'archivador', biblioteca: 'archivador', recreativo: 'archivador', cementerio: 'cofre', bosque: 'cofre', exterior: 'cofre', ciudad: 'cofre', torres: 'cofre',
      invernadero: 'cofre',
      acuatico: 'cofre', oceano: 'cofre', desierto: 'cofre', nevado: 'cofre',
      espacial: 'cofre', cielo: 'cofre', hotel: 'nevera', centro_comercial: 'archivador',
      residencial: 'nevera', escuela: 'archivador', industrial: 'taquilla', fabrica: 'taquilla',
      laboratorio: 'nevera', alcantarillas: 'cofre', estacion: 'taquilla', tren: 'taquilla',
      carretera: 'cofre', parque: 'cofre', granja: 'cofre', pantano: 'cofre',
      ruinas: 'cofre', surreal: 'cofre',
    };
    const props = [];
    for (const structural of g._propsEstructurales || []) props.push({ ...structural, contenedor: false });
    // los muebles "de pared" van físicamente pegados a un muro (pared al norte)
    const PROPS_PARED = new Set(['taquilla', 'archivador', 'nevera', 'reloj', 'camilla', 'farola', 'estanteria', 'ordenador', 'salida_falsa']);
    const conParedNorte = reach.filter(([x, y]) => at(g, x, y - 1) === T.PARED);
    const sitioPara = (id) => {
      const pool = PROPS_PARED.has(id) && conParedNorte.length ? conParedNorte : reach;
      return elegirLibre(pool);
    };
    const decorativos = PROPS_BIOMA[levelDef.bioma] ?? [];
    if (levelDef.bioma === 'biblioteca') {
      for (let i = 0, n = rng.int(18, 30); i < n; i++) {
        const p = elegirLibre(reach);
        if (!p) continue;
        reservar(p);
        set(g, p[0], p[1], T.LIBROS);
        props.push({ x: p[0], y: p[1], id: 'libros_caidos', contenedor: false });
      }
      for (const id of [
        ...Array(rng.int(2, 4)).fill('ordenador'),
        ...Array(rng.int(6, 10)).fill('silla'),
      ]) {
        const p = sitioPara(id);
        if (!p) continue;
        reservar(p);
        props.push({ x: p[0], y: p[1], id, contenedor: false });
      }
    }
    if (levelDef.id === 'level-0-01') {
      for (let i = 0; i < rng.int(7, 12); i++) {
        const p = sitioPara('salida_falsa');
        if (!p) continue;
        reservar(p);
        props.push({ x: p[0], y: p[1], id: 'salida_falsa', contenedor: false });
      }
      for (let i = 0; i < rng.int(10, 18); i++) {
        const p = elegirLibre(reach);
        if (!p) continue;
        reservar(p);
        props.push({ x: p[0], y: p[1], id: rng.chance(0.5) ? 'botella_vacia' : 'zapato_roto', contenedor: false });
      }
    }
    if (urbano) {
      const elegidos = rng.shuffle(accesosUrbanos).slice(0, 18);
      for (const p of elegidos) {
        if (!libre(p)) continue;
        reservar(p);
        props.push({ x: p[0], y: p[1], id: 'portico', contenedor: false });
      }
    }
    if (decorativos.length) {
      const n = rng.int(7, 13);
      for (let i = 0; i < n; i++) {
        const id = rng.pick(decorativos);
        const p = sitioPara(id);
        if (!p) continue;
        reservar(p);
        // las cajas de madera SIEMPRE se pueden registrar (v17): nada de
        // decoración que parece un contenedor y frustra al clicarla
        const esCont = id === 'caja';
        props.push({ x: p[0], y: p[1], id, contenedor: esCont, registrado: esCont ? false : undefined });
      }
    }
    const nCont = levelDef.bioma === 'biblioteca' ? rng.int(0, 1) : rng.int(3, 5);
    for (let i = 0; i < nCont; i++) {
      const id = CONT_BIOMA[levelDef.bioma] ?? 'cofre';
      const p = sitioPara(id);
      if (!p) continue;
      reservar(p);
      props.push({ x: p[0], y: p[1], id, contenedor: true, registrado: false });
    }
    // el reloj es exclusivo de Level 80 — SIEMPRE colgado de una pared
    if (levelDef.id === 'level-80') {
      for (let i = 0; i < 6; i++) {
        const p = sitioPara('reloj');
        if (!p) continue;
        reservar(p);
        props.push({ x: p[0], y: p[1], id: 'reloj', contenedor: false });
      }
    }

    // Respiraderos visibles dentro del agua. Permiten recuperar oxígeno sin
    // regresar obligatoriamente a tierra y siempre se generan alcanzables.
    const airPockets = [];
    if (requiereAire) {
      const aguaAlcanzable = reach.filter(([x, y]) => at(g, x, y) === T.AGUA && libre([x, y]));
      const candidatos = rng.shuffle(aguaAlcanzable);
      const cantidad = Math.max(6, Math.min(24, Math.floor(aguaAlcanzable.length / 350)));
      for (const p of candidatos) {
        if (airPockets.length >= cantidad) break;
        if (airPockets.some((q) => Math.abs(q.x - p[0]) + Math.abs(q.y - p[1]) < 10)) continue;
        reservar(p);
        const pocket = { x: p[0], y: p[1] };
        airPockets.push(pocket);
        props.push({ ...pocket, id: 'burbuja_aire', contenedor: false });
      }
    }

    // spawns de entidades (fieles a la ficha del nivel), lejos del jugador
    const entitySpawns = [];
    const midPool = reach.filter(([x, y]) => dist[y * g.w + x] >= 8);
    for (const e of levelDef.entidades || []) {
      if (!rng.chance(e.prob ?? 1)) continue;
      const n = rng.int(e.n[0], e.n[1]);
      for (let i = 0; i < n; i++) {
        const p = rng.pick(midPool.length ? midPool : reach);
        entitySpawns.push({ x: p[0], y: p[1], id: e.id });
      }
    }

    return {
      w, h, grid: g, spawn, exits, items, entitySpawns, props,
      airPockets, dist, caminatas, manila, manilaSalida,
    };
  }

  window.MapGen = { T, generate, walkable, at, bfsDist, mecanicaDe, walkingGoal, manilaGoal };
})();
