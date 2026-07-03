// Texturas isométricas procedurales por paleta/bioma.
// Proyección 2:1 — suelo: rombo 64×32 · pared: prisma 64×72 (techo + 2 caras).
(function () {
  const TW = 64, TH = 32, WH = 40;

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

  // rombo de suelo con origen (0,0) en su esquina superior izquierda del bounding box
  function diamondPath(ctx, ox = 0, oy = 0) {
    ctx.beginPath();
    ctx.moveTo(ox + TW / 2, oy);
    ctx.lineTo(ox + TW, oy + TH / 2);
    ctx.lineTo(ox + TW / 2, oy + TH);
    ctx.lineTo(ox, oy + TH / 2);
    ctx.closePath();
  }

  // caras del prisma (canvas 64×72; techo en y[0,32], caras hasta y=72)
  function faceLeftPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, TH / 2);
    ctx.lineTo(TW / 2, TH);
    ctx.lineTo(TW / 2, TH + WH);
    ctx.lineTo(0, TH / 2 + WH);
    ctx.closePath();
  }
  function faceRightPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(TW / 2, TH);
    ctx.lineTo(TW, TH / 2);
    ctx.lineTo(TW, TH / 2 + WH);
    ctx.lineTo(TW / 2, TH + WH);
    ctx.closePath();
  }

  function speckleClipped(ctx, rng, color, n, x0, y0, w, h, size = 1) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++)
      ctx.fillRect(x0 + rng.int(0, w - 1), y0 + rng.int(0, h - 1), size, size);
  }

  // ---------- suelo ----------
  function floorTile(pal, bioma, rng, variant) {
    const c = canvas(TW, TH), ctx = c.getContext('2d');
    diamondPath(ctx);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = shade(pal.suelo, 0.92 + variant * 0.06);
    ctx.fillRect(0, 0, TW, TH);
    if (bioma === 'pasillos') { // moqueta
      speckleClipped(ctx, rng, shade(pal.suelo, 0.78), 110, 0, 0, TW, TH);
      speckleClipped(ctx, rng, shade(pal.suelo, 1.14), 70, 0, 0, TW, TH);
      if (variant === 2) speckleClipped(ctx, rng, shade(pal.detalle, 0.9), 30, 8, 4, 40, 20, 2);
    } else if (bioma === 'garaje' || bioma === 'tuneles') { // hormigón
      speckleClipped(ctx, rng, shade(pal.suelo, 0.82), 50, 0, 0, TW, TH);
      if (variant > 0) {
        ctx.strokeStyle = shade(pal.suelo, 0.66);
        ctx.beginPath();
        let x = rng.int(10, 50), y = 2;
        ctx.moveTo(x, y);
        while (y < TH) { x += rng.int(-4, 4); y += rng.int(3, 6); ctx.lineTo(x, y); }
        ctx.stroke();
      }
    } else if (bioma === 'hospital' || bioma === 'oficinas') { // baldosa
      speckleClipped(ctx, rng, shade(pal.suelo, 1.08), 26, 0, 0, TW, TH);
      ctx.strokeStyle = shade(pal.suelo, 0.72);
      ctx.lineWidth = 1;
      // juntas de baldosa siguiendo los ejes isométricos
      ctx.beginPath();
      ctx.moveTo(TW / 4, TH / 4); ctx.lineTo(TW * 0.75, TH * 0.75);
      ctx.moveTo(TW / 4, TH * 0.75); ctx.lineTo(TW * 0.75, TH / 4);
      ctx.stroke();
    } else if (bioma === 'bosque' || bioma === 'exterior') { // tierra/hierba
      speckleClipped(ctx, rng, shade(pal.suelo, 0.8), 70, 0, 0, TW, TH);
      speckleClipped(ctx, rng, shade(pal.detalle, 1.0), 20, 0, 0, TW, TH, 2);
    } else if (bioma === 'ciudad') { // adoquín
      speckleClipped(ctx, rng, shade(pal.suelo, 0.85), 36, 0, 0, TW, TH);
      ctx.strokeStyle = shade(pal.suelo, 0.7);
      ctx.beginPath();
      ctx.moveTo(TW / 2, 0); ctx.lineTo(TW / 2, TH);
      ctx.moveTo(TW / 4, TH / 4); ctx.lineTo(TW * 0.75, TH * 0.75);
      ctx.stroke();
    } else if (bioma === 'torres') { // panel
      speckleClipped(ctx, rng, shade(pal.suelo, 1.05), 12, 0, 0, TW, TH);
      ctx.strokeStyle = shade(pal.suelo, 0.82);
      diamondPath(ctx, 0, 0);
      ctx.stroke();
    }
    ctx.restore();
    // arista sutil del rombo
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    diamondPath(ctx);
    ctx.stroke();
    return c;
  }

  // ---------- detalles de cara de pared por bioma ----------
  function faceDetail(ctx, pal, bioma, rng, x0, w, dim) {
    // dibuja dentro del clip de una cara: x0 = borde izquierdo, w = ancho, dim = multiplicador de luz
    const yTop = TH / 2, yBot = TH + WH; // rango vertical aproximado de la cara
    if (bioma === 'pasillos') {
      // papel pintado a franjas verticales + zócalo + manchas + enchufes
      for (let x = x0; x < x0 + w; x += 8)
        if (((x / 8) | 0) % 2 === 0) {
          ctx.fillStyle = shade(pal.pared, 1.14 * dim);
          ctx.fillRect(x, 0, 4, yBot);
        }
      ctx.fillStyle = shade(pal.detalle, 0.6 * dim); // zócalo
      ctx.fillRect(x0, yBot - 9, w, 9);
      ctx.fillStyle = shade(pal.pared, 0.8 * dim);   // manchas de humedad
      for (let i = 0; i < 3; i++) {
        if (!rng.chance(0.5)) continue;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(x0 + rng.int(4, w - 4), rng.int(20, 55), rng.int(3, 7), rng.int(5, 10), 0, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (rng.chance(0.5)) { // enchufe: seña de identidad de las Backrooms
        const ex = x0 + rng.int(6, w - 12), ey = yBot - 22;
        ctx.fillStyle = shade(pal.pared, 1.25 * dim);
        ctx.fillRect(ex, ey, 7, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(ex + 2, ey + 2, 1.5, 2);
        ctx.fillRect(ex + 4.5, ey + 2, 1.5, 2);
      }
    } else if (bioma === 'tuneles' || bioma === 'ciudad') {
      // ladrillo en hiladas
      ctx.strokeStyle = shade(pal.pared, 0.6 * dim);
      ctx.lineWidth = 1;
      for (let y = 12; y < yBot - 2; y += 8) {
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
        for (let x = x0 + ((y / 8) % 2 ? 4 : 10); x < x0 + w; x += 13) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke();
        }
      }
    } else if (bioma === 'hospital' || bioma === 'oficinas') {
      // azulejo hasta media altura + franja de suciedad
      ctx.fillStyle = shade(pal.detalle, 1.15 * dim);
      ctx.fillRect(x0, yBot - 26, w, 26);
      ctx.strokeStyle = shade(pal.detalle, 0.8 * dim);
      for (let x = x0; x < x0 + w; x += 9) {
        ctx.beginPath(); ctx.moveTo(x, yBot - 26); ctx.lineTo(x, yBot); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x0, yBot - 26); ctx.lineTo(x0 + w, yBot - 26); ctx.stroke();
      speckleClipped(ctx, rng, shade(pal.pared, 0.75 * dim), 16, x0, 8, w, 20);
    } else if (bioma === 'garaje') {
      speckleClipped(ctx, rng, shade(pal.pared, 0.8 * dim), 30, x0, 8, w, yBot - 10);
      ctx.fillStyle = shade(pal.detalle, 1.3 * dim); // banda de señalización
      ctx.fillRect(x0, yBot - 16, w, 4);
    } else if (bioma === 'torres') {
      ctx.strokeStyle = shade(pal.pared, 1.4 * dim); // remaches/paneles metálicos
      for (let y = 14; y < yBot; y += 12) {
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
      }
    } else { // exterior/roca: estratos
      ctx.strokeStyle = shade(pal.pared, 0.7 * dim);
      for (let y = 14; y < yBot; y += rng.int(7, 12)) {
        ctx.beginPath();
        ctx.moveTo(x0, y + rng.int(-2, 2));
        ctx.lineTo(x0 + w, y + rng.int(-2, 2));
        ctx.stroke();
      }
      speckleClipped(ctx, rng, shade(pal.pared, 0.85 * dim), 24, x0, 10, w, yBot - 12);
    }
  }

  function wallTile(pal, bioma, rng) {
    const c = canvas(TW, TH + WH), ctx = c.getContext('2d');

    if (bioma === 'bosque') { // árbol: tronco + copa
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(TW / 2, TH + WH - 8, 18, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = shade('#5a4632', 1);
      ctx.fillRect(TW / 2 - 5, 26, 10, WH + 2);
      ctx.fillStyle = shade('#4a3a2a', 1);
      ctx.fillRect(TW / 2 - 5, 26, 3, WH + 2);
      ctx.fillStyle = shade(pal.pared, 0.95);
      ctx.beginPath(); ctx.ellipse(TW / 2, 22, 24, 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = shade(pal.pared, 1.2);
      ctx.beginPath(); ctx.ellipse(TW / 2 - 7, 16, 12, 9, 0, 0, 7); ctx.fill();
      return c;
    }

    // cara izquierda (SO), más oscura
    ctx.save();
    faceLeftPath(ctx); ctx.clip();
    ctx.fillStyle = shade(pal.pared, 0.62);
    ctx.fillRect(0, 0, TW / 2, TH + WH);
    faceDetail(ctx, pal, bioma, rng, 0, TW / 2, 0.62);
    ctx.restore();

    // cara derecha (SE), iluminada
    ctx.save();
    faceRightPath(ctx); ctx.clip();
    ctx.fillStyle = shade(pal.pared, 0.98);
    ctx.fillRect(TW / 2, 0, TW / 2, TH + WH);
    faceDetail(ctx, pal, bioma, rng, TW / 2, TW / 2, 0.98);
    ctx.restore();

    // techo del prisma
    ctx.save();
    diamondPath(ctx); ctx.clip();
    ctx.fillStyle = shade(pal.pared, 1.22);
    ctx.fillRect(0, 0, TW, TH);
    speckleClipped(ctx, rng, shade(pal.pared, 1.05), 26, 0, 0, TW, TH);
    ctx.restore();

    // aristas
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(TW / 2, TH); ctx.lineTo(TW / 2, TH + WH); // arista vertical central
    ctx.stroke();
    diamondPath(ctx);
    ctx.stroke();
    return c;
  }

  function aguaTile(pal, rng) {
    const c = canvas(TW, TH), ctx = c.getContext('2d');
    ctx.save();
    diamondPath(ctx); ctx.clip();
    ctx.fillStyle = shade(pal.detalle, 0.65);
    ctx.fillRect(0, 0, TW, TH);
    ctx.strokeStyle = shade(pal.detalle, 1.35);
    for (let i = 0; i < 3; i++) {
      const y = rng.int(8, TH - 8);
      ctx.beginPath();
      ctx.moveTo(rng.int(8, 20), y);
      ctx.quadraticCurveTo(TW / 2, y + rng.int(-3, 3), TW - rng.int(8, 20), y);
      ctx.stroke();
    }
    ctx.restore();
    return c;
  }

  function vacioTile(pal) {
    const c = canvas(TW, TH), ctx = c.getContext('2d');
    ctx.save();
    diamondPath(ctx); ctx.clip();
    const grad = ctx.createLinearGradient(0, 0, 0, TH);
    grad.addColorStop(0, pal.fondo);
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TW, TH);
    ctx.restore();
    return c;
  }

  function decorTile(pal, bioma, rng) {
    const base = floorTile(pal, bioma, rng, 1);
    const ctx = base.getContext('2d');
    ctx.save();
    diamondPath(ctx); ctx.clip();
    if (bioma === 'torres') { // viga sobre el vacío
      ctx.fillStyle = shade(pal.pared, 1.1);
      ctx.beginPath();
      ctx.moveTo(TW / 2 - 8, 2); ctx.lineTo(TW / 2 + 8, 2);
      ctx.lineTo(TW / 2 + 8, TH - 2); ctx.lineTo(TW / 2 - 8, TH - 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(pal.pared, 1.5);
      ctx.stroke();
    } else if (bioma === 'garaje') { // mancha de aceite
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = shade(pal.detalle, 1.1);
      ctx.beginPath(); ctx.ellipse(TW / 2, TH / 2, 14, 7, 0.4, 0, 7); ctx.fill();
    } else {
      speckleClipped(ctx, rng, shade(pal.detalle, 1.05), 18, 8, 4, TW - 16, TH - 8, 2);
    }
    ctx.restore();
    return base;
  }

  window.Tiles = {
    TW, TH, WH,
    TILE: TW, // compatibilidad
    shade,
    build(levelDef, rng) {
      const pal = levelDef.paleta, b = levelDef.bioma;
      return {
        suelo: [0, 1, 2].map((v) => floorTile(pal, b, rng, v)),
        pared: wallTile(pal, b, rng),
        agua: aguaTile(pal, rng),
        vacio: vacioTile(pal),
        decor: decorTile(pal, b, rng),
      };
    },
  };
})();
