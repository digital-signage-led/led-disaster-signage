import { cacheKey, loadLastGood, saveLastGood } from "./cache.js";
import { NOWC_N3_URL, fetchJson, nowcTileUrl, nowcToDate } from "./jma-common.js";

function hasElement(entry, name) {
  const elems = entry?.elements || [];
  return Array.isArray(elems) && elems.includes(name);
}

export const THUNDER_LEGEND = [
  { color: "#f6ee54", label: "活動度1", meaning: "雷雲が発達する可能性" },
  { color: "#f5c842", label: "活動度2", meaning: "雷雲" },
  { color: "#f08a1a", label: "活動度3", meaning: "発達した雷雲" },
  { color: "#d61f1f", label: "活動度4", meaning: "非常に発達した雷雲" }
];

export async function loadThunderNowcast(prefecture) {
  const key = cacheKey(prefecture.slug, "lightning_nowcast");
  try {
    const times = await fetchJson(`${NOWC_N3_URL}?_=${Date.now()}`);
    const frames = (Array.isArray(times) ? times : [])
      .filter((item) => hasElement(item, "thns"))
      .map((item) => ({
        basetime: item.basetime,
        validtime: item.validtime,
        element: "thns",
        date: nowcToDate(item.validtime),
        tileUrl: nowcTileUrl(item.basetime, item.validtime, "thns")
      }))
      .sort((a, b) => String(a.validtime).localeCompare(String(b.validtime)));
    if (!frames.length) throw new Error("雷ナウキャストの時刻情報が空です");
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
      message: "雷ナウキャストを取得できませんでした",
      fetchedAt: new Date()
    };
  }
}
