// Sprites pixel-art procedurales (rejilla 16×16 → ×3 = 48px) con contorno
// automático y 2 frames de animación. Soporta override con PNG externos en
// game/assets/sprites/<id>.png (hoja horizontal de frames de 48×48).
(function () {
  const S = 16, P = 3, OUT = 'rgba(12,10,8,0.9)';

  // ---------- rasterizador de matrices ----------
  function rasterize(pal, rows) {
    const c = document.createElement('canvas');
    c.width = S * P; c.height = S * P;
    const ctx = c.getContext('2d');
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      const row = rows[y] || '';
      for (let x = 0; x < S; x++) grid[y][x] = pal[row[x]] || null;
    }
    // contorno automático: celda vacía adyacente a una llena
    ctx.fillStyle = OUT;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        if (grid[y][x]) continue;
        const near = (grid[y - 1]?.[x]) || (grid[y + 1]?.[x]) || grid[y][x - 1] || grid[y][x + 1];
        if (near) ctx.fillRect(x * P, y * P, P, P);
      }
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++)
        if (grid[y][x]) {
          ctx.fillStyle = grid[y][x];
          ctx.fillRect(x * P, y * P, P, P);
        }
    return c;
  }

  // ---------- definiciones ----------
  // caracteres: '.'=transparente; el resto según paleta de cada sprite
  const DEFS = {};

  // ===== JUGADOR =====
  const palPlayer = {
    h: '#4a3626', f: '#e8c9a0', e: '#2a2018', j: '#5a6e50', J: '#46573e',
    s: '#e8c9a0', p: '#3e3a36', b: '#2a2622', k: '#8a5a30', K: '#6e4826',
  };
  DEFS.player_down = { pal: palPlayer, frames: [[
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hffffffh....',
    '....hfeffefh....',
    '.....ffffff.....',
    '....jjjjjjjj....',
    '...jjkjjjjkjj...',
    '...sjkjjjjkjs...',
    '...sjjjJJjjjs...',
    '....jjjJJjjj....',
    '....pppppppp....',
    '....ppp..ppp....',
    '....pp....pp....',
    '....bb....bb....',
    '................',
  ], [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hffffffh....',
    '....hfeffefh....',
    '.....ffffff.....',
    '....jjjjjjjj....',
    '...jjkjjjjkjj...',
    '...sjkjjjjkjs...',
    '...sjjjJJjjjs...',
    '....jjjJJjjj....',
    '....pppppppp....',
    '....ppp..pp.....',
    '.....pp...pp....',
    '.....bb...bb....',
    '................',
  ]] };
  DEFS.player_up = { pal: palPlayer, frames: [[
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hhhhhhhh....',
    '....hhhhhhhh....',
    '.....hhhhhh.....',
    '....jjjjjjjj....',
    '...jjKKKKKKjj...',
    '...sjKkkkkKjs...',
    '...sjKkkkkKjs...',
    '....jKKKKKKj....',
    '....pppppppp....',
    '....ppp..ppp....',
    '....pp....pp....',
    '....bb....bb....',
    '................',
  ], [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hhhhhhhh....',
    '....hhhhhhhh....',
    '.....hhhhhh.....',
    '....jjjjjjjj....',
    '...jjKKKKKKjj...',
    '...sjKkkkkKjs...',
    '...sjKkkkkKjs...',
    '....jKKKKKKj....',
    '....pppppppp....',
    '.....pp..ppp....',
    '....pp...pp.....',
    '....bb...bb.....',
    '................',
  ]] };
  DEFS.player_side = { pal: palPlayer, frames: [[
    '................',
    '......hhhh......',
    '.....hhhhhh.....',
    '.....hhffff.....',
    '.....hhfeff.....',
    '......ffff......',
    '.....jjjjjj.....',
    '....Kjjjjjj.....',
    '....KKjjjjs.....',
    '....KKjjjjs.....',
    '....Kjjjjj......',
    '.....ppppp......',
    '.....pp.pp......',
    '.....pp.pp......',
    '.....bb.bb......',
    '................',
  ], [
    '................',
    '......hhhh......',
    '.....hhhhhh.....',
    '.....hhffff.....',
    '.....hhfeff.....',
    '......ffff......',
    '.....jjjjjj.....',
    '....Kjjjjjj.....',
    '....KKjjjjs.....',
    '....KKjjjjs.....',
    '....Kjjjjj......',
    '.....ppppp......',
    '....pp..pp......',
    '....pp...pp.....',
    '....bb...bb.....',
    '................',
  ]] };

  // ===== FACELING: humanoide gris pálido SIN rostro =====
  const palFace = { f: '#d8ccb8', F: '#c0b4a0', t: '#8a8074', T: '#736a60', p: '#5a544c' };
  DEFS.faceling = { pal: palFace, frames: [[
    '................',
    '.....ffffff.....',
    '....ffffffff....',
    '....ffffffff....',
    '....ffffffff....',
    '.....ffffff.....',
    '....tttttttt....',
    '...tttttttttt...',
    '...ftttTTttff...',
    '...ftttTTttff...',
    '....tttttttt....',
    '....pppppppp....',
    '....ppp..ppp....',
    '....pp....pp....',
    '....FF....FF....',
    '................',
  ], [
    '................',
    '.....ffffff.....',
    '....ffffffff....',
    '....ffffffff....',
    '....ffffffff....',
    '.....ffffff.....',
    '....tttttttt....',
    '...tttttttttt...',
    '...ftttTTttff...',
    '...ftttTTttff...',
    '....tttttttt....',
    '....pppppppp....',
    '....ppp..pp.....',
    '.....pp...pp....',
    '.....FF...FF....',
    '................',
  ]] };

  // ===== SKIN-STEALER: "superviviente" con costuras =====
  const palSkin = { f: '#d8c090', F: '#c0a878', x: '#8a4030', t: '#7a6a50', p: '#4e4438' };
  DEFS.skinstealer = { pal: palSkin, frames: [[
    '................',
    '.....ffffff.....',
    '....ffxfffff....',
    '....ffxfffff....',
    '....fffxxfff....',
    '.....ffffxf.....',
    '....tttttttt....',
    '...tttxttttat...'.replace('a', 't'),
    '...ftttttxtff...',
    '...fttttttttf...',
    '....ttxttttt....',
    '....pppppppp....',
    '....ppp..ppp....',
    '....pp....pp....',
    '....FF....FF....',
    '................',
  ], [
    '................',
    '.....ffffff.....',
    '....ffxfffff....',
    '....ffxfffff....',
    '....fffxxfff....',
    '.....ffffxf.....',
    '....tttttttt....',
    '...tttxtttttt...',
    '...ftttttxtff...',
    '...fttttttttf...',
    '....ttxttttt....',
    '....pppppppp....',
    '.....pp..ppp....',
    '....pp...pp.....',
    '....FF...FF.....',
    '................',
  ]] };

  // ===== HUNTER: cazador oscuro de ojos rojos =====
  const palHunter = { d: '#241214', D: '#180a0c', r: '#e03030', c: '#3a1c20' };
  DEFS.hunter = { pal: palHunter, frames: [[
    '................',
    '.....dddddd.....',
    '....dddddddd....',
    '....drddddrd....',
    '....dddddddd....',
    '.....dddddd.....',
    '....cccccccc....',
    '...dccccccccd...',
    '..ddccDDDDccdd..',
    '..d.ccDDDDcc.d..',
    '....cccccccc....',
    '....dddddddd....',
    '....ddd..ddd....',
    '....dd....dd....',
    '....DD....DD....',
    '................',
  ], [
    '................',
    '.....dddddd.....',
    '....dddddddd....',
    '....drddddrd....',
    '....dddddddd....',
    '.....dddddd.....',
    '....cccccccc....',
    '...dccccccccd...',
    '..ddccDDDDccdd..',
    '..d.ccDDDDcc.d..',
    '....cccccccc....',
    '....dddddddd....',
    '.....dd..ddd....',
    '....dd....dd....',
    '....DD...DD.....',
    '................',
  ]] };

  // ===== DULLER: silueta alargada de rostro fundido =====
  const palDuller = { d: '#4a4a58', D: '#3a3a46', m: '#2c2c36' };
  DEFS.duller = { pal: palDuller, frames: [[
    '......dddd......',
    '.....dddddd.....',
    '.....ddmmdd.....',
    '.....dmmmmd.....',
    '......dddd......',
    '......dDDd......',
    '......dDDd......',
    '.....ddDDdd.....',
    '.....d.DD.d.....',
    '.....d.DD.d.....',
    '.......DD.......',
    '.......DD.......',
    '......dDDd......',
    '......d..d......',
    '......d..d......',
    '......d..d......',
  ], [
    '......dddd......',
    '.....dddddd.....',
    '.....ddmmdd.....',
    '.....dmmmmd.....',
    '......dddd......',
    '......dDDd......',
    '......dDDd......',
    '.....ddDDdd.....',
    '.....d.DD.d.....',
    '.....d.DD.d.....',
    '.......DD.......',
    '.......DD.......',
    '......dDDd......',
    '......d.d.......',
    '.....d...d......',
    '.....d...d......',
  ]] };

  // ===== ANETHIKA: gigante encorvado de cuello torcido =====
  const palAne = { m: '#8f5fb0', M: '#734a91', d: '#5c3a75', e: '#e8e0f0' };
  DEFS.anethika = { pal: palAne, frames: [[
    '.........mmm....',
    '........memm....',
    '........mmmm....',
    '.......Mmm......',
    '......MMm.......',
    '.....MMMM.......',
    '....mMMMMm......',
    '....mMMMMm......',
    '...mmMMMMmm.....',
    '...m.MMMM.m.....',
    '...m.MMMM.m.....',
    '...d.dMMd.d.....',
    '.....dMMd.......',
    '.....d..d.......',
    '.....d..d.......',
    '.....dd.dd......',
  ], [
    '.........mmm....',
    '........memm....',
    '........mmmm....',
    '.......Mmm......',
    '......MMm.......',
    '.....MMMM.......',
    '....mMMMMm......',
    '....mMMMMm......',
    '...mmMMMMmm.....',
    '...m.MMMM.m.....',
    '...m.MMMM.m.....',
    '...d.dMMd.d.....',
    '.....dMMd.......',
    '.....d.d........',
    '....d...d.......',
    '....dd..dd......',
  ]] };

  // ===== HOUND: cuadrúpedo famélico =====
  const palHound = { h: '#9e7b6b', H: '#7e6154', e: '#f0e0d0', d: '#5e463c' };
  DEFS.hound = { pal: palHound, frames: [[
    '................',
    '................',
    '................',
    '............hh..',
    '...........hhhh.',
    '..hhhhhhhhhhhe..',
    '.hhHHHHHHHhhh...',
    '.hHHHHHHHHHh....',
    '.hhHHHHHHHhh....',
    '..hh.hh.hh.hh...',
    '..hh.hh.hh.hh...',
    '..dd.dd.dd.dd...',
    '................',
    '................',
    '................',
    '................',
  ], [
    '................',
    '................',
    '................',
    '............hh..',
    '...........hhhh.',
    '..hhhhhhhhhhhe..',
    '.hhHHHHHHHhhh...',
    '.hHHHHHHHHHh....',
    '.hhHHHHHHHhh....',
    '..hh..hh.hh.....',
    '.hh..hh...hh....',
    '.dd..dd...dd....',
    '................',
    '................',
    '................',
    '................',
  ]] };

  // ===== DEATHMOTH: polilla colosal =====
  const palMoth = { w: '#8f8fa8', W: '#6e6e86', b: '#3e3e50', e: '#d8a040' };
  DEFS.deathmoth = { pal: palMoth, frames: [[
    '................',
    '..ww........ww..',
    '.wwww......wwww.',
    '.wwWWw....wWWww.',
    '.wWWWWw..wWWWWw.',
    '..wWWWWwwWWWWw..',
    '...wWWbbbbWWw...',
    '....wbbebbbw....',
    '.....bbbbbb.....',
    '......bbbb......',
    '......bbbb......',
    '.......bb.......',
    '.......bb.......',
    '................',
    '................',
    '................',
  ], [
    '................',
    '................',
    '................',
    '..w..........w..',
    '.wwww......wwww.',
    '.wwWWwww.wwWWww.',
    '..wWWWbbbbWWWw..',
    '...wwbbebbbww...',
    '.....bbbbbb.....',
    '......bbbb......',
    '......bbbb......',
    '.......bb.......',
    '.......bb.......',
    '................',
    '................',
    '................',
  ]] };

  // ===== NEEDLELIMB: una pierna, un brazo, dedos-aguja =====
  const palNeedle = { d: '#3a3a45', D: '#2a2a33', n: '#585866' };
  DEFS.needlelimb = { pal: palNeedle, frames: [[
    '......ddd.......',
    '.....ddddd......',
    '.....ddDdd......',
    '......ddd.......',
    '......dDd.......',
    '......dDdn......',
    '......dDd.n.....',
    '......dDdnn.....',
    '......dDd.nn....',
    '......dDdn.n....',
    '.......Dd.......',
    '.......Dd.......',
    '.......Dd.......',
    '.......Dd.......',
    '......dDd.......',
    '................',
  ], [
    '......ddd.......',
    '.....ddddd......',
    '.....ddDdd......',
    '......ddd.......',
    '......dDd.......',
    '.....ndDd.......',
    '....n.dDd.......',
    '....nndDd.......',
    '...nn.dDd.......',
    '...n.ndDd.......',
    '.......Dd.......',
    '.......Dd.......',
    '.......Dd.......',
    '.......Dd.......',
    '.......dDd......',
    '................',
  ]] };

  const cache = {};      // id -> [canvas, canvas]
  const overrides = {};  // id -> [canvas...] desde PNG

  function build() {
    for (const [id, def] of Object.entries(DEFS))
      cache[id] = def.frames.map((rows) => rasterize(def.pal, rows));
  }

  function get(id, frame) {
    if (overrides[id]) return overrides[id][frame % overrides[id].length];
    const f = cache[id];
    return f ? f[frame % f.length] : null;
  }

  // intenta cargar PNGs externos (hoja horizontal de frames de 48×48)
  function tryOverrides(ids) {
    for (const id of ids) {
      if (overrides[id]) continue;
      const img = new Image();
      img.onload = () => {
        const n = Math.max(1, Math.floor(img.width / 48));
        const frames = [];
        for (let i = 0; i < n; i++) {
          const c = document.createElement('canvas');
          c.width = 48; c.height = 48;
          c.getContext('2d').drawImage(img, i * 48, 0, 48, 48, 0, 0, 48, 48);
          frames.push(c);
        }
        overrides[id] = frames;
      };
      img.src = 'assets/sprites/' + id + '.png';
    }
  }

  // ---------- props del entorno (vector con rejilla de píxel) ----------
  function drawProp(ctx, id, cx, cy, t, shade) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 12, 11, 4, 0, 0, 7); ctx.fill();
    switch (id) {
      case 'cono':
        ctx.fillStyle = '#d86830';
        ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 8, cy + 10); ctx.lineTo(cx - 8, cy + 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f0e8e0';
        ctx.fillRect(cx - 5, cy - 2, 10, 4);
        break;
      case 'bidon':
        ctx.fillStyle = '#4a6858';
        ctx.fillRect(cx - 7, cy - 10, 14, 22);
        ctx.fillStyle = '#3a5446';
        ctx.fillRect(cx - 7, cy - 4, 14, 3);
        ctx.fillRect(cx - 7, cy + 4, 14, 3);
        ctx.fillStyle = '#5e7c6c';
        ctx.beginPath(); ctx.ellipse(cx, cy - 10, 7, 2.5, 0, 0, 7); ctx.fill();
        break;
      case 'camilla':
        ctx.fillStyle = '#b8c4bc';
        ctx.fillRect(cx - 14, cy - 6, 28, 10);
        ctx.fillStyle = '#8a9890';
        ctx.fillRect(cx - 14, cy - 6, 28, 3);
        ctx.fillStyle = '#5a645e';
        ctx.fillRect(cx - 12, cy + 4, 3, 8); ctx.fillRect(cx + 9, cy + 4, 3, 8);
        break;
      case 'silla':
        ctx.fillStyle = '#6e5a44';
        ctx.fillRect(cx - 7, cy - 12, 3, 20);
        ctx.fillRect(cx - 7, cy - 2, 14, 4);
        ctx.fillRect(cx + 5, cy + 2, 3, 8); ctx.fillRect(cx - 7, cy + 2, 3, 8);
        break;
      case 'seta':
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(cx - 2, cy, 4, 9);
        ctx.fillStyle = '#b060c8';
        ctx.beginPath(); ctx.ellipse(cx, cy - 2, 9, 6, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#d8a0e8';
        ctx.fillRect(cx - 4, cy - 5, 3, 2); ctx.fillRect(cx + 2, cy - 4, 2, 2);
        break;
      case 'roca_p':
        ctx.fillStyle = shade ?? '#7a7a72';
        ctx.beginPath(); ctx.moveTo(cx - 9, cy + 8); ctx.lineTo(cx - 6, cy - 4); ctx.lineTo(cx + 3, cy - 7); ctx.lineTo(cx + 9, cy + 8); ctx.closePath(); ctx.fill();
        break;
      case 'farola': {
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(cx - 2, cy - 26, 4, 38);
        const glow = 0.75 + Math.sin(t / 300) * 0.15;
        ctx.shadowColor = '#ff9860'; ctx.shadowBlur = 14 * glow;
        ctx.fillStyle = '#ffb070';
        ctx.beginPath(); ctx.arc(cx, cy - 28, 5, 0, 7); ctx.fill();
        break;
      }
      case 'caja':
        ctx.fillStyle = '#8a6a42';
        ctx.fillRect(cx - 9, cy - 6, 18, 16);
        ctx.strokeStyle = '#6e5434';
        ctx.strokeRect(cx - 9.5, cy - 6.5, 19, 17);
        ctx.beginPath(); ctx.moveTo(cx - 9, cy - 6); ctx.lineTo(cx + 9, cy + 10); ctx.moveTo(cx + 9, cy - 6); ctx.lineTo(cx - 9, cy + 10); ctx.stroke();
        break;
      case 'reloj': {
        ctx.fillStyle = '#5e4a34';
        ctx.fillRect(cx - 6, cy - 18, 12, 30);
        ctx.fillStyle = '#e8d8b0';
        ctx.beginPath(); ctx.arc(cx, cy - 11, 4.5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#3a2e20';
        const a = t / 700;
        ctx.beginPath(); ctx.moveTo(cx, cy - 11); ctx.lineTo(cx + Math.cos(a) * 3.5, cy - 11 + Math.sin(a) * 3.5); ctx.stroke();
        break;
      }
      case 'cable':
        ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 12, cy + 8);
        ctx.quadraticCurveTo(cx - 2, cy - 4, cx + 4, cy + 6);
        ctx.quadraticCurveTo(cx + 10, cy + 12, cx + 14, cy + 4);
        ctx.stroke();
        break;
      // ----- contenedores registrables -----
      case 'taquilla':
        ctx.fillStyle = '#5a6a74';
        ctx.fillRect(cx - 8, cy - 18, 16, 30);
        ctx.strokeStyle = '#3e4a52';
        ctx.strokeRect(cx - 8.5, cy - 18.5, 17, 31);
        ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy + 12); ctx.stroke();
        ctx.fillStyle = '#3e4a52';
        ctx.fillRect(cx - 6, cy - 14, 4, 1.5); ctx.fillRect(cx + 2, cy - 14, 4, 1.5);
        break;
      case 'archivador':
        ctx.fillStyle = '#7a7264';
        ctx.fillRect(cx - 8, cy - 14, 16, 26);
        ctx.strokeStyle = '#5a5448';
        for (let i = 0; i < 3; i++) ctx.strokeRect(cx - 6.5, cy - 11.5 + i * 8, 13, 6);
        break;
      case 'nevera':
        ctx.fillStyle = '#c8d0cc';
        ctx.fillRect(cx - 8, cy - 16, 16, 28);
        ctx.strokeStyle = '#98a29c';
        ctx.strokeRect(cx - 8.5, cy - 16.5, 17, 29);
        ctx.beginPath(); ctx.moveTo(cx - 8, cy - 6); ctx.lineTo(cx + 8, cy - 6); ctx.stroke();
        ctx.fillRect(cx + 3, cy - 10, 2, 3);
        break;
      case 'cofre':
        ctx.fillStyle = '#8a6a42';
        ctx.fillRect(cx - 10, cy - 6, 20, 14);
        ctx.fillStyle = '#6e5434';
        ctx.fillRect(cx - 10, cy - 8, 20, 5);
        ctx.fillStyle = '#e0b040';
        ctx.fillRect(cx - 1.5, cy - 4, 3, 5);
        break;
    }
    ctx.restore();
  }

  build();
  window.Sprites = { get, tryOverrides, drawProp, list: () => Object.keys(DEFS) };
})();
