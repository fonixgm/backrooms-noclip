// Render isométrico 2:1: orden del pintor por diagonales, prismas de pared,
// oscuridad estilo Darkwood sobre rombos y postprocesado (grano, viñeta, parpadeo).
(function () {
  const { T } = MapGen;
  let TW, TH, WH; // de Tiles (64, 32, 40)

  let canvas, ctx, W, H;
  let grain;

  function init(c) {
    TW = Tiles.TW; TH = Tiles.TH; WH = Tiles.WH;
    canvas = c;
    ctx = c.getContext('2d');
    W = c.width; H = c.height;
    grain = document.createElement('canvas');
    grain.width = 256; grain.height = 256;
    const gctx = grain.getContext('2d');
    const img = gctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 22;
    }
    gctx.putImageData(img, 0, 0);
  }

  // proyección: (x,y) de cuadrícula → esquina superior del rombo en px de mundo iso
  const isoX = (x, y) => (x - y) * (Tiles.TW / 2);
  const isoY = (x, y) => (x + y) * (Tiles.TH / 2);

  function diamondPathAt(px, py) {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + TW / 2, py + TH / 2);
    ctx.lineTo(px, py + TH);
    ctx.lineTo(px - TW / 2, py + TH / 2);
    ctx.closePath();
  }

  function prismPathAt(px, py) {
    ctx.beginPath();
    ctx.moveTo(px, py - WH);
    ctx.lineTo(px + TW / 2, py - WH + TH / 2);
    ctx.lineTo(px + TW / 2, py + TH / 2);
    ctx.lineTo(px, py + TH);
    ctx.lineTo(px - TW / 2, py + TH / 2);
    ctx.lineTo(px - TW / 2, py - WH + TH / 2);
    ctx.closePath();
  }

  // ---------- sprites procedurales (32×32, anclados al centro del rombo) ----------
  function drawEntity(e, x, y, lit, t) {
    const def = e.def;
    const cx = x + 16, cy = y + 16;
    ctx.save();

    if (def.glyph === 'smiler') {
      const glow = lit < 0.45 ? 1 : 0.25;
      ctx.globalAlpha = Math.max(0.15, glow);
      ctx.shadowColor = def.color; ctx.shadowBlur = 12 * glow;
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(cx - 6, cy - 5, 2.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, cy - 5, 2.6, 0, 7); ctx.fill();
      ctx.strokeStyle = def.color; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx, cy + 1, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.restore();
      return;
    }

    if (!e.revelada && def.comportamiento === 'imita') {
      drawHumanoid(cx, cy, '#c8b89a', '#7a6a50', t, true);
      ctx.restore();
      return;
    }
    if (!e.revelada && def.comportamiento === 'emboscada') {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(cx, cy + 6, 10, 6, 0, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }

    ctx.globalAlpha = Math.max(0.25, Math.min(1, lit + 0.25));
    const bob = Math.sin(t / 300 + e.uid) * 1.5;
    switch (def.glyph) {
      case 'hound':
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.ellipse(cx, cy + 4 + bob * 0.4, 11, 6, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 9, cy + bob * 0.4, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8d0c0';
        ctx.fillRect(cx + 10, cy - 1 + bob * 0.4, 2, 2);
        break;
      case 'faceling':
        drawHumanoid(cx, cy + bob * 0.3, def.color, Tiles.shade(def.color, 0.7), t, false);
        ctx.fillStyle = Tiles.shade(def.color, 1.15);
        ctx.beginPath(); ctx.ellipse(cx, cy - 8, 4.5, 5.5, 0, 0, 7); ctx.fill();
        break;
      case 'deathmoth': {
        ctx.fillStyle = def.color;
        const flap = Math.sin(t / 90 + e.uid) * 6;
        ctx.beginPath(); ctx.ellipse(cx - 7, cy + bob, 8, 4 + flap, -0.4, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 7, cy + bob, 8, 4 + flap, 0.4, 0, 7); ctx.fill();
        ctx.fillStyle = Tiles.shade(def.color, 0.6);
        ctx.beginPath(); ctx.ellipse(cx, cy + bob, 3, 7, 0, 0, 7); ctx.fill();
        break;
      }
      case 'clump':
        ctx.fillStyle = def.color;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + t / 700;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 5, 3, a, 0, 7);
          ctx.fill();
        }
        break;
      case 'duller':
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 3, cy - 14 + bob, 6, 26);
        ctx.beginPath(); ctx.arc(cx, cy - 14 + bob, 5, 0, 7); ctx.fill();
        break;
      case 'skinstealer':
        drawHumanoid(cx, cy + bob * 0.3, def.color, Tiles.shade(def.color, 0.65), t, false);
        ctx.strokeStyle = '#804030'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 4, cy - 12); ctx.lineTo(cx + 4, cy - 4); ctx.stroke();
        break;
      case 'window':
        ctx.fillStyle = Tiles.shade(def.color, 0.5);
        ctx.fillRect(cx - 9, cy - 11, 18, 22);
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 7, cy - 9, 14, 18);
        ctx.strokeStyle = Tiles.shade(def.color, 0.4);
        ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9);
        ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.stroke();
        break;
      case 'anethika':
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 4, cy - 16 + bob, 8, 28);
        ctx.beginPath(); ctx.arc(cx + 3, cy - 17 + bob, 6, 0, 7); ctx.fill();
        break;
      case 'spine':
        ctx.strokeStyle = def.color; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 6 + i * 4, cy + 8);
          ctx.quadraticCurveTo(cx - 8 + i * 5 + bob, cy - 6, cx - 2 + i * 3, cy - 10);
          ctx.stroke();
        }
        break;
      case 'needlelimb':
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 2, cy - 15 + bob, 4, 24);
        ctx.beginPath(); ctx.ellipse(cx, cy - 16 + bob, 3.5, 6, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = def.color; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + 2, cy - 4 + bob);
          ctx.lineTo(cx + 10, cy - 8 + i * 3 + bob);
          ctx.stroke();
        }
        break;
      case 'silverslime':
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.ellipse(cx, cy + 7, 11, 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha *= 0.6;
        ctx.beginPath(); ctx.ellipse(cx - 3, cy + 6, 3, 1.5, 0, 0, 7); ctx.fill();
        break;
      case 'aranea':
        ctx.strokeStyle = def.color; ctx.lineWidth = 2.5;
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx + 12 * s, cy - 10 + bob); ctx.lineTo(cx + 16 * s, cy + 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10 * s, cy + 4); ctx.lineTo(cx + 13 * s, cy + 12); ctx.stroke();
        }
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.ellipse(cx, cy - 2, 7, 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8e0d0';
        ctx.beginPath(); ctx.ellipse(cx, cy - 4, 4, 3, 0, 0, 7); ctx.fill();
        break;
      case 'predatorydoor':
        ctx.fillStyle = Tiles.shade(def.color, 0.8);
        ctx.fillRect(cx - 8, cy - 13, 16, 26);
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 6, cy - 11, 12, 22);
        ctx.fillStyle = '#e0c040';
        ctx.beginPath(); ctx.arc(cx + 3, cy, 1.5, 0, 7); ctx.fill();
        break;
      case 'cell':
        ctx.fillStyle = '#e8f0ea';
        ctx.beginPath(); ctx.arc(cx, cy + bob, 9, 0, 7); ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(cx, cy + bob, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#101010';
        ctx.beginPath(); ctx.arc(cx, cy + bob, 2.2, 0, 7); ctx.fill();
        break;
      case 'hunter':
        ctx.shadowColor = def.color; ctx.shadowBlur = 10;
        drawHumanoid(cx, cy + bob * 0.3, '#2a1516', def.color, t, false);
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 5, cy - 11, 2.5, 2.5);
        ctx.fillRect(cx + 2.5, cy - 11, 2.5, 2.5);
        break;
      default:
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawHumanoid(cx, cy, cuerpo, ropa, t, quieto) {
    const step = quieto ? 0 : Math.sin(t / 200) * 2;
    ctx.fillStyle = ropa;
    ctx.fillRect(cx - 4, cy - 4, 8, 12);
    ctx.fillStyle = cuerpo;
    ctx.beginPath(); ctx.arc(cx, cy - 9, 5, 0, 7); ctx.fill();
    ctx.fillStyle = ropa;
    ctx.fillRect(cx - 4, cy + 8, 3, 6 + step);
    ctx.fillRect(cx + 1, cy + 8, 3, 6 - step);
  }

  function drawPlayer(x, y, t, world) {
    const cx = x + 16, cy = y + 16;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 14, 9, 4, 0, 0, 7); ctx.fill();
    ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    drawHumanoid(cx, cy, '#e8c9a0', '#5a6e50', world.moving ? t : 0, !world.moving);
    ctx.restore();
  }

  function drawExit(ex, x, y, t) {
    const cx = x + 16, cy = y + 16;
    ctx.save();
    const pulse = 0.6 + Math.sin(t / 400) * 0.25;
    const col = ex.def.tipo === 'escape' ? '#6ae86a' : ex.def.tipo === 'sellada' ? '#666666' : '#e8c95a';
    ctx.shadowColor = col; ctx.shadowBlur = 14 * pulse;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 14, 11, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = Tiles.shade(col, 0.35);
    ctx.fillRect(cx - 9, cy - 16, 18, 30);
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.strokeRect(cx - 9, cy - 16, 18, 30);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = col;
    ctx.fillRect(cx - 6, cy - 13, 12, 24);
    ctx.restore();
  }

  function drawItem(it, x, y, t, objects) {
    const def = objects[it.id];
    const cx = x + 16, cy = y + 16 + Math.sin(t / 350 + cx) * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, y + 16 + 10, 7, 3, 0, 0, 7); ctx.fill();
    ctx.shadowColor = def.color; ctx.shadowBlur = 8;
    ctx.fillStyle = def.color;
    if (it.id === 'agua_almendras') {
      ctx.fillRect(cx - 3, cy - 6, 6, 12);
      ctx.fillStyle = Tiles.shade(def.color, 0.6);
      ctx.fillRect(cx - 3, cy - 6, 6, 3);
    } else if (it.id === 'botiquin') {
      ctx.fillRect(cx - 6, cy - 4, 12, 9);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 1, cy - 3, 2, 7); ctx.fillRect(cx - 4, cy, 8, 2);
    } else if (it.id === 'linterna') {
      ctx.fillRect(cx - 6, cy - 2, 10, 5);
      ctx.fillStyle = '#fff8d0';
      ctx.beginPath(); ctx.arc(cx + 5, cy, 3, 0, 7); ctx.fill();
    } else if (it.id === 'llave_nivel') {
      ctx.strokeStyle = def.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx - 3, cy, 3.5, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 5, cy + 3); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- frame ----------
  function frame(world, t) {
    const g = world.map.grid;
    const cam = world.camera;
    ctx.fillStyle = world.level.paleta.fondo;
    ctx.fillRect(0, 0, W, H);

    let flicker = 1;
    if (Math.random() < 0.012) flicker = 0.72;
    world._flicker = world._flicker === undefined ? 1 : world._flicker * 0.85 + flicker * 0.15;
    const fl = world._flicker;
    const dark = world.level.oscuridad;

    // agrupa actores por celda lógica para insertarlos en el orden del pintor
    const actores = new Map();
    const addActor = (key, fn) => {
      if (!actores.has(key)) actores.set(key, []);
      actores.get(key).push(fn);
    };
    for (const e of world.entities) {
      if (!e.viva) continue;
      if (e.rx === undefined) { e.rx = e.x; e.ry = e.y; }
      const idx = e.y * g.w + e.x;
      const lit = world.light[idx];
      const esSmiler = e.def.glyph === 'smiler';
      const visible = lit > 0.05 ||
        (esSmiler && (world.explored[idx] || Math.hypot(e.x - world.player.x, e.y - world.player.y) < 9));
      if (!visible) continue;
      addActor(e.y * g.w + e.x, () => {
        const ax = isoX(e.rx, e.ry) - cam.x, ay = isoY(e.rx, e.ry) - cam.y;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(ax, ay + TH / 2 + 8, 12, 4.5, 0, 0, 7); ctx.fill();
        ctx.translate(ax, ay + TH / 2 - 8);
        ctx.scale(1.4, 1.4);
        drawEntity(e, -16, -16, lit, t);
        ctx.restore();
      });
    }
    const p = world.player;
    addActor(p.y * g.w + p.x, () => {
      const ax = isoX(p.rx, p.ry) - cam.x, ay = isoY(p.rx, p.ry) - cam.y;
      ctx.save();
      ctx.translate(ax, ay + TH / 2 - 8);
      ctx.scale(1.4, 1.4);
      drawPlayer(-16, -16, t, world);
      ctx.restore();
    });

    // índices rápidos de salidas y objetos por celda
    const exitAt = new Map();
    for (const ex of world.map.exits) exitAt.set(ex.y * g.w + ex.x, ex);
    const itemsAt = new Map();
    for (const it of world.map.items) {
      if (it.taken) continue;
      const k = it.y * g.w + it.x;
      if (!itemsAt.has(k)) itemsAt.set(k, []);
      itemsAt.get(k).push(it);
    }

    const pSum = p.x + p.y;
    const pScreenX = isoX(p.rx, p.ry) - cam.x;
    const pScreenY = isoY(p.rx, p.ry) - cam.y;

    // recorrido por diagonales (x+y ascendente) = orden del pintor
    for (let s = 0; s <= g.w + g.h - 2; s++) {
      const x0 = Math.max(0, s - g.h + 1), x1 = Math.min(g.w - 1, s);
      for (let x = x0; x <= x1; x++) {
        const y = s - x;
        const idx = y * g.w + x;
        const light = world.light[idx];
        const seen = world.explored[idx];
        if (!seen && light <= 0.001) continue;

        const px = isoX(x, y) - cam.x;
        const py = isoY(x, y) - cam.y;
        if (px < -TW || px > W + TW || py < -TH - WH - 30 || py > H + TW) continue;

        const v = g.t[idx];
        // opacidad de oscuridad de la celda
        let a;
        if (light > 0) a = (1 - light * fl) * (0.2 + dark * 0.72);
        else a = 0.9;

        if (v === T.PARED) {
          // pared que tapa al jugador → translúcida
          let alpha = 1;
          if (s > pSum && Math.abs(px - pScreenX) < TW * 0.8 &&
              py - pScreenY > -TH && py - pScreenY < WH + TH * 1.6) alpha = 0.45;
          ctx.globalAlpha = alpha;
          ctx.drawImage(world.tiles.pared, px - TW / 2, py - WH);
          ctx.globalAlpha = 1;
          if (a > 0.01) {
            ctx.fillStyle = `rgba(0,0,0,${Math.min(a, alpha).toFixed(3)})`;
            prismPathAt(px, py);
            ctx.fill();
          }
          continue;
        }

        let img;
        if (v === T.VACIO) continue; // el abismo es el propio cielo de fondo
        if (v === T.AGUA) img = world.tiles.agua;
        else if (v === T.DECOR) img = world.tiles.decor;
        else img = world.tiles.suelo[(x * 7 + y * 13) % 3];
        ctx.drawImage(img, px - TW / 2, py);
        if (a > 0.01) {
          ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
          diamondPathAt(px, py);
          ctx.fill();
        }

        // contenido de la celda (solo si iluminada o salida conocida)
        const ex = exitAt.get(idx);
        if (ex && (light > 0.05 || seen)) {
          ctx.save();
          ctx.translate(px, py + TH / 2 - 8);
          ctx.scale(1.35, 1.35);
          drawExit(ex, -16, -16, t);
          ctx.restore();
        }
        const its = itemsAt.get(idx);
        if (its && light > 0.05) for (const it of its) drawItem(it, px - 16, py + TH / 2 - 20, t, world.data.objects);
        const acts = actores.get(idx);
        if (acts) for (const fn of acts) fn();
      }
    }

    // halo cálido alrededor del jugador
    if (!window.NOFX) {
      const pcx = pScreenX, pcy = pScreenY + TH / 2;
      const halo = ctx.createRadialGradient(pcx, pcy, 10, pcx, pcy, TW * (world.visionActual() * 0.55 + 1));
      halo.addColorStop(0, `rgba(255,240,190,${0.09 * fl})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);
    }

    if (world.player.cordura < 30) {
      const sc = (30 - world.player.cordura) / 30;
      ctx.fillStyle = `rgba(60,0,20,${0.12 * sc})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (!window.NOFX) {
      const vin = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.78);
      vin.addColorStop(0, 'rgba(0,0,0,0)');
      vin.addColorStop(1, 'rgba(0,0,0,0.62)');
      ctx.fillStyle = vin;
      ctx.fillRect(0, 0, W, H);

      ctx.globalAlpha = 0.5;
      ctx.drawImage(grain, Math.random() * -80, Math.random() * -80, W + 160, H + 160);
      ctx.globalAlpha = 1;
    }
  }

  window.Render = { init, frame, isoX, isoY, TILE: 64, _drawEntity: drawEntity };
})();
