/** 気象庁 bosai API の共通処理。 */

export const JMA_ORIGIN = "https://www.jma.go.jp";
export const AREA_URL = `${JMA_ORIGIN}/bosai/common/const/area.json`;
export const WARNING_R8_URL = (office) => `${JMA_ORIGIN}/bosai/warning/data/r8/${office}.json`;
export const WARNING_URL = (office) => `${JMA_ORIGIN}/bosai/warning/data/warning/${office}.json`;
export const TYPHOON_LIST_URL = `${JMA_ORIGIN}/bosai/typhoon/data/targetTc.json`;
export const TYPHOON_SPEC_URL = (id) => `${JMA_ORIGIN}/bosai/typhoon/data/${id}/specifications.json`;
export const TYPHOON_FCST_URL = (id) => `${JMA_ORIGIN}/bosai/typhoon/data/${id}/forecast.json`;
export const NOWC_N3_URL = `${JMA_ORIGIN}/bosai/jmatile/data/nowc/targetTimes_N3.json`;
export const XML_REGULAR_FEED = "https://www.data.jma.go.jp/developer/xml/feed/regular.xml";

export function formatStamp(date) {
  if (!date || Number.isNaN(date.getTime())) return "—";
  const week = "日月火水木金土"[date.getDay()];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()}日(${week}) ${hh}:${mm}`;
}

export function formatClock(date) {
  if (!date || Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function parseJst(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function nowcToDate(stamp) {
  const s = String(stamp || "");
  if (s.length < 12) return null;
  const y = Number(s.slice(0, 4));
  const mo = Number(s.slice(4, 6)) - 1;
  const d = Number(s.slice(6, 8));
  const h = Number(s.slice(8, 10));
  const mi = Number(s.slice(10, 12));
  const se = Number(s.slice(12, 14) || "00");
  const utc = Date.UTC(y, mo, d, h, mi, se);
  return Number.isFinite(utc) ? new Date(utc) : null;
}

export function parseNowcMs(stamp) {
  const date = nowcToDate(stamp);
  return date ? date.getTime() : null;
}

const inflight = new Map();

export async function fetchText(url, timeoutMs = 12000) {
  const key = `text:${url}`;
  if (inflight.has(key)) return inflight.get(key);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const pending = (async () => {
    try {
      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  })().finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

export async function fetchJson(url, timeoutMs = 12000) {
  const remote = /^https?:\/\//i.test(url);
  const text = remote ? await fetchTextFlexible(url, timeoutMs) : await fetchText(url, timeoutMs);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON解析に失敗しました ${url}`);
  }
}

export async function fetchViaProxy(url, timeoutMs = 14000) {
  const proxied = `/api/jma-proxy?url=${encodeURIComponent(url)}`;
  return fetchText(proxied, timeoutMs);
}

function canUseLocalProxy() {
  return typeof location !== "undefined" && location.protocol === "http:" &&
    (location.hostname === "127.0.0.1" || location.hostname === "localhost");
}

export async function fetchTextFlexible(url, timeoutMs = 14000) {
  const preferProxy = canUseLocalProxy();
  const first = preferProxy ? () => fetchViaProxy(url, timeoutMs) : () => fetchText(url, timeoutMs);
  const second = preferProxy ? () => fetchText(url, timeoutMs) : () => fetchViaProxy(url, timeoutMs);
  try {
    return await first();
  } catch (firstError) {
    try {
      return await second();
    } catch {
      throw firstError;
    }
  }
}

export function nextForecastRefreshDelay() {
  const now = new Date();
  const slots = [5, 11, 17].map((hour) => {
    const d = new Date(now);
    d.setHours(hour, 5, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  });
  slots.sort((a, b) => a - b);
  return Math.max(60 * 1000, slots[0] - now);
}

export function nowcTileUrl(basetime, validtime, element) {
  return `${JMA_ORIGIN}/bosai/jmatile/data/nowc/${basetime}/none/${validtime}/surf/${element}/{z}/{x}/{y}.png`;
}
