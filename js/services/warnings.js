import { classFromStatus, isActiveStatus, kindInfo } from "../data/warning-kinds.js";
import { cacheKey, loadLastGood, peekLastGood, saveLastGood } from "./cache.js";
import { areaName, loadArea } from "./area.js";
import { WARNING_R8_URL, WARNING_URL, fetchJson, parseJst } from "./jma-common.js";

const WEATHER_TYPES = new Set(["VPWW55", "VPWW61"]);

function mergeKinds(docs) {
  const map = new Map();
  for (const doc of docs) {
    const reportAt = parseJst(doc.reportDatetime);
    const groups = [
      doc.warning?.class10Items || [],
      doc.warning?.class20Items || []
    ];
    groups.forEach((items, index) => {
      for (const item of items) {
        for (const kind of item.kinds || []) {
          const key = `${item.areaCode}:${kind.code || kind.status}`;
          const prev = map.get(key);
          if (prev && prev.reportAt && reportAt && prev.reportAt > reportAt) continue;
          map.set(key, {
            areaCode: item.areaCode,
            level: index === 0 ? "class10" : "class20",
            code: kind.code || "",
            status: kind.status || "",
            additions: Array.isArray(kind.additions) ? kind.additions : [],
            reportAt,
            headlineText: doc.headlineText || "",
            publishingOffice: doc.publishingOffice || ""
          });
        }
      }
    });
  }
  return [...map.values()];
}

function parseLegacy(doc) {
  const items = [];
  const reportAt = parseJst(doc.reportDatetime);
  for (const areaType of doc.areaTypes || []) {
    for (const area of areaType.areas || []) {
      for (const warning of area.warnings || []) {
        items.push({
          areaCode: area.code,
          level: String(area.code || "").length <= 6 ? "class10" : "class20",
          code: warning.code || "",
          status: warning.status || "",
          additions: [],
          reportAt,
          headlineText: doc.headlineText || "",
          publishingOffice: doc.publishingOffice || ""
        });
      }
    }
  }
  return items;
}

function normalizeItems(rawItems, area) {
  return rawItems
    .filter((item) => isActiveStatus(item.status) && item.code)
    .map((item) => {
      const info = kindInfo(item.code);
      const className = classFromStatus(item.status, info.className);
      return {
        areaCode: item.areaCode,
        areaName: areaName(area, item.areaCode),
        code: info.code,
        name: info.name,
        className,
        classLabel: className === "special" ? "特別警報" : className === "warning" ? "警報" : "注意報",
        status: item.status,
        additions: item.additions,
        reportAt: item.reportAt
      };
    })
    .sort((a, b) => {
      const rank = { special: 0, warning: 1, advisory: 2 };
      return (rank[a.className] - rank[b.className]) || a.areaName.localeCompare(b.areaName, "ja");
    });
}

export async function loadWarnings(prefecture, hooks = {}) {
  const key = cacheKey(prefecture.slug, "weather_warning");
  const office = prefecture.dataId;
  peekLastGood(key, hooks.onCached);
  try {
    const [area, r8] = await Promise.all([
      loadArea().catch(() => null),
      fetchJson(WARNING_R8_URL(office))
    ]);
    const docs = (Array.isArray(r8) ? r8 : [r8]).filter((doc) => {
      if (!doc) return false;
      if (!doc.dataTypeCode) return true;
      return WEATHER_TYPES.has(doc.dataTypeCode);
    });
    let raw = mergeKinds(docs);
    if (!raw.length) {
      const legacy = await fetchJson(WARNING_URL(office)).catch(() => null);
      if (legacy) raw = parseLegacy(legacy);
    }
    const latestDoc = docs.slice().sort((a, b) => String(b.reportDatetime).localeCompare(String(a.reportDatetime)))[0] || {};
    const class10 = raw.filter((item) => item.level === "class10");
    const items = normalizeItems(class10.length ? class10 : raw, area);
    const payload = {
      ok: true,
      fromCache: false,
      items,
      empty: items.length === 0,
      headlineText: latestDoc.headlineText || "",
      publishingOffice: latestDoc.publishingOffice || "",
      reportAt: parseJst(latestDoc.reportDatetime),
      fetchedAt: new Date(),
      office
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
      items: [],
      empty: true,
      error: String(error.message || error),
      message: "気象警報・注意報を取得できませんでした",
      fetchedAt: new Date()
    };
  }
}
