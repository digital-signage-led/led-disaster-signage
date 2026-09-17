import { CONTENTS, getContent } from "./data/contents.js";
import { NATIONAL, getPrefecture } from "./data/prefectures.js";
import {
  allCombos,
  comboStatus,
  locationsForContent,
  loadDraft,
  persistPublishedFile,
  PREVIEW_SETTINGS_KEY,
  publicComboCount,
  publishCombo,
  publishDraft,
  saveDraft,
  signageUrl
} from "./store.js";

const $ = (id) => document.getElementById(id);

const query = new URLSearchParams(location.search);
const initialContent = getContent(query.get("content") || "weather_warning");
const state = {
  store: loadDraft(),
  prefecture: initialContent.locationScope === "national"
    ? NATIONAL.slug
    : getPrefecture(query.get("prefecture") || "toyama").slug,
  content: initialContent.id,
  previewFrame: null
};

function locationChoices(contentId) {
  return locationsForContent(getContent(contentId));
}

function syncLocationSelect() {
  const places = locationChoices(state.content);
  if (getContent(state.content).locationScope === "national") state.prefecture = NATIONAL.slug;
  if (!places.some((item) => item.slug === state.prefecture)) state.prefecture = places[0].slug;
  fillSelect($("pref-select"), places, (p) => p.slug, (p) => p.name, state.prefecture);
  $("pref-select").disabled = places.length === 1;
}

function clampPlayMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 2000;
  return Math.min(4000, Math.max(1200, n));
}

function fillSelect(el, items, getValue, getLabel, selected) {
  el.innerHTML = items.map((item) => {
    const value = getValue(item);
    return `<option value="${value}" ${value === selected ? "selected" : ""}>${getLabel(item)}</option>`;
  }).join("");
}

function syncCommonInputs() {
  const c = state.store.common;
  $("title-size").value = c.titleSize;
  $("title-x").value = c.titleX;
  $("title-y").value = c.titleY;
  $("map-scale").value = c.mapScale;
  $("map-x").value = c.mapX;
  $("map-y").value = c.mapY;
  $("font-size").value = c.fontSize;
  $("panel-x").value = c.panelX;
  $("panel-y").value = c.panelY;
  $("padding").value = c.padding;
  $("show-title").checked = c.showTitle !== false;
  $("show-stamp").checked = c.showStamp !== false;
  $("show-point").checked = c.showPoint !== false;
  $("show-legend").checked = c.showLegend !== false;
  $("show-panel").checked = c.showPanel !== false;
  $("show-attr").checked = c.showAttribution !== false;
}

function readCommonInputs() {
  const c = state.store.common;
  c.titleSize = Number($("title-size").value);
  c.titleX = Number($("title-x").value);
  c.titleY = Number($("title-y").value);
  c.mapScale = Number($("map-scale").value);
  c.mapX = Number($("map-x").value);
  c.mapY = Number($("map-y").value);
  c.fontSize = Number($("font-size").value);
  c.panelX = Number($("panel-x").value);
  c.panelY = Number($("panel-y").value);
  c.padding = Number($("padding").value);
  c.showTitle = $("show-title").checked;
  c.showStamp = $("show-stamp").checked;
  c.showPoint = $("show-point").checked;
  c.showLegend = $("show-legend").checked;
  c.showPanel = $("show-panel").checked;
  c.showAttribution = $("show-attr").checked;
}

function syncContentInputs() {
  $("custom-title").value = state.store.titles[state.content] || "";
  $("content-enabled").checked = state.store.enabled[state.content] !== false;
  $("content-order").value = state.store.order.indexOf(state.content) + 1;
  $("thunder-play").value = clampPlayMs(state.store.contents.lightning_nowcast.playMs);
  $("tornado-play").value = clampPlayMs(state.store.contents.tornado_nowcast.playMs);
  document.querySelectorAll("[data-for-content]").forEach((el) => {
    el.hidden = el.dataset.forContent !== state.content;
  });
}

