'use strict';

const fs = require('fs');
const path = require('path');
const levels = require('../data/game/levels.es.json');

const topologyCount = {};
const biomeCount = {};
const pending = [];
for (const level of Object.values(levels)) {
  const map = level.mapa || {};
  const topology = map.topologia || '(sin contrato)';
  topologyCount[topology] = (topologyCount[topology] || 0) + 1;
  biomeCount[level.bioma] = (biomeCount[level.bioma] || 0) + 1;
  if (!map.soportada || map.fuente === 'bioma_inferido') {
    pending.push({
      id: level.id, wikiTitle: level.wikiTitle, bioma: level.bioma,
      topologia: topology, fuente: map.fuente || 'ausente',
      soportada: !!map.soportada, rasgos: map.rasgos || [], url: level.url,
    });
  }
}

pending.sort((a, b) => Number(a.soportada) - Number(b.soportada) ||
  a.topologia.localeCompare(b.topologia) || a.wikiTitle.localeCompare(b.wikiTitle));
const report = {
  total: Object.keys(levels).length,
  reviewedFromWiki: Object.values(levels).filter((x) => x.mapa?.fuente === 'wiki_prioritaria').length,
  unsupported: pending.filter((x) => !x.soportada).length,
  inferredOnly: pending.filter((x) => x.fuente === 'bioma_inferido').length,
  topologyCount, biomeCount, pending,
};

const outJson = path.join(__dirname, '..', 'data', 'parsed', 'map-fidelity-report.json');
const outTxt = path.join(__dirname, '..', 'data', 'parsed', 'map-fidelity-report.txt');
fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n');
const lines = [
  `AUDITORÍA DE FIDELIDAD DE MAPAS`,
  `Niveles: ${report.total}`,
  `Contratos wiki prioritarios: ${report.reviewedFromWiki}`,
  `Topologías detectadas sin generador propio: ${report.unsupported}`,
  `Fichas que aún dependen solo del bioma: ${report.inferredOnly}`,
  '', 'TOPOLOGÍAS',
  ...Object.entries(topologyCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${String(v).padStart(4)}  ${k}`),
  '', 'PENDIENTES SIN GENERADOR PROPIO',
  ...pending.filter((x) => !x.soportada).map((x) => `${x.wikiTitle} | ${x.topologia} | ${x.url}`),
];
fs.writeFileSync(outTxt, lines.join('\n') + '\n');
console.log(`Auditoría: ${report.total} niveles; ${report.unsupported} topologías sin soporte; ${report.inferredOnly} por revisar.`);
