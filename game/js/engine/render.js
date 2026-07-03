// Render cenital v3: paredes finas con autotiling y cara frontal, sprites
// pixel-art, props, efectos de combate y oscuridad estilo Darkwood.
(function () {
  const { T } = MapGen;
  let TILE, canvas, ctx, W, H, grain;

  function init(c) {
    TILE = Tiles.TILE;
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

  // ---------- entidades ----------
  // (x, y) = esquina superior izquierda de una caja de 48px; el sprite se centra
  function drawEntity(e, x, y, lit, t) {
    const def = e.def;
    const cx = x + 24, cy = y + 24;

    // Smiler: solo ojos y sonrisa brillando en la oscuridad
    if (def.glyph === 'smiler') {
      ctx.save();
      const glow = lit < 0.45 ? 1 : 0.25;
      ctx.globalAlpha = Math.max(0.15, glow);
      ctx.shadowColor = def.color; ctx.shadowBlur = 14 * glow;
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(cx - 8, cy - 6, 3.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8, cy - 6, 3.2, 0, 7); ctx.fill();
      ctx.strokeStyle = def.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy + 2, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.restore();
      return;
    }
    // emboscada sin revelar: bulto apenas visible
    if (!e.revelada && def.comportamiento === 'emboscada') {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(cx, cy + 8, 13, 8, 0, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }

    const frame = Math.floor(t / 280) % 2;
    const sprite = Sprites.get(def.glyph, frame);
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, Math.min(1, lit + 0.25));
    if (e._hitT && t - e._hitT < 170) ctx.filter = 'brightness(2.4)';
    if (sprite) {
      ctx.drawImage(sprite, Math.round(cx - 24), Math.round(cy - 28));
      ctx.restore();
      return;
    }

    // criaturas amorfas: dibujo vectorial mejorado
    const bob = Math.sin(t / 300 + e.uid) * 1.8;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
    switch (def.glyph) {
      case 'clump':
        ctx.fillStyle = def.color;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + t / 650;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * 8, cy + Math.sin(a) * 7, 7, 3.6, a, 0, 7);
          ctx.fill();
        }
        ctx.fillStyle = Tiles.shade(def.color, 0.7);
        ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, 7); ctx.fill();
        break;
      case 'window':
        ctx.fillStyle = Tiles.shade(def.color, 0.5);
        ctx.fillRect(cx - 11, cy - 14, 22, 28);
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 8.5, cy - 11.5, 17, 23);
        ctx.strokeStyle = Tiles.shade(def.color, 0.4); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy + 11);
        ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.moveTo(cx - 7, cy + 9); ctx.lineTo(cx - 1, cy - 10); ctx.lineTo(cx + 3, cy - 10); ctx.lineTo(cx - 3, cy + 9); ctx.closePath(); ctx.fill();
        break;
      case 'spine':
        ctx.strokeStyle = def.color; ctx.lineWidth = 2.4;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 8 + i * 4, cy + 11);
          ctx.quadraticCurveTo(cx - 10 + i * 6 + bob, cy - 7, cx - 3 + i * 4, cy - 13);
          ctx.stroke();
        }
        ctx.fillStyle = Tiles.shade(def.color, 1.15);
        ctx.beginPath(); ctx.ellipse(cx, cy - 1, 5, 7, 0.3, 0, 7); ctx.fill();
        break;
      case 'silverslime': {
        const puls = 1 + Math.sin(t / 400 + e.uid) * 0.12;
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.ellipse(cx, cy + 9, 14 * puls, 6.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.ellipse(cx - 4, cy + 7, 4, 2, -0.3, 0, 7); ctx.fill();
        ctx.fillStyle = Tiles.shade(def.color, 0.75);
        ctx.beginPath(); ctx.ellipse(cx + 5, cy + 11, 3.5, 1.6, 0.3, 0, 7); ctx.fill();
        break;
      }
      case 'aranea':
        ctx.strokeStyle = def.color; ctx.lineWidth = 2.8;
        for (const s of [-1, 1]) {
          const leg = Math.sin(t / 160 + s) * 2;
          ctx.beginPath(); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx + 14 * s, cy - 13 + leg); ctx.lineTo(cx + 19 * s, cy + 9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx, cy + 1); ctx.lineTo(cx + 12 * s, cy + 5 - leg); ctx.lineTo(cx + 15 * s, cy + 14); ctx.stroke();
        }
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.ellipse(cx, cy - 2, 8.5, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8e0d0';
        ctx.beginPath(); ctx.ellipse(cx, cy - 5, 5, 3.6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#181818';
        ctx.fillRect(cx - 3, cy - 6, 1.8, 1.8); ctx.fillRect(cx + 1.4, cy - 6, 1.8, 1.8);
        break;
      case 'predatorydoor':
        ctx.fillStyle = Tiles.shade(def.color, 0.75);
        ctx.fillRect(cx - 10, cy - 16, 20, 32);
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 7.5, cy - 13.5, 15, 27);
        ctx.strokeStyle = Tiles.shade(def.color, 0.55);
        ctx.strokeRect(cx - 5, cy - 10.5, 10, 9);
        ctx.strokeRect(cx - 5, cy + 1, 10, 9);
        ctx.fillStyle = '#e0c040';
        ctx.beginPath(); ctx.arc(cx + 4.5, cy + 1, 1.8, 0, 7); ctx.fill();
        break;
      case 'cell': {
        const iris = def.color;
        ctx.fillStyle = 'rgba(230,240,235,0.92)';
        ctx.beginPath(); ctx.arc(cx, cy + bob, 11, 0, 7); ctx.fill();
        ctx.fillStyle = iris;
        ctx.beginPath(); ctx.arc(cx + 1, cy + bob, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#101010';
        ctx.beginPath(); ctx.arc(cx + 1, cy + bob, 2.8, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(cx - 3.5, cy + bob - 4, 2, 0, 7); ctx.fill();
        break;
      }
      default:
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer(px, py, t, world) {
    const p = world.player;
    const dir = p.dir || 'down';
    const spriteId = dir === 'side' ? 'player_side' : 'player_' + dir;
    const frame = world.moving ? Math.floor(t / 160) % 2 : 0;
    const img = Sprites.get(spriteId, frame);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(px + 24, py + 40, 11, 4, 0, 0, 7); ctx.fill();
    if (p._hitT && t - p._hitT < 170) ctx.filter = 'brightness(2.2)';
    if (p.flip) {
      ctx.translate(px + 48, py - 4);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
    } else {
      ctx.drawImage(img, px, py - 4);
    }
    ctx.restore();
  }

  function drawExit(ex, x, y, t) {
    const cx = x + 24, cy = y + 24;
    ctx.save();
    const pulse = 0.6 + Math.sin(t / 400) * 0.25;
    const col = ex.def.tipo === 'escape' ? '#6ae86a' : ex.def.tipo === 'sellada' ? '#666666' : '#e8c95a';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 17, 13, 4.5, 0, 0, 7); ctx.fill();
    ctx.shadowColor = col; ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = Tiles.shade(col, 0.35);
    ctx.fillRect(cx - 11, cy - 19, 22, 36);
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.strokeRect(cx - 11, cy - 19, 22, 36);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = col;
    ctx.fillRect(cx - 7.5, cy - 15.5, 15, 29);
    ctx.restore();
  }

  function drawItem(it, x, y, t, objects) {
    const def = objects[it.id];
    const cx = x + 24, cy = y + 24 + Math.sin(t / 350 + cx) * 2.5;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, y + 36, 8, 3, 0, 0, 7); ctx.fill();
    ctx.shadowColor = def.color; ctx.shadowBlur = 9;
    ctx.fillStyle = def.color;
    if (it.id === 'agua_almendras') {
      ctx.fillRect(cx - 4, cy - 8, 8, 15);
      ctx.fillStyle = Tiles.shade(def.color, 0.6);
      ctx.fillRect(cx - 4, cy - 8, 8, 4);
    } else if (it.id === 'botiquin') {
      ctx.fillRect(cx - 7, cy - 5, 14, 11);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 1.5, cy - 3.5, 3, 8); ctx.fillRect(cx - 4.5, cy - 0.5, 9, 3);
    } else if (it.id === 'linterna') {
      ctx.fillRect(cx - 7, cy - 2.5, 12, 6);
      ctx.fillStyle = '#fff8d0';
      ctx.beginPath(); ctx.arc(cx + 6, cy, 3.6, 0, 7); ctx.fill();
    } else if (it.id === 'llave_nivel') {
      ctx.strokeStyle = def.color; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx - 4, cy, 4, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 6, cy + 4); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- frame ----------
  function frame(world, t) {
    const g = world.map.grid;
    const cam = world.camera;
    const dark = world.level.oscuridad;

    const [shx, shy] = window.NOFX ? [0, 0] : Effects.shakeOffset(t);
    ctx.save();
    ctx.translate(shx, shy);

    ctx.fillStyle = world.level.paleta.fondo;
    ctx.fillRect(-12, -12, W + 24, H + 24);

    let flicker = 1;
    if (Math.random() < 0.012) flicker = 0.72;
    world._flicker = world._flicker === undefined ? 1 : world._flicker * 0.85 + flicker * 0.15;
    const fl = world._flicker;

    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const x1 = Math.min(g.w - 1, x0 + Math.ceil(W / TILE) + 2);
    const y1 = Math.min(g.h - 1, y0 + Math.ceil(H / TILE) + 2);

    const vis = (idx) => world.explored[idx] || world.light[idx] > 0.001;

    // PASE 1: suelos (también bajo los tabiques: la moqueta continúa)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const idx = y * g.w + x;
        if (!vis(idx)) continue;
        const v = g.t[idx];
        if (v === T.VACIO) continue; // el fondo es el cielo/abismo
        const sx = x * TILE - cam.x, sy = y * TILE - cam.y;
        let img;
        if (v === T.AGUA) img = world.tiles.agua;
        else if (v === T.DECOR) img = world.tiles.decor;
        else img = world.tiles.suelo[(x * 7 + y * 13) % 3];
        ctx.drawImage(img, sx, sy);
      }

    // índices por celda
    const exitAt = new Map();
    for (const ex of world.map.exits) exitAt.set(ex.y * g.w + ex.x, ex);
    const itemsAt = new Map();
    for (const it of world.map.items) {
      if (it.taken) continue;
      (itemsAt.get(it.y * g.w + it.x) ?? itemsAt.set(it.y * g.w + it.x, []).get(it.y * g.w + it.x)).push(it);
    }
    const propsAt = new Map();
    for (const pr of world.map.props || []) {
      (propsAt.get(pr.y * g.w + pr.x) ?? propsAt.set(pr.y * g.w + pr.x, []).get(pr.y * g.w + pr.x)).push(pr);
    }
    const actorsAt = new Map();
    for (const e of world.entities) {
      if (!e.viva) continue;
      if (e.rx === undefined) { e.rx = e.x; e.ry = e.y; }
      const idx = e.y * g.w + e.x;
      const lit = world.light[idx];
      const esSmiler = e.def.glyph === 'smiler';
      const visible = lit > 0.05 ||
        (esSmiler && (world.explored[idx] || Math.hypot(e.x - world.player.x, e.y - world.player.y) < 9));
      if (!visible) continue;
      (actorsAt.get(e.y) ?? actorsAt.set(e.y, []).get(e.y)).push(e);
    }

    const esWall = (x, y) => MapGen.at(g, x, y) === T.PARED;

    // PASE 2: por filas — salidas/objetos/props, tabiques (con cara), actores
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = y * g.w + x;
        if (!vis(idx)) continue;
        const sx = x * TILE - cam.x, sy = y * TILE - cam.y;
        const light = world.light[idx];

        const ex = exitAt.get(idx);
        if (ex && (light > 0.05 || world.explored[idx])) drawExit(ex, sx, sy, t);
        const its = itemsAt.get(idx);
        if (its && light > 0.05) for (const it of its) drawItem(it, sx, sy, t, world.data.objects);
        const prs = propsAt.get(idx);
        if (prs && (light > 0.05 || world.explored[idx]))
          for (const pr of prs) {
            Sprites.drawProp(ctx, pr.id, sx + 24, sy + 24, t, null);
            if (pr.contenedor && !pr.registrado) { // brillo de "se puede registrar"
              ctx.save();
              ctx.globalAlpha = 0.5 + Math.sin(t / 300) * 0.3;
              ctx.fillStyle = '#ffe9a0';
              ctx.beginPath(); ctx.arc(sx + 36, sy + 10, 2.2, 0, 7); ctx.fill();
              ctx.restore();
            }
          }

        if (g.t[idx] === T.PARED) {
          if (world.tiles.wallStyle === 'arbol') {
            ctx.drawImage(world.tiles.arbol, sx, sy - 18);
          } else if (world.tiles.wallStyle === 'roca') {
            ctx.drawImage(world.tiles.roca, sx, sy - 10);
          } else {
            const bits = (esWall(x, y - 1) ? 1 : 0) | (esWall(x + 1, y) ? 2 : 0) |
                         (esWall(x, y + 1) ? 4 : 0) | (esWall(x - 1, y) ? 8 : 0);
            ctx.drawImage(world.tiles.topPieces[bits], sx, sy);
            // cara frontal si la casilla sur es transitable y visible
            const southIdx = (y + 1) * g.w + x;
            if (y + 1 < g.h && !esWall(x, y + 1) && g.t[southIdx] !== T.VACIO) {
              const key = (bits & 8 ? 1 : 0) | (bits & 2 ? 2 : 0);
              const piece = world.tiles.facePieces[key];
              ctx.drawImage(piece.canvas, sx + piece.x0, sy + Tiles.B1);
              // sombra proyectada sobre el suelo
              ctx.fillStyle = 'rgba(0,0,0,0.22)';
              ctx.fillRect(sx + piece.x0, sy + Tiles.B1 + Tiles.FH, piece.canvas.width, 5);
            }
          }
        }
      }

      // actores de esta fila
      const acts = actorsAt.get(y);
      if (acts) {
        for (const e of acts) {
          let ax = e.rx * TILE - cam.x, ay = e.ry * TILE - cam.y;
          // embestida de ataque hacia el jugador
          if (e._atkT !== undefined) {
            const k = (t - e._atkT) / 240;
            if (k >= 0 && k <= 1) {
              const amp = Math.sin(Math.PI * k) * 0.38;
              ax += (world.player.x - e.x) * amp * TILE;
              ay += (world.player.y - e.y) * amp * TILE;
            }
          }
          const lit = world.light[e.y * g.w + e.x];
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.ellipse(ax + 24, ay + 40, 11, 4, 0, 0, 7); ctx.fill();
          ctx.restore();
          drawEntity(e, ax, ay - 6, lit, t);
        }
      }
      if (world.player.y === y) {
        drawPlayer(world.player.rx * TILE - cam.x, world.player.ry * TILE - cam.y, t, world);
      }
    }

    // PASE 3: oscuridad Darkwood por casilla
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const idx = y * g.w + x;
        const light = world.light[idx];
        const seen = world.explored[idx];
        let a;
        if (light > 0) a = (1 - light * fl) * (0.2 + dark * 0.72);
        else if (seen) a = 0.9;
        else a = 1;
        if (a > 0.01) {
          ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
          ctx.fillRect(x * TILE - cam.x, y * TILE - cam.y, TILE, TILE);
        }
      }

    // halo cálido
    if (!window.NOFX) {
      const pcx = world.player.rx * TILE - cam.x + TILE / 2;
      const pcy = world.player.ry * TILE - cam.y + TILE / 2;
      const halo = ctx.createRadialGradient(pcx, pcy, 12, pcx, pcy, TILE * (world.visionActual() * 0.75 + 1));
      halo.addColorStop(0, `rgba(255,240,190,${0.09 * fl})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);
    }

    if (!window.NOFX) Effects.draw(ctx, cam.x, cam.y, t, TILE);
    ctx.restore(); // fin de la sacudida

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

  window.Render = { init, frame, TILE: 48, _drawEntity: drawEntity };
})();
