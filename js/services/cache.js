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

function reviveValue(value) {
  if (Array.isArray(value)) return value.map(reviveValue);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && /^\d{4}-\d{2}-\d{2}T/.test(item)) {
      const date = new Date(item);
      out[key] = Number.isNaN(date.getTime()) ? item : date;
    } else {
      out[key] = reviveValue(item);
    }
  }
  return out;
}

function prune(all, keepKey) {
  const keys = Object.keys(all).filter((key) => key !== "latest");
  if (keys.length <= 20) return all;
  keys
    .map((key) => ({ key, at: Date.parse(all[key]?.savedAt || 0) || 0 }))
    .sort((a, b) => a.at - b.at)
    .slice(0, keys.length - 20)
    .forEach((item) => {
      if (item.key !== keepKey) delete all[item.key];
    });
  return all;
}

export function saveLastGood(key, payload) {
  const all = prune(readAll(), key);
  all[key] = {
    savedAt: new Date().toISOString(),
    payload
  };
  all.latest = { key, savedAt: all[key].savedAt };
  writeAll(all);
}

export function loadLastGood(key) {
  const all = readAll();
  const payload = all[key]?.payload;
  return payload ? reviveValue(payload) : null;
}

export function peekLastGood(key, onCached) {
  const cached = loadLastGood(key);
  if (cached) onCached?.({ ...cached, ok: true, fromCache: true });
  return cached;
}
