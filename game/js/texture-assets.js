// Registro genérico de texturas opcionales por nivel. Convención de nombres en
// game/assets/textures/:
//
//   <slot>-<levelId>.png   textura ESPECÍFICA de un nivel   (p.ej. pared-level-0.png)
//   <slot>.png             textura GENÉRICA para cualquier nivel (p.ej. agua.png)
//
// Slots que consume el motor (ver tiles.js): pared, suelo, techo, agua. Añadir
// uno nuevo es solo llamar a TextureAssets.get('<slot>', id) desde tiles.js y
// cablear su fallback procedural.
//
// Resolución de un slot: primero la específica del nivel, si no existe la
// genérica, y si tampoco → null (el motor usa su tile procedural de siempre).
// La carga es PEREZOSA (solo se piden los archivos del nivel en el que entras)
// y ASÍNCRONA: mientras llega la imagen se ve el procedural, y al cargar se
// emite `textureassetload` para que main.js reconstruya los tiles con el bitmap.
(function () {
  const BASE = 'assets/textures/';
  const recs = new Map(); // fichero -> { img, estado: 'load' | 'ok' | 'fail' }

  function pedir(file) {
    let r = recs.get(file);
    if (r) return r;
    r = { img: new Image(), estado: 'load' };
    recs.set(file, r);
    r.img.onload = () => {
      r.estado = 'ok';
      window.dispatchEvent(new CustomEvent('textureassetload', { detail: file }));
    };
    // Un 404 es NORMAL en este sistema (el nivel no tiene ese slot) → sin ruido
    // en consola; simplemente se marca como ausente y se cae al procedural.
    r.img.onerror = () => { r.estado = 'fail'; };
    r.img.src = BASE + file;
    return r;
  }

  window.TextureAssets = {
    // Devuelve la Image lista para un slot/nivel, o null si hay que usar el
    // procedural. Arranca la carga de los candidatos la primera vez.
    get(slot, levelId) {
      const cands = [];
      if (levelId) cands.push(`${slot}-${levelId}.png`);
      cands.push(`${slot}.png`);
      const rs = cands.map(pedir); // arranca todas las cargas a la vez
      for (const r of rs) {
        if (r.estado === 'ok' && r.img.naturalWidth) return r.img; // gana la más específica cargada
        if (r.estado === 'load') return null;   // aún cargando: espera su evento (no uses una genérica peor)
        // 'fail': prueba el siguiente candidato
      }
      return null;
    },
    // Variantes por casilla de un slot: <slot>-<id>-1.png, -2.png, ... (secuencia
    // contigua desde 1). Devuelve el array de imágenes cargadas, o cae a la
    // textura simple (get) si no hay numeradas, o null si tampoco. El motor
    // reparte las variantes por casilla con un hash de posición, así que "según
    // el mapa" cada casilla muestra una u otra.
    getVariants(slot, levelId, max = 6) {
      const num = [];
      if (levelId) {
        for (let i = 1; i <= max; i++) {
          const r = pedir(`${slot}-${levelId}-${i}.png`);
          if (r.estado === 'ok' && r.img.naturalWidth) { num.push(r.img); continue; }
          break; // 'load' (aún no se sabe) o 'fail' (fin de la secuencia): paramos
        }
      }
      if (num.length) return num;
      const uno = this.get(slot, levelId);
      return uno ? [uno] : null;
    },
    // ¿El fichero que acaba de cargar afecta a este nivel? (main.js filtra los
    // eventos para no reconstruir por texturas de otros niveles.) Los slots no
    // llevan guion, así que un fichero SIN guion es genérico (afecta a todos) y
    // uno con guion es específico de <levelId>.
    afecta(file, levelId) {
      if (!file.includes('-')) return true;      // genérica <slot>.png
      if (!levelId) return false;
      // específica <slot>-<id>.png o variante <slot>-<id>-N.png
      return file.endsWith(`-${levelId}.png`) ||
        new RegExp(`-${levelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+\\.png$`).test(file);
    },
  };
})();