function readContentInputs() {
  state.store.titles[state.content] = $("custom-title").value.trim();
  state.store.enabled[state.content] = $("content-enabled").checked;
  const nextIndex = Math.max(1, Math.min(CONTENTS.length, Number($("content-order").value) || 1)) - 1;
  const order = state.store.order.filter((id) => id !== state.content);
  order.splice(nextIndex, 0, state.content);
  state.store.order = order;
  if (state.content === "lightning_nowcast") {
    state.store.contents.lightning_nowcast.playMs = clampPlayMs($("thunder-play").value);
  }
  if (state.content === "tornado_nowcast") {
    state.store.contents.tornado_nowcast.playMs = clampPlayMs($("tornado-play").value);
  }
}

function statusLabel() {
  const status = comboStatus(state.store, state.prefecture, state.content);
  $("combo-status").textContent = status === "published" ? "公開済み" : "下書き";
  $("combo-status").dataset.status = status;
}

function previewSettings() {
  return {
    common: state.store.common,
    content: state.store.contents[state.content],
    title: state.store.titles[state.content],
    enabled: state.store.enabled[state.content]
  };
}

function writePreviewSettings() {
  sessionStorage.setItem(PREVIEW_SETTINGS_KEY, JSON.stringify(previewSettings()));
}

function previewSrc() {
  const url = new URL("index.html", location.href);
  url.searchParams.set("prefecture", state.prefecture);
  url.searchParams.set("content", state.content);
  url.searchParams.set("preview", "1");
  url.searchParams.set("v", String(Date.now()));
  return `${url.pathname}${url.search}`;
}

function previewFrame() {
  const host = $("preview-host");
  let iframe = host.querySelector("iframe.admin-preview-frame");
  if (!iframe) {
    host.innerHTML = "";
    iframe = document.createElement("iframe");
    iframe.className = "admin-preview-frame";
    iframe.title = "本番プレビュー";
    iframe.addEventListener("load", pushPreviewTokens);
    host.appendChild(iframe);
    state.previewFrame = iframe;
  }
  return iframe;
}

function pushPreviewTokens() {
  const iframe = state.previewFrame || $("preview-host")?.querySelector("iframe.admin-preview-frame");
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage({
    type: "disaster-preview-tokens",
    common: state.store.common
  }, location.origin);
}

function renderPreview() {
  writePreviewSettings();
  previewFrame().src = previewSrc();
  syncCurrentUrl();
}

function syncCurrentUrl() {
  const url = publicHref(state.prefecture, state.content);
  const el = $("current-url");
  if (el) el.textContent = url;
  const next = new URL(location.href);
  next.searchParams.set("prefecture", state.prefecture);
  next.searchParams.set("content", state.content);
  history.replaceState(null, "", `${next.pathname}${next.search}`);
}

function publicHref(pref, content) {
  return signageUrl(pref, content, `${location.origin}${location.pathname.replace(/admin\.html.*$/, "index.html")}`);
}

function renderUrls() {
  const qPref = $("url-pref").value.trim();
  const qContent = $("url-content").value;
  const qStatus = $("url-status").value;
  const rows = allCombos().filter((row) => {
    if (qPref && !(`${row.prefecture.name}${row.prefecture.slug}`.includes(qPref))) return false;
    if (qContent && row.content.id !== qContent) return false;
    if (qStatus && row.status !== qStatus) return false;
    return true;
  });
  $("url-count").textContent = `${rows.length} / ${publicComboCount()}`;
  $("url-table").innerHTML = rows.map((row) => {
    const url = publicHref(row.prefecture.slug, row.content.id);
    const current = row.prefecture.slug === state.prefecture && row.content.id === state.content ? " is-current" : "";
    return `<tr class="${current}" data-open-pref="${row.prefecture.slug}" data-open-content="${row.content.id}">
      <td>${row.prefecture.name}</td>
      <td>${row.content.name}</td>
      <td><span class="pill" data-status="${row.status}">${row.status === "published" ? "公開済み" : "下書き"}</span></td>
      <td class="url-cell"><code>${url}</code></td>
      <td><button type="button" data-copy="${url}">URLをコピー</button></td>
    </tr>`;
  }).join("");
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => { el.hidden = true; }, 2400);
}

