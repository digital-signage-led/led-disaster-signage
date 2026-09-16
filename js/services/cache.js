const LASTGOOD_KEY = "disaster-lastgood-v1";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(LASTGOOD_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeAll(value) {
  try {
    localStorage.setItem(LASTGOOD_KEY, JSON.stringify(value));
  } catch {
    try {
      localStorage.setItem(LASTGOOD_KEY, JSON.stringify({ latest: value.latest || null }));
    } catch {
      /* ignore */
    }
  }
}

export function cacheKey(prefecture, content) {
  return `${prefecture || "national"}:${content}`;
}

export function saveLastGood(key, payload) {
  const all = readAll();
  all[key] = {
    savedAt: new Date().toISOString(),
    payload
  };
  all.latest = { key, savedAt: all[key].savedAt };
  writeAll(all);
}

export function loadLastGood(key) {
  const all = readAll();
  return all[key]?.payload || null;
}
