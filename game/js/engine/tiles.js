// Texturas cenitales procedurales por paleta/bioma — v3: paredes FINAS.
// Suelo: 48×48 · Pared: tabique fino con autotiling (bitmask N/E/S/O) cuya cara
// frontal (26px) muestra el grabado del nivel: papel pintado, zócalo, enchufes…
(function () {
  const TILE = 48;
  const G = 14;                    // grosor del tabique
  const B0 = (TILE - G) / 2;       // borde izquierdo/superior de la banda (17)
  const B1 = B0 + G;               // borde derecho/inferior de la banda (31)
  const FH = 26;                   // alto de la cara frontal

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * f)));
    g = Math.max(0, Math.min(255, Math.round(g * f)));
    b = Math.max(0, Math.min(255, Math.round(b * f)));
    return `rgb(${r},${g},${b})`;
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function speckle(ctx, rng, color, n, x0, y0, w, h, size = 1) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++)
      ctx.fillRect(x0 + rng.int(0, w - 1), y0 + rng.int(0, h - 1), size, size);
  }

  // ---------- suelos ----------
  function floorTile(pal, bioma, rng, variant) {
    const c = canvas(TILE, TILE), ctx = c.getContext('2d');
    ctx.fillStyle = shade(pal.suelo, 0.92 + variant * 0.06);
    ctx.fillRect(0, 0, TILE, TILE);
    if (bioma === 'pasillos') {                       // moqueta
      speckle(ctx, rng, shade(pal.suelo, 0.78), 170, 0, 0, TILE, TILE);
      speckle(ctx, rng, shade(pal.suelo, 1.14), 110, 0, 0, TILE, TILE);
      if (variant === 2) speckle(ctx, rng, shade(pal.detalle, 0.9), 40, 8, 8, 32, 32, 2);
    } else if (bioma === 'garaje' || bioma === 'tuneles') { // hormigón
      speckle(ctx, rng, shade(pal.suelo, 0.82), 70, 0, 0, TILE, TILE);
      if (variant > 0) {
        ctx.strokeStyle = shade(pal.suelo, 0.66);
        ctx.beginPath();
        let x = rng.int(8, 40), y = 0;
        ctx.moveTo(x, y);
        while (y < TILE) { x += rng.int(-4, 4); y += rng.int(4, 8); ctx.lineTo(x, y); }
        ctx.stroke();
      }
    } else if (bioma === 'hospital' || bioma === 'oficinas') { // baldosa
      speckle(ctx, rng, shade(pal.suelo, 1.08), 32, 0, 0, TILE, TILE);
      ctx.strokeStyle = shade(pal.suelo, 0.74);
      ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      ctx.strokeRect(0.5, 0.5, TILE / 2, TILE / 2);
      ctx.strokeRect(TILE / 2 + 0.5, TILE / 2 + 0.5, TILE / 2 - 1, TILE / 2 - 1);
    } else if (bioma === 'bosque' || bioma === 'exterior') { // tierra
      speckle(ctx, rng, shade(pal.suelo, 0.8), 100, 0, 0, TILE, TILE);
      speckle(ctx, rng, shade(pal.detalle, 1.0), 26, 0, 0, TILE, TILE, 2);
    } else if (bioma === 'ciudad') {                  // adoquín
      speckle(ctx, rng, shade(pal.suelo, 0.85), 46, 0, 0, TILE, TILE);
      ctx.strokeStyle = shade(pal.suelo, 0.7);
      for (let y = 12; y < TILE; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE, y); ctx.stroke(); }
      for (let x = 12; x < TILE; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TILE); ctx.stroke(); }
    } else if (bioma === 'torres') {                  // panel
      ctx.strokeStyle = shade(pal.suelo, 0.84);
      ctx.strokeRect(2.5, 2.5, TILE - 5, TILE - 5);
      speckle(ctx, rng, shade(pal.suelo, 1.06), 14, 0, 0, TILE, TILE);
    }
    return c;
  }

  // ---------- grabado de la cara frontal por bioma ----------
  function faceDetail(ctx, pal, bioma, rng, w) {
    // dibuja sobre una franja w×FH ya rellenada con el color base
    if (bioma === 'pasillos') {
      // papel pintado: franjas verticales two-tone (el grabado clásico)
      for (let x = 0; x < w; x += 10) {
        ctx.fillStyle = shade(pal.pared, 1.13);
        ctx.fillRect(x, 0, 5, FH);
      }
      ctx.fillStyle = shade(pal.pared, 0.8);          // línea de remate superior
      ctx.fillRect(0, 0, w, 2);
      ctx.fillStyle = shade(pal.detalle, 0.55);       // zócalo
      ctx.fillRect(0, FH - 6, w, 6);
      ctx.fillStyle = shade(pal.detalle, 0.75);
      ctx.fillRect(0, FH - 7, w, 1);
      if (rng.chance(0.4)) {                          // mancha de humedad
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = shade(pal.pared, 0.7);
        ctx.beginPath();
        ctx.ellipse(rng.int(6, w - 6), rng.int(5, 14), rng.int(3, 6), rng.int(4, 8), 0, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (w >= 24 && rng.chance(0.45)) {              // enchufe
        const ex = rng.int(4, w - 10);
        ctx.fillStyle = shade(pal.pared, 1.3);
        ctx.fillRect(ex, FH - 16, 7, 9);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(ex + 0.5, FH - 15.5, 6, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(ex + 2, FH - 14, 1.5, 2.5);
        ctx.fillRect(ex + 4.5, FH - 14, 1.5, 2.5);
      }
    } else if (bioma === 'tuneles' || bioma === 'ciudad') {
      ctx.strokeStyle = shade(pal.pared, 0.55);
      for (let y = 6; y < FH; y += 7) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        for (let x = ((y / 7) | 0) % 2 ? 6 : 12; x < w; x += 12) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, Math.min(y + 7, FH)); ctx.stroke();
        }
      }
    } else if (bioma === 'hospital' || bioma === 'oficinas') {
      ctx.fillStyle = shade(pal.detalle, 1.2);        // azulejo inferior
      ctx.fillRect(0, FH - 12, w, 12);
      ctx.strokeStyle = shade(pal.detalle, 0.8);
      ctx.beginPath(); ctx.moveTo(0, FH - 12); ctx.lineTo(w, FH - 12); ctx.stroke();
      for (let x = 8; x < w; x += 8) {
        ctx.beginPath(); ctx.moveTo(x, FH - 12); ctx.lineTo(x, FH); ctx.stroke();
      }
      speckle(ctx, rng, shade(pal.pared, 0.78), 10, 0, 2, w, 10);
    } else if (bioma === 'garaje') {
      speckle(ctx, rng, shade(pal.pared, 0.8), 22, 0, 2, w, FH - 8);
      ctx.fillStyle = shade(pal.detalle, 1.35);       // banda de señalización
      ctx.fillRect(0, FH - 9, w, 4);
    } else if (bioma === 'torres') {
      ctx.strokeStyle = shade(pal.pared, 1.4);
      for (let y = 7; y < FH; y += 9) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.fillStyle = shade(pal.pared, 1.5);
      for (let x = 4; x < w; x += 10) ctx.fillRect(x, 3, 1.5, 1.5);
    } else {                                          // roca/estratos
      ctx.strokeStyle = shade(pal.pared, 0.68);
      for (let y = 5; y < FH; y += rng.int(5, 9)) {
        ctx.beginPath(); ctx.moveTo(0, y + rng.int(-1, 1)); ctx.lineTo(w, y + rng.int(-1, 1)); ctx.stroke();
      }
      speckle(ctx, rng, shade(pal.pared, 0.82), 18, 0, 2, w, FH - 4);
    }
  }

  // ---------- piezas de tabique fino ----------
  // topPieces[bits]: vista superior del tabique según conexiones (1=N,2=E,4=S,8=O)
  function buildTopPieces(pal, bioma, rng) {
    const pieces = [];
    const base = shade(pal.pared, 1.18);
    const edge = shade(pal.pared, 0.7);
    for (let bits = 0; bits < 16; bits++) {
      const c = canvas(TILE, TILE), ctx = c.getContext('2d');
      const rects = [];
      if (bits === 0) rects.push([B0 - 2, B0 - 2, G + 4, G + 4]); // poste aislado
      else {
        rects.push([B0, B0, G, G]);
        if (bits & 1) rects.push([B0, 0, G, B0]);        // N
        if (bits & 2) rects.push([B1, B0, TILE - B1, G]); // E
        if (bits & 4) rects.push([B0, B1, G, TILE - B1]); // S
        if (bits & 8) rects.push([0, B0, B0, G]);         // O
      }
      ctx.fillStyle = base;
      for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h);
      // textura y bordes
      ctx.save();
      ctx.beginPath();
      for (const [x, y, w, h] of rects) ctx.rect(x, y, w, h);
      ctx.clip();
      speckle(ctx, rng, shade(pal.pared, 1.05), 40, 0, 0, TILE, TILE);
      ctx.restore();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      for (const [x, y, w, h] of rects) ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      pieces.push(c);
    }
    return pieces;
  }

  // facePieces[(O?1)|(E?2)]: cara frontal — su anchura depende de las conexiones laterales
  function buildFacePieces(pal, bioma, rng) {
    const out = [];
    const combos = [
      { x0: B0, w: G },            // sin vecinos laterales
      { x0: 0, w: B1 },            // conecta al oeste
      { x0: B0, w: TILE - B0 },    // conecta al este
      { x0: 0, w: TILE },          // ambos
    ];
    for (const { x0, w } of combos) {
      const c = canvas(w, FH), ctx = c.getContext('2d');
      ctx.fillStyle = shade(pal.pared, 0.95);
      ctx.fillRect(0, 0, w, FH);
      faceDetail(ctx, pal, bioma, rng, w);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(0.5, 0.5, w - 1, FH - 1);
      out.push({ x0, canvas: c });
    }
    return out;
  }

  // árbol (bosque) y roca (exterior): paredes orgánicas, sin autotile
  function arbolTile(pal, rng) {
    const c = canvas(TILE, TILE + 18), ctx = c.getContext('2d');
    const cx = TILE / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, TILE + 8, 16, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(cx - 4, TILE - 12, 8, 26);
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(cx - 1, TILE - 12, 4, 26);
    ctx.fillStyle = shade(pal.pared, 0.9);
    ctx.beginPath(); ctx.ellipse(cx, 20, 21, 17, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(pal.pared, 1.18);
    ctx.beginPath(); ctx.ellipse(cx - 6, 14, 11, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(pal.pared, 0.7);
    ctx.beginPath(); ctx.ellipse(cx + 8, 26, 9, 7, 0, 0, 7); ctx.fill();
    return c;
  }

  function rocaTile(pal, rng) {
    const c = canvas(TILE, TILE + 10), ctx = c.getContext('2d');
    const cx = TILE / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, TILE + 2, 18, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(pal.pared, 1.0);
    ctx.beginPath();
    ctx.moveTo(6, TILE);
    ctx.lineTo(4, 26); ctx.lineTo(14, 12); ctx.lineTo(30, 8);
    ctx.lineTo(42, 20); ctx.lineTo(44, TILE);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(pal.pared, 1.25);
    ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(30, 8); ctx.lineTo(34, 22); ctx.lineTo(16, 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(pal.pared, 0.6);
    ctx.beginPath(); ctx.moveTo(16, 26); ctx.lineTo(34, 22); ctx.moveTo(24, 24); ctx.lineTo(26, TILE - 4); ctx.stroke();
    return c;
  }

  function aguaTile(pal, rng) {
    const c = canvas(TILE, TILE), ctx = c.getContext('2d');
    ctx.fillStyle = shade(pal.detalle, 0.65);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.strokeStyle = shade(pal.detalle, 1.35);
    for (let i = 0; i < 4; i++) {
      const y = rng.int(6, TILE - 6);
      ctx.beginPath();
      ctx.moveTo(rng.int(2, 12), y);
      ctx.quadraticCurveTo(TILE / 2, y + rng.int(-4, 4), TILE - rng.int(2, 12), y);
      ctx.stroke();
    }
    return c;
  }

  function decorTile(pal, bioma, rng) {
    const base = floorTile(pal, bioma, rng, 1);
    const ctx = base.getContext('2d');
    if (bioma === 'torres') {                         // viga sobre el vacío
      ctx.fillStyle = shade(pal.pared, 1.1);
      ctx.fillRect(TILE / 2 - 7, 0, 14, TILE);
      ctx.strokeStyle = shade(pal.pared, 1.5);
      ctx.strokeRect(TILE / 2 - 7 + 0.5, 0.5, 13, TILE - 1);
    } else if (bioma === 'garaje') {                  // mancha de aceite
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = shade(pal.detalle, 1.1);
      ctx.beginPath(); ctx.ellipse(TILE / 2, TILE / 2, 16, 9, 0.4, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      speckle(ctx, rng, shade(pal.detalle, 1.05), 24, 8, 8, TILE - 16, TILE - 16, 2);
    }
    return base;
  }

  window.Tiles = {
    TILE, G, B0, B1, FH,
    shade,
    build(levelDef, rng) {
      const pal = levelDef.paleta, b = levelDef.bioma;
      const wallStyle = b === 'bosque' ? 'arbol' : b === 'exterior' ? 'roca' : 'tabique';
      return {
        wallStyle,
        suelo: [0, 1, 2].map((v) => floorTile(pal, b, rng, v)),
        agua: aguaTile(pal, rng),
        decor: decorTile(pal, b, rng),
        topPieces: wallStyle === 'tabique' ? buildTopPieces(pal, b, rng) : null,
        facePieces: wallStyle === 'tabique' ? buildFacePieces(pal, b, rng) : null,
        arbol: wallStyle === 'arbol' ? arbolTile(pal, rng) : null,
        roca: wallStyle === 'roca' ? rocaTile(pal, rng) : null,
      };
    },
  };
})();
