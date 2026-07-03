// Efectos visuales temporales: números de daño, partículas, sacudida de
// pantalla, destellos. La lógica del juego los encola; el render los dibuja.
(function () {
  let list = [];
  let shake = { mag: 0, until: 0 };

  function now() { return performance.now(); }

  // número flotante en coordenadas de casilla (wx, wy)
  function number(wx, wy, txt, color) {
    list.push({ type: 'num', wx, wy, txt, color, t0: now(), dur: 950 });
  }

  // salpicadura de partículas
  function particles(wx, wy, color, n = 10) {
    const pieces = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 55;
      pieces.push({ a, v, r: 1.5 + Math.random() * 2 });
    }
    list.push({ type: 'part', wx, wy, color, pieces, t0: now(), dur: 550 });
  }

  // destello circular (recogidas, curas)
  function flash(wx, wy, color) {
    list.push({ type: 'flash', wx, wy, color, t0: now(), dur: 400 });
  }

  function doShake(mag = 5, dur = 160) {
    shake = { mag, until: now() + dur };
  }

  function shakeOffset(t) {
    if (t > shake.until) return [0, 0];
    const k = (shake.until - t) / 200;
    return [(Math.random() * 2 - 1) * shake.mag * k, (Math.random() * 2 - 1) * shake.mag * k];
  }

  function draw(ctx, camX, camY, t, TILE) {
    list = list.filter((e) => t - e.t0 < e.dur);
    for (const e of list) {
      // el timestamp del rAF puede ir ligeramente por detrás de performance.now()
      const k = Math.min(1, Math.max(0, (t - e.t0) / e.dur));
      const sx = e.wx * TILE - camX + TILE / 2;
      const sy = e.wy * TILE - camY + TILE / 2;
      ctx.save();
      if (e.type === 'num') {
        ctx.globalAlpha = 1 - k * k;
        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText(e.txt, sx + 1, sy - 14 - k * 26 + 1);
        ctx.fillStyle = e.color;
        ctx.fillText(e.txt, sx, sy - 14 - k * 26);
      } else if (e.type === 'part') {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = e.color;
        for (const p of e.pieces) {
          const d = p.v * k;
          ctx.fillRect(sx + Math.cos(p.a) * d - p.r, sy + Math.sin(p.a) * d - p.r + k * k * 18, p.r * 2, p.r * 2);
        }
      } else if (e.type === 'flash') {
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 6 + k * 20, 0, 7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  window.Effects = { number, particles, flash, doShake, shakeOffset, draw, clear() { list = []; } };
})();
