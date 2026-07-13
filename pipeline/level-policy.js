'use strict';

function isJokeLevel(title, level) {
  if (/\(Joke\)/i.test(title)) return true;
  const categories = [...(level.apiCategories || []), ...(level.wikiCategories || [])];
  return categories.some((category) => /^Joke(?:[ _]Levels?)?$/i.test(String(category).trim()));
}

function playableLevels(levels) {
  return Object.fromEntries(Object.entries(levels).filter(([title, level]) => !isJokeLevel(title, level)));
}

module.exports = { isJokeLevel, playableLevels };
