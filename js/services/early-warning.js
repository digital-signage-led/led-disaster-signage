import { cacheKey, loadLastGood, saveLastGood } from "./cache.js";
import { loadArea } from "./area.js";
import { XML_REGULAR_FEED, fetchJson, fetchTextFlexible, parseJst } from "./jma-common.js";

const PHENOMENA = [
  { key: "rain", names: ["雨", "大雨"], label: "大雨" },
  { key: "landslide", names: ["土砂", "土砂災害"], label: "土砂災害" },
  { key: "snow", names: ["雪", "大雪"], label: "大雪" },
  { key: "wind", names: ["風", "暴風", "風雪", "暴風雪"], label: "風（風雪）" },
  { key: "wave", names: ["波", "波浪"], label: "波" },
  { key: "surge", names: ["潮位", "高潮"], label: "高潮" }
];

function rankOf(value) {
  const text = String(value || "").trim();
  if (text === "高") return "high";
  if (text === "中") return "mid";
  return "";
}

function matchPhenomenon(type) {
  const raw = String(type || "");
  return PHENOMENA.find((item) => item.names.some((name) => raw.includes(name))) || null;
}

function parseFeed(xml) {
  const entries = [];
  for (const block of xml.split("<entry>").slice(1)) {
    const title = block.match(/<title>([^<]+)<\/title>/)?.[1] || "";
    const link = block.match(/href="([^"]+\.xml)"/)?.[1] || "";
    const updated = block.match(/<updated>([^<]+)<\/updated>/)?.[1] || "";
    const author = block.match(/<name>([^<]+)<\/name>/)?.[1] || "";
    if (!link) continue;
    if (title.includes("警報級") || title.includes("早期注意情報")) {
      entries.push({ title, link, updated, author });
    }
  }
  return entries;
}

function tagText(xml, tag) {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1] || "";
}

function periodLabelFromDefine(body, fallbackId) {
  const named = body.match(/<Name>([^<]+)<\/Name>/)?.[1];
  if (named) return named;
  const dt = parseJst(body.match(/<DateTime>([^<]+)<\/DateTime>/)?.[1]);
  if (dt) {
    const day = dt.getDate();
    const hh = String(dt.getHours()).padStart(2, "0");
    return `${day}日${hh}時から`;
  }
  return `期間${fallbackId}`;
}

function parseTimeDefines(xml) {
  return [...xml.matchAll(/<TimeDefine([^>]*)>([\s\S]*?)<\/TimeDefine>/g)].map((match, index) => {
    const id = match[1].match(/timeId="([^"]+)"/)?.[1] || String(index + 1);
    return { id, name: periodLabelFromDefine(match[2], id) };
  });
}

function parseRanks(kindXml) {
  return [...kindXml.matchAll(/<(?:jmx_eb:)?PossibilityRankOfWarning\b([^>]*)>([^<]*)<\/(?:jmx_eb:)?PossibilityRankOfWarning>/g)]
    .concat([...kindXml.matchAll(/<(?:jmx_eb:)?PossibilityRankOfWarning\b([^>]*)\/>/g)])
    .map((match) => {
      const attrs = match[1] || "";
      const ref = attrs.match(/refID="([^"]+)"/)?.[1] || "";
      const value = String(match[2] || "").trim();
      return { ref, rank: rankOf(value) };
    });
}

function parseBulletin(xml) {
  const reportAt = parseJst(tagText(xml, "ReportDateTime") || tagText(xml, "DateTime"));
  const office = tagText(xml, "Office");
  const title = tagText(xml, "Title");
  const periods = parseTimeDefines(xml);
  const periodById = Object.fromEntries(periods.map((item) => [item.id, item.name]));
  const items = [];
  for (const chunk of xml.split(/<Item>/).slice(1)) {
    const areaName = chunk.match(/<Area[\s\S]*?<Name>([^<]+)<\/Name>/)?.[1] || "";
    const areaCode = chunk.match(/<Area[\s\S]*?<Code>([^<]+)<\/Code>/)?.[1] || "";
    for (const kind of chunk.matchAll(/<Kind>([\s\S]*?)<\/Kind>/g)) {
      const body = kind[1];
      const type = body.match(/<Type>([^<]+)<\/Type>/)?.[1] || "";
      const phenomenon = matchPhenomenon(type);
      if (!phenomenon) continue;
      for (const entry of parseRanks(body)) {
        if (!entry.rank) continue;
        items.push({
          areaName,
          areaCode,
          periodLabel: periodById[entry.ref] || periods[0]?.name || "対象期間",
          phenomenon: phenomenon.label,
          phenomenonKey: phenomenon.key,
          rank: entry.rank,
          rankLabel: entry.rank === "high" ? "高" : "中"
        });
      }
    }
  }
  return { reportAt, office, title, items, periods: periods.map((item) => item.name) };
}

