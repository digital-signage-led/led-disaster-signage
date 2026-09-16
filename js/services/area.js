import { AREA_URL, fetchJson } from "./jma-common.js";

let areaCache = null;
let areaAt = 0;

export async function loadArea() {
  const now = Date.now();
  if (areaCache && now - areaAt < 24 * 60 * 60 * 1000) return areaCache;
  areaCache = await fetchJson(AREA_URL, 15000);
  areaAt = now;
  return areaCache;
}

export function areaName(area, code) {
  const key = String(code || "");
  return area?.class20s?.[key]?.name
    || area?.class15s?.[key]?.name
    || area?.class10s?.[key]?.name
    || area?.offices?.[key]?.name
    || key;
}

export function class10CodesForOffice(area, office) {
  const children = area?.offices?.[office]?.children;
  if (Array.isArray(children) && children.length) return children;
  return Object.entries(area?.class10s || {})
    .filter(([, item]) => item.parent === office)
    .map(([code]) => code);
}
