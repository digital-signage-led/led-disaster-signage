import { cacheKey, loadLastGood, saveLastGood } from "./cache.js";
import { NOWC_N3_URL, fetchJson, nowcTileUrl, nowcToDate } from "./jma-common.js";

function hasElement(entry, name) {
  const elems = entry?.elements || [];
  return Array.isArray(elems) && elems.includes(name);
}

export const TORNADO_LEGEND = [
  { color: "#f2e700", label: "発生確度1", meaning: "竜巻などの激しい突風が発生する可能性がある" },
  { color: "#fa2900", label: "発生確度2", meaning: "竜巻などの激しい突風が発生する可能性が高い" }
];

export async function loadTornadoNowcast(prefecture) {
  const key = cacheKey(prefecture.slug, "tornado_nowcast");
  try {
    const times = await fetchJson(`${NOWC_N3_URL}?_=${Date.now()}`);
    const frames = (Array.isArray(times) ? times : [])
      .filter((item) => hasElement(item, "trns"))
      .map((item) => ({
        basetime: item.basetime,
        validtime: item.validtime,
        element: "trns",
        date: nowcToDate(item.validtime),
        tileUrl: nowcTileUrl(item.basetime, item.validtime, "trns")
      }))
      .sort((a, b) => String(a.validtime).localeCompare(String(b.validtime)));
    if (!frames.length) throw new Error("竜巻発生確度ナウキャストの時刻情報が空です");
    const payload = {
      ok: true,
      fromCache: false,
      frames,
      dataUpdatedAt: frames.find((item) => item.validtime === item.basetime)?.date || frames[0].date,
      fetchedAt: new Date()
    };
    saveLastGood(key, payload);
    return payload;
  } catch (error) {
    const cached = loadLastGood(key);
    if (cached?.frames?.length) {
      return { ...cached, ok: true, fromCache: true, cacheError: String(error.message || error), fetchedAt: new Date() };
    }
    return {
      ok: false,
      fromCache: false,
      frames: [],
      error: String(error.message || error),
      message: "竜巻発生確度ナウキャストを取得できませんでした",
      fetchedAt: new Date()
    };
  }
}
