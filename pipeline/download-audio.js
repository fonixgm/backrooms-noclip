// v4 — Descarga los audios ambientales adjuntos a las páginas de la wiki de los
// niveles catalogados y genera el manifiesto que el juego usa para reproducirlos.
//   game/assets/sounds/niveles/<level-id>.<ext>  +  game/js/audio-manifest.js
// Uso: node pipeline/download-audio.js   (re-ejecutable; se salta lo descargado)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const API = 'https://backrooms.fandom.com/api.php';
const UA = 'BackroomsRoguelikeDataPipeline/1.0 (proyecto personal)';
const RAW = path.join(__dirname, '..', 'data', 'raw');
const OUT = path.join(__dirname, '..', 'game', 'assets', 'sounds', 'niveles');
const MANIFEST_JS = path.join(__dirname, '..', 'game', 'js', 'audio-manifest.js');

const levels = require(path.join(__dirname, '..', 'data', 'game', 'levels.es.json'));
const index = require(path.join(RAW, '_index.json'));

async function api(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', ...params });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  return res.json();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {};
  const byTitle = {};
  for (const [id, meta] of Object.entries(index)) byTitle[meta.title] = id;

  for (const [levelId, def] of Object.entries(levels)) {
    const rawId = byTitle[def.wikiTitle];
    if (!rawId) continue;
    const wikitext = JSON.parse(fs.readFileSync(path.join(RAW, rawId + '.json'), 'utf8')).wikitext;
    const m = /\[\[File:([^\]|]+\.(mp3|ogg|wav|m4a))/i.exec(wikitext);
    if (!m) continue;
    const fileTitle = m[1].trim();
    const ext = m[2].toLowerCase();
    const dest = path.join(OUT, `${levelId}.${ext}`);

    if (!fs.existsSync(dest)) {
      process.stdout.write(`${def.wikiTitle}: ${fileTitle} … `);
      const info = await api({
        action: 'query',
        titles: 'File:' + fileTitle,
        prop: 'imageinfo',
        iiprop: 'url',
      });
      const pages = Object.values(info.query?.pages ?? {});
      const url = pages[0]?.imageinfo?.[0]?.url;
      if (!url) { console.log('sin URL, se omite'); continue; }
      try {
        execFileSync('curl', ['-sL', '-A', 'Mozilla/5.0', '-o', dest, url], { timeout: 120000 });
        console.log(`${(fs.statSync(dest).size / 1024).toFixed(0)} KB ✓`);
      } catch (e) {
        console.log('fallo de descarga:', e.message);
        continue;
      }
    }
    manifest[levelId] = `assets/sounds/niveles/${levelId}.${ext}`;
  }

  fs.writeFileSync(
    MANIFEST_JS,
    '// GENERADO por pipeline/download-audio.js — audios ambientales de la wiki\n' +
    'window.AUDIO_MANIFEST = ' + JSON.stringify(manifest, null, 1) + ';\n'
  );
  console.log(`Manifiesto: ${Object.keys(manifest).length} niveles con audio de la wiki.`);
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
