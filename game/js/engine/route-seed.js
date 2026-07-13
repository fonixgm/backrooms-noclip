// Resuelve destinos variables sin consumir el RNG mutable de la partida.
(function (root) {
  'use strict';

  function hash(value) {
    const text = String(value);
    let result = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      result ^= text.charCodeAt(i);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function pick(seed, sourceId, route, candidates) {
    if (!Array.isArray(candidates) || !candidates.length) return null;
    const identity = route?.id || route?.texto || route?.text || route?.destino || 'ruta';
    return candidates[hash(`${seed}::${sourceId}::${identity}`) % candidates.length];
  }

  const api = { hash, pick };
  root.RouteSeed = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
