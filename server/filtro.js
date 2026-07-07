// Filtro mínimo de nombres/chat: evita basura obvia sin intentar ser moderación perfecta.
'use strict';

const MALAS = [
  /\b(?:nazi|hitler|kkk)\b/ig,
  /https?:\/\/\S+/ig,
  /discord\.gg\/\S+/ig,
];

function recortaEspacios(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function nombreLimpio(s) {
  let t = recortaEspacios(s).slice(0, 24);
  t = t.replace(/[^\p{L}\p{N}_ .-]/gu, '');
  for (const r of MALAS) t = t.replace(r, '???');
  return t || 'Errante';
}

function chatLimpio(s) {
  let t = recortaEspacios(s).slice(0, 120);
  for (const r of MALAS) t = t.replace(r, '[censurado]');
  return t;
}

module.exports = { nombreLimpio, chatLimpio };
