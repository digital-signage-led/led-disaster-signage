import { CONTENTS } from "./data/contents.js";
import { PREFECTURES } from "./data/prefectures.js";
import { mountSignage } from "./signage-view.js";
import { applyDesignTokens } from "./viewport.js";
import {
  allCombos,
  comboStatus,
  loadDraft,
  persistPublishedFile,
  publishCombo,
  publishDraft,
  saveDraft,
  signageUrl
} from "./store.js";

const $ = (id) => document.getElementById(id);

const state = {
  store: loadDraft(),
  prefecture: "tokyo",
  content: "weather_warning",
  preview: null
};

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
  $("thunder-play").value = state.store.contents.lightning_nowcast.playMs;
  $("tornado-play").value = state.store.contents.tornado_nowcast.playMs;
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
  state.store.contents.lightning_nowcast.playMs = Number($("thunder-play").value);
  state.store.contents.tornado_nowcast.playMs = Number($("tornado-play").value);
}

function statusLabel() {
  const status = comboStatus(state.store, state.prefecture, state.content);
  $("combo-status").textContent = status === "published" ? "公開済み" : "下書き";
  $("combo-status").dataset.status = status;
}

async function renderPreview() {
  const host = $("preview-host");
  if (state.preview) {
    state.preview.destroy();
    if (state.preview.map) {
      try { state.preview.map.destroy(); } catch { /* ignore */ }
    }
  }
  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "preview-scale";
  host.appendChild(wrap);
  state.preview = await mountSignage(wrap, {
    prefecture: state.prefecture,
    content: state.content,
    settings: {
      common: state.store.common,
      content: state.store.contents[state.content],
      title: state.store.titles[state.content],
      enabled: state.store.enabled[state.content]
    },
    fit: true
  });
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
  $("url-count").textContent = `${rows.length} / 235`;
  $("url-table").innerHTML = rows.map((row) => {
    const url = publicHref(row.prefecture.slug, row.content.id);
    return `<tr>
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
  fillSelect($("pref-select"), PREFECTURES, (p) => p.slug, (p) => p.name, state.prefecture);
  fillSelect($("content-select"), CONTENTS, (c) => c.id, (c) => c.name, state.content);
  fillSelect($("url-content"), [{ id: "", name: "すべてのコンテンツ" }, ...CONTENTS], (c) => c.id, (c) => c.name, "");
  syncCommonInputs();
  syncContentInputs();
  statusLabel();

  $("pref-select").addEventListener("change", () => {
    state.prefecture = $("pref-select").value;
    statusLabel();
    renderPreview();
  });
  $("content-select").addEventListener("change", () => {
    state.content = $("content-select").value;
    syncContentInputs();
    statusLabel();
    renderPreview();
  });

  document.querySelectorAll("[data-live]").forEach((el) => {
    el.addEventListener("input", () => {
      readCommonInputs();
      readContentInputs();
      if (state.preview?.els?.screen) {
        applyDesignTokens(state.preview.els.screen, { common: state.store.common });
        const common = state.store.common;
        state.preview.els.stamp.hidden = common.showStamp === false;
        state.preview.els.point.hidden = common.showPoint === false;
        state.preview.els.panel.hidden = common.showPanel === false;
        state.preview.els.attr.hidden = common.showAttribution === false;
        state.preview.els.title.hidden = common.showTitle === false;
        state.preview.els.screen.classList.toggle("is-panel-off", common.showPanel === false);
        state.preview.els.screen.classList.toggle("is-legend-off", common.showLegend === false);
      }
    });
    if ((el.tagName === "INPUT" && (el.type === "number" || el.type === "text" || el.type === "checkbox"))) {
      el.addEventListener("change", () => {
        readCommonInputs();
        readContentInputs();
        renderPreview();
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
    toast("235件を公開設定に反映しました");
  });
  $("btn-open").addEventListener("click", () => {
    window.open(publicHref(state.prefecture, state.content), "_blank");
  });

  $("url-pref").addEventListener("input", renderUrls);
  $("url-content").addEventListener("change", renderUrls);
  $("url-status").addEventListener("change", renderUrls);
  $("url-table").addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-copy]");
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast("URLをコピーしました");
    } catch {
      toast("コピーできませんでした");
    }
  });
}

bind();
renderPreview();
renderUrls();
