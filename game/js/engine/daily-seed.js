// Semilla global diaria. El huso es explícito para que navegador, servidor y
// despliegues UTC cambien de ciclo a la misma medianoche de Madrid.
(function (root) {
  'use strict';

  const TIME_ZONE = 'Europe/Madrid';

  function dayKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const get = (type) => parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  function seed(now = new Date()) {
    return `backrooms-diaria::${dayKey(now)}`;
  }

  const api = { TIME_ZONE, dayKey, seed };
  root.DailySeed = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