function belongsToPrefecture(entry, bulletin, prefecture) {
  const prefId = prefecture.id;
  const office = prefecture.dataId;
  if (bulletin.items.some((item) => String(item.areaCode).startsWith(prefId) || item.areaCode === office)) {
    return true;
  }
  const hay = `${entry.author} ${bulletin.office} ${bulletin.items.map((i) => i.areaName).join(" ")}`;
  return hay.includes(prefecture.name.replace(/[都道府県]$/, "")) || hay.includes(prefecture.name);
}

function uniquePeriods(rows) {
  const seen = [];
  for (const row of rows) {
    if (row.periodLabel && !seen.includes(row.periodLabel)) seen.push(row.periodLabel);
  }
  return seen;
}

export async function loadEarlyWarning(prefecture) {
  const key = cacheKey(prefecture.slug, "early_warning");
  try {
    const [feedXml, area] = await Promise.all([
      fetchTextFlexible(XML_REGULAR_FEED),
      loadArea().catch(() => null)
    ]);
    const officeName = area?.offices?.[prefecture.dataId]?.officeName || "";
    const entries = parseFeed(feedXml).filter((entry) => {
      const hay = `${entry.author} ${entry.title}`;
      const shortName = prefecture.name.replace(/[都道府県]$/, "");
      return hay.includes(shortName)
        || (officeName && hay.includes(officeName.replace(/管区|地方|気象台/g, "")))
        || hay.includes("気象庁");
    }).slice(0, 10);
    const picked = [];
    for (const entry of entries) {
      try {
        const xml = await fetchTextFlexible(entry.link);
        const bulletin = parseBulletin(xml);
        if (belongsToPrefecture(entry, bulletin, prefecture)) {
          picked.push({ entry, bulletin });
        }
      } catch {
        /* 1件失敗しても他を続ける */
      }
    }
    const rows = picked.flatMap((item) => item.bulletin.items.map((row) => ({
      ...row,
      sourceTitle: item.entry.title,
      reportAt: item.bulletin.reportAt
    })));
    const reportAt = picked
      .map((item) => item.bulletin.reportAt)
      .filter(Boolean)
      .sort((a, b) => b - a)[0] || null;
    const payload = {
      ok: true,
      fromCache: false,
      rows,
      periods: uniquePeriods(rows),
      phenomena: PHENOMENA.map((item) => item.label),
      empty: rows.length === 0,
      reportAt,
      fetchedAt: new Date()
    };
    saveLastGood(key, payload);
    return payload;
  } catch (error) {
    try {
      const snapshot = await fetchJson("./data/early-warning-snapshot.json", 8000);
      const rows = (snapshot.rows || []).filter((row) => row.prefecture === prefecture.slug);
      if (snapshot && (rows.length || snapshot.updatedAt)) {
        return {
          ok: true,
          fromCache: true,
          rows,
          periods: uniquePeriods(rows),
          phenomena: PHENOMENA.map((item) => item.label),
          empty: rows.length === 0,
          reportAt: parseJst(snapshot.updatedAt),
          fetchedAt: new Date(),
          cacheError: String(error.message || error)
        };
      }
    } catch {
      /* スナップショットなし */
    }
    const cached = loadLastGood(key);
    if (cached) {
      return { ...cached, ok: true, fromCache: true, cacheError: String(error.message || error), fetchedAt: new Date() };
    }
    return {
      ok: false,
      fromCache: false,
      rows: [],
      periods: [],
      empty: true,
      error: String(error.message || error),
      message: "早期注意情報を取得できませんでした",
      fetchedAt: new Date()
    };
  }
}