function bind() {
  fillSelect($("content-select"), CONTENTS, (c) => c.id, (c) => c.name, state.content);
  syncLocationSelect();
  fillSelect($("url-content"), [{ id: "", name: "すべてのコンテンツ" }, ...CONTENTS], (c) => c.id, (c) => c.name, "");
  syncCommonInputs();
  syncContentInputs();
  statusLabel();

  $("pref-select").addEventListener("change", () => {
    state.prefecture = $("pref-select").value;
    statusLabel();
    renderUrls();
    renderPreview();
  });
  $("content-select").addEventListener("change", () => {
    state.content = $("content-select").value;
    syncLocationSelect();
    syncContentInputs();
    statusLabel();
    renderUrls();
    renderPreview();
  });

  document.querySelectorAll("[data-live]").forEach((el) => {
    el.addEventListener("input", () => {
      readCommonInputs();
      readContentInputs();
      writePreviewSettings();
      pushPreviewTokens();
    });
    if (el.tagName === "INPUT" && (el.type === "number" || el.type === "checkbox")) {
      el.addEventListener("change", () => {
        readCommonInputs();
        readContentInputs();
        if (el.id === "content-enabled" || el.id === "thunder-play" || el.id === "tornado-play") {
          renderPreview();
        }
      });
    }
  });

  $("btn-save").addEventListener("click", () => {
    readCommonInputs();
    readContentInputs();
    state.store = saveDraft(state.store);
    statusLabel();
    toast("下書きを保存しました");
  });
  $("btn-publish").addEventListener("click", async () => {
    readCommonInputs();
    readContentInputs();
    const result = publishCombo(state.store, state.prefecture, state.content);
    state.store = result.draft;
    statusLabel();
    renderUrls();
    const persist = await persistPublishedFile(result.published);
    toast(persist.mode === "server" ? "この組み合わせを公開しました" : "公開しました（設定ファイルを保存してください）");
  });
  $("btn-publish-all").addEventListener("click", async () => {
    readCommonInputs();
    readContentInputs();
    state.store = publishDraft(state.store);
    statusLabel();
    renderUrls();
    await persistPublishedFile(state.store);
    toast(`${publicComboCount()}件を公開設定に反映しました`);
  });
  $("btn-open").addEventListener("click", () => {
    window.open(publicHref(state.prefecture, state.content), "_blank");
  });

  $("url-pref").addEventListener("input", renderUrls);
  $("url-content").addEventListener("change", renderUrls);
  $("url-status").addEventListener("change", renderUrls);
  $("btn-copy-all-urls").addEventListener("click", async () => {
    const qPref = $("url-pref").value.trim();
    const qContent = $("url-content").value;
    const qStatus = $("url-status").value;
    const lines = ["地域\tコンテンツ\t公開URL"];
    for (const row of allCombos()) {
      if (qPref && !(`${row.prefecture.name}${row.prefecture.slug}`.includes(qPref))) continue;
      if (qContent && row.content.id !== qContent) continue;
      if (qStatus && row.status !== qStatus) continue;
      lines.push(`${row.prefecture.name}\t${row.content.name}\t${publicHref(row.prefecture.slug, row.content.id)}`);
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast(`${lines.length - 1}件をコピーしました`);
    } catch {
      const box = document.createElement("textarea");
      box.value = text;
      document.body.appendChild(box);
      box.select();
      document.execCommand("copy");
      box.remove();
      toast(`${lines.length - 1}件をコピーしました`);
    }
  });
  $("btn-copy-current").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(publicHref(state.prefecture, state.content));
      toast("URLをコピーしました");
    } catch {
      toast("コピーできませんでした");
    }
  });
  $("url-table").addEventListener("click", async (event) => {
    const copyBtn = event.target.closest("[data-copy]");
    if (copyBtn) {
      event.preventDefault();
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.copy);
        toast("URLをコピーしました");
      } catch {
        toast("コピーできませんでした");
      }
      return;
    }
    const row = event.target.closest("[data-open-pref]");
    if (!row) return;
    $("content-select").value = row.dataset.openContent;
    state.content = row.dataset.openContent;
    state.prefecture = row.dataset.openPref;
    syncLocationSelect();
    $("pref-select").value = state.prefecture;
    syncContentInputs();
    statusLabel();
    renderUrls();
    renderPreview();
  });
}

bind();
syncCurrentUrl();
renderUrls();
renderPreview();
