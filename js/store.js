/**
 * 下書きと公開の分離。
 * サイネージ本番は公開設定のみ読む。同じ公開URLのまま設定を更新する。
 */
import { CONTENTS } from "./data/contents.js";
import { PREFECTURES } from "./data/prefectures.js";

export const DRAFT_KEY = "disaster-draft-v1";
export const PUBLISHED_KEY = "disaster-published-v1";

export function comboKey(prefecture, content) {
  return `${prefecture}:${content}`;
}

export function defaultCommon() {
  return {
    titleSize: 1,
    titleX: 0,
    titleY: 0,
    mapScale: 1,
    mapX: 0,
    mapY: 0,
    fontSize: 1,
    panelX: 0,
    panelY: 0,
    padding: 1,
    showStamp: true,
    showPoint: true,
    showLegend: true,
    showPanel: true,
    showAttribution: true,
    showTitle: true
  };
}

export function defaultContentSettings() {
  return {
    weather_warning: { showHeadline: true, showMunicipality: false },
    early_warning: { compact: false },
    typhoon: { rotateMs: 12000 },
    lightning_nowcast: { playMs: 2000 },
    tornado_nowcast: { playMs: 2000 }
  };
}

export function emptyStore() {
  const status = {};
  const enabled = {};
  const titles = {};
  const order = CONTENTS.map((content) => content.id);
  for (const content of CONTENTS) {
    enabled[content.id] = true;
    titles[content.id] = "";
    for (const pref of PREFECTURES) {
      status[comboKey(pref.slug, content.id)] = "published";
    }
  }
  return {
    version: 1,
    updatedAt: null,
    publishedAt: null,
    common: defaultCommon(),
    contents: defaultContentSettings(),
    order,
    enabled,
    titles,
    status
  };
}

function mergeStore(base, patch) {
  const out = emptyStore();
  if (!patch || typeof patch !== "object") return out;
  out.updatedAt = patch.updatedAt || base.updatedAt || null;
  out.publishedAt = patch.publishedAt || base.publishedAt || null;
  out.common = { ...out.common, ...(patch.common || {}) };
  out.contents = {
    weather_warning: { ...out.contents.weather_warning, ...(patch.contents?.weather_warning || {}) },
    early_warning: { ...out.contents.early_warning, ...(patch.contents?.early_warning || {}) },
    typhoon: { ...out.contents.typhoon, ...(patch.contents?.typhoon || {}) },
    lightning_nowcast: { ...out.contents.lightning_nowcast, ...(patch.contents?.lightning_nowcast || {}) },
    tornado_nowcast: { ...out.contents.tornado_nowcast, ...(patch.contents?.tornado_nowcast || {}) }
  };
  out.order = Array.isArray(patch.order) ? patch.order.filter((id) => CONTENTS.some((c) => c.id === id)) : out.order;
  for (const content of CONTENTS) {
    if (!out.order.includes(content.id)) out.order.push(content.id);
  }
  out.enabled = { ...out.enabled, ...(patch.enabled || {}) };
  out.titles = { ...out.titles, ...(patch.titles || {}) };
  out.status = { ...out.status, ...(patch.status || {}) };
  return out;
}

function readKey(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeKey(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadDraft() {
  return mergeStore(emptyStore(), readKey(DRAFT_KEY));
}

export function loadPublished() {
  return mergeStore(emptyStore(), readKey(PUBLISHED_KEY));
}

export function saveDraft(store) {
  const next = mergeStore(emptyStore(), store);
  next.updatedAt = new Date().toISOString();
  writeKey(DRAFT_KEY, next);
  return next;
}

export function publishDraft(store) {
  const next = mergeStore(emptyStore(), store);
  const now = new Date().toISOString();
  next.updatedAt = now;
  next.publishedAt = now;
  for (const key of Object.keys(next.status)) next.status[key] = "published";
  writeKey(DRAFT_KEY, next);
  writeKey(PUBLISHED_KEY, next);
  return next;
}

export function publishCombo(store, prefecture, content) {
  const draft = mergeStore(emptyStore(), store);
  const published = loadPublished();
  const key = comboKey(prefecture, content);
  draft.status[key] = "published";
  published.common = { ...draft.common };
  published.contents = JSON.parse(JSON.stringify(draft.contents));
  published.order = [...draft.order];
  published.enabled = { ...draft.enabled };
  published.titles = { ...draft.titles };
  published.status[key] = "published";
  published.publishedAt = new Date().toISOString();
  draft.updatedAt = published.publishedAt;
  writeKey(DRAFT_KEY, draft);
  writeKey(PUBLISHED_KEY, published);
  return { draft, published };
}

export function comboStatus(store, prefecture, content) {
  return store.status[comboKey(prefecture, content)] || "draft";
}

export function settingsForSignage(prefecture, content) {
  const published = loadPublished();
  return {
    common: published.common,
    content: published.contents[content] || {},
    title: published.titles[content] || "",
    enabled: published.enabled[content] !== false,
    status: published.status[comboKey(prefecture, content)] || "published",
    publishedAt: published.publishedAt
  };
}

export function allCombos() {
  const published = loadPublished();
  const draft = loadDraft();
  const rows = [];
  const contents = CONTENTS.slice().sort((a, b) => draft.order.indexOf(a.id) - draft.order.indexOf(b.id));
  for (const content of contents) {
    for (const pref of PREFECTURES) {
      const key = comboKey(pref.slug, content.id);
      rows.push({
        key,
        prefecture: pref,
        content,
        status: published.status[key] === "published" ? "published" : (draft.status[key] || "draft"),
        enabled: draft.enabled[content.id] !== false
      });
    }
  }
  return rows;
}

export function signageSearch(prefecture, content) {
  return `?prefecture=${encodeURIComponent(prefecture)}&content=${encodeURIComponent(content)}`;
}

export function signageUrl(prefecture, content, baseHref = location.href) {
  const url = new URL("index.html", baseHref);
  url.search = "";
  url.hash = "";
  return `${url.href}${signageSearch(prefecture, content)}`;
}

export async function persistPublishedFile(store) {
  try {
    const res = await fetch("/api/published-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(store)
    });
    if (res.ok) return { ok: true, mode: "server" };
  } catch {
    /* ローカルサーバ未起動時はダウンロード */
  }
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "published-settings.json";
  a.click();
  URL.revokeObjectURL(a.href);
  return { ok: true, mode: "download" };
}
