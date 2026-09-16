import { cacheKey, loadLastGood, saveLastGood } from "./cache.js";
import { TYPHOON_FCST_URL, TYPHOON_LIST_URL, TYPHOON_SPEC_URL, fetchJson, parseJst } from "./jma-common.js";

function partName(part) {
  if (!part) return "";
  if (typeof part === "string") return part;
  return part.jp || part.en || "";
}

function pickAnalysis(spec) {
  return (spec || []).find((item) => partName(item.part).includes("実況") || item.part?.en === "Analysis") || null;
}

function pickForecasts(spec) {
  return (spec || []).filter((item) => {
    const name = partName(item.part);
    return name.includes("予報") || String(item.part?.en || "").startsWith("Forecast");
  });
}

function numberOrNull(value) {
  if (value == null || value === "" || value === "-") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeStorm(meta, spec, forecast) {
  const title = (spec || []).find((item) => item.part === "title") || {};
  const analysis = pickAnalysis(spec);
  const forecasts = pickForecasts(spec);
  const trackPart = (forecast || []).find((item) => item.track) || null;
  const center = analysis?.position?.deg || trackPart?.center || null;
  return {
    tcId: meta.tropicalCyclone || "",
    typhoonNumber: title.typhoonNumber || meta.typhoonNumber || "",
    category: title.category?.jp || analysis?.category?.jp || meta.category || "",
    nameJp: title.name?.jp || "",
    nameEn: title.name?.en || "",
    issueAt: parseJst(title.issue?.JST || meta.issue),
    analysisAt: parseJst(analysis?.validtime?.JST),
    location: analysis?.location || "",
    course: analysis?.course || "",
    speedKmh: numberOrNull(analysis?.speed?.["km/h"]),
    pressure: numberOrNull(analysis?.pressure),
    maxWindMs: numberOrNull(analysis?.maximumWind?.sustained?.["m/s"]),
    gustMs: numberOrNull(analysis?.maximumWind?.gust?.["m/s"]),
    intensity: analysis?.intensity && analysis.intensity !== "-" ? analysis.intensity : "",
    center: Array.isArray(center) && center.length >= 2 ? { lat: Number(center[0]), lon: Number(center[1]) } : null,
    track: trackPart?.track || { preTyphoon: [], typhoon: [] },
    forecasts: forecasts.map((item) => ({
      label: partName(item.part),
      hours: item.advancedHours,
      validAt: parseJst(item.validtime?.JST),
      location: item.location || "",
      course: item.course || "",
      speedKmh: numberOrNull(item.speed?.["km/h"]),
      pressure: numberOrNull(item.pressure),
      maxWindMs: numberOrNull(item.maximumWind?.sustained?.["m/s"]),
      gustMs: numberOrNull(item.maximumWind?.gust?.["m/s"]),
      category: item.category?.jp || "",
      center: Array.isArray(item.position?.deg) ? { lat: Number(item.position.deg[0]), lon: Number(item.position.deg[1]) } : null,
      radiusKm: numberOrNull(item.probabilityCircleRadius?.km)
    })).filter((item) => item.center)
  };
}

export function displayName(storm) {
  if (storm.nameJp) return storm.nameJp;
  const num = String(storm.typhoonNumber || "");
  if (num && /^\d+$/.test(num)) return `台風第${Number(num)}号`;
  return storm.category || "熱帯低気圧";
}

export async function loadTyphoons() {
  const key = cacheKey("national", "typhoon");
  try {
    const list = await fetchJson(TYPHOON_LIST_URL);
    const targets = Array.isArray(list) ? list : (list?.tropicalCyclone ? [list] : []);
    const storms = [];
    for (const meta of targets) {
      const id = meta.tropicalCyclone;
      if (!id) continue;
      const [spec, forecast] = await Promise.all([
        fetchJson(TYPHOON_SPEC_URL(id)),
        fetchJson(TYPHOON_FCST_URL(id)).catch(() => [])
      ]);
      storms.push(normalizeStorm(meta, spec, forecast));
    }
    const payload = {
      ok: true,
      fromCache: false,
      storms,
      empty: storms.length === 0,
      reportAt: storms[0]?.issueAt || null,
      fetchedAt: new Date()
    };
    saveLastGood(key, payload);
    return payload;
  } catch (error) {
    const cached = loadLastGood(key);
    if (cached) {
      return { ...cached, ok: true, fromCache: true, cacheError: String(error.message || error), fetchedAt: new Date() };
    }
    return {
      ok: false,
      fromCache: false,
      storms: [],
      empty: true,
      error: String(error.message || error),
      message: "台風情報を取得できませんでした",
      fetchedAt: new Date()
    };
  }
}
