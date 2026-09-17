import { renderEarlyWarning } from "./contents/early-warning.js";
import { renderThunderNowcast } from "./contents/thunder-nowcast.js";
import { renderTornadoNowcast } from "./contents/tornado-nowcast.js";
import { renderTyphoon } from "./contents/typhoon.js";
import { renderWarnings } from "./contents/warnings.js";
import { staticPanel, legendHtml } from "./contents/shared-ui.js";
import { getContent } from "./data/contents.js";
import { getPrefecture, regionOf } from "./data/prefectures.js";
import { createMap, MAP_ATTRIBUTION } from "./map/map-engine.js";
import { formatStamp, nextForecastRefreshDelay } from "./services/jma-common.js";
import { settingsForSignage } from "./store.js";
import { applyDesignTokens, fitFixedScreen, measureVisibleBox, FIXED_DESIGN } from "./viewport.js";
import { THUNDER_LEGEND } from "./services/thunder-nowcast.js";
import { TORNADO_LEGEND } from "./services/tornado-nowcast.js";

const RENDERERS = {
  weather_warning: renderWarnings,
  early_warning: renderEarlyWarning,
  typhoon: renderTyphoon,
  lightning_nowcast: renderThunderNowcast,
  tornado_nowcast: renderTornadoNowcast
};

function screenHtml() {
  return `
    <article class="led-screen" data-ready="0">
      <header class="led-header">
        <div class="led-title-bar">
          <h1 class="led-title"></h1>
        </div>
        <div class="led-sub-bar">
          <div class="led-stamp"></div>
          <div class="led-point"></div>
        </div>
      </header>
      <div class="led-body">
        <div class="map-stage">
          <div class="map-canvas"></div>
          <div class="content-stage"></div>
        </div>
        <aside class="info-panel"></aside>
      </div>
      <div class="map-attribution"></div>
    </article>
  `;
}

export function buildScreen(root) {
  if (!root.querySelector(".led-screen")) root.innerHTML = screenHtml();
  const screen = root.querySelector(".led-screen");
  return {
    root,
    screen,
    title: screen.querySelector(".led-title"),
    stamp: screen.querySelector(".led-stamp"),
    point: screen.querySelector(".led-point"),
    panel: screen.querySelector(".info-panel"),
    mapCanvas: screen.querySelector(".map-canvas"),
    stage: screen.querySelector(".content-stage"),
    attr: screen.querySelector(".map-attribution")
  };
}

function panelHint(content) {
  if (content.id === "weather_warning") return content.description;
  if (content.id === "early_warning") return "気象庁が［高］［中］で示す、警報級の現象となる可能性です。独自の危険度判定はしていません。";
  if (content.id === "lightning_nowcast") return "気象庁の雷ナウキャストです。色は公式の活動度です。この地域に雷がなければ地図は無色のままです。";
  if (content.id === "tornado_nowcast") return "気象庁の竜巻発生確度ナウキャストです。この地域に該当がなければ地図は無色のままです。";
  return "";
}

function panelLegend(content) {
  if (content.id === "early_warning") {
    return `<div class="legend"><span class="legend-step"><i style="background:#c62828"></i>高</span><span class="legend-step"><i style="background:#f9a825"></i>中</span></div>`;
  }
  if (content.id === "lightning_nowcast") return `<div class="legend">${legendHtml(THUNDER_LEGEND)}</div>`;
  if (content.id === "tornado_nowcast") return `<div class="legend">${legendHtml(TORNADO_LEGEND)}</div>`;
  return "";
}

export function paintKnownUi(els, prefecture, content, published = {}) {
  const common = published.common || {};
  const customTitle = published.title || "";
  els.screen.dataset.prefecture = prefecture.slug;
  els.screen.dataset.content = content.id;
  els.screen.classList.add("is-map");
  if (content.id === "typhoon") els.screen.classList.add("is-typhoon-map");
  els.title.textContent = customTitle || `${prefecture.name}｜${content.name}`;
  if (!els.stamp.textContent || els.stamp.textContent === "データ取得中") els.stamp.textContent = "—";
  els.point.textContent = content.id === "typhoon" ? "全国" : regionOf(prefecture.slug).name;
  els.attr.textContent = content.id === "typhoon" ? "出典：気象庁" : MAP_ATTRIBUTION;
  if (els.stage) {
    els.stage.hidden = true;
    els.stage.innerHTML = "";
  }
  if (!els.panel.dataset.ready) {
    els.panel.innerHTML = staticPanel({
      kicker: content.shortName === "早期注意" ? "早期注意情報" : content.name.replace("（警報級の可能性）", "").replace("発生確度ナウキャスト", "発生確度"),
      area: prefecture.name,
      hint: panelHint(content),
      legend: panelLegend(content)
    });
    els.panel.dataset.ready = "1";
  }
  applyDesignTokens(els.screen, { common });
  applyVisibility(els, common);
}

function applyVisibility(els, common) {
  els.stamp.hidden = common.showStamp === false;
  els.point.hidden = common.showPoint === false;
  els.panel.hidden = common.showPanel === false;
  els.attr.hidden = common.showAttribution === false;
  els.title.hidden = common.showTitle === false;
  els.screen.classList.toggle("is-panel-off", common.showPanel === false);
  els.screen.classList.toggle("is-legend-off", common.showLegend === false);
}

function bindFit(els, options, cleanups) {
  const fitTo = () => {
    if (options.fit === false) return;
    const host = options.fitHost || els.root;
    const bounds = host && host !== document.body ? measureVisibleBox(host) : null;
    fitFixedScreen(els.screen, FIXED_DESIGN.width, FIXED_DESIGN.height, bounds);
    els.screen.style.maxWidth = "none";
  };
  fitTo();
  if (options.fitHost) {
    const ro = new ResizeObserver(fitTo);
    ro.observe(options.fitHost);
    cleanups.push(() => ro.disconnect());
  }
  return fitTo;
}

export async function mountSignage(root, options = {}) {
  const content = getContent(options.content);
  const prefecture = content.locationScope === "national"
    ? getPrefecture("national")
    : getPrefecture(options.prefecture);
  const published = options.settings || settingsForSignage(prefecture.slug, content.id);
  const common = published.common || {};
  const contentSettings = published.content || published.contents?.[content.id] || {};
  const shellCleanups = [];
  const dataCleanups = [];
  const els = buildScreen(root);
  paintKnownUi(els, prefecture, content, published);
  const fitTo = bindFit(els, options, shellCleanups);

  const runDataCleanups = () => {
    dataCleanups.splice(0).forEach((fn) => {
      try { fn(); } catch { /* ignore */ }
    });
  };

  if (published.enabled === false) {
    els.panel.innerHTML = `<div class="data-empty">このコンテンツは管理画面で非表示に設定されています</div>`;
    els.stamp.textContent = "非表示";
    return {
      prefecture, content, map: null, els, data: { ok: true, hidden: true },
      async refresh() { return { ok: true, hidden: true }; },
      destroy() {
        runDataCleanups();
        shellCleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      }
    };
  }

  let map = options.map || els.mapCanvas._mapApi || null;
  try {
    if (!map) {
      map = await createMap(els.mapCanvas, {
        prefecture,
        interactive: !!options.interactive,
        mode: content.id === "typhoon" ? "national" : "prefecture",
        zoom: content.id === "typhoon" ? 5 : undefined,
        center: content.id === "typhoon" ? [36.5, 136.2] : null,
        maxFitZoom: undefined
      });
      els.mapCanvas._mapApi = map;
    } else if (content.id === "typhoon") {
      map.setView([36.5, 136.2], 5);
    } else {
      map.setView(prefecture);
    }
    fitTo();
    map.invalidate();
  } catch (error) {
    els.panel.innerHTML = `<div class="data-error">地図を初期化できませんでした</div>`;
    els.stamp.textContent = "地図初期化失敗";
    return {
      prefecture, content, map: null, els, data: { ok: false, error: String(error.message || error) },
      async refresh() { return { ok: false }; },
      destroy() {
        runDataCleanups();
        shellCleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      }
    };
  }

  const ctx = {
    prefecture,
    content,
    common,
    contentSettings,
    map,
    els,
    addCleanup(fn) { dataCleanups.push(fn); }
  };

  const applyData = async () => {
    const render = RENDERERS[content.id] || renderWarnings;
    const data = await render(ctx);
    const dataAt = data?.reportAt || data?.dataUpdatedAt || null;
    if (data?.ok) {
      els.stamp.textContent = dataAt
        ? `${formatStamp(dataAt)}${data.fromCache ? "（前回データ）" : ""}`
        : els.stamp.textContent || "—";
    } else if (!els.screen.dataset.ready) {
      els.stamp.textContent = "気象データを取得できませんでした";
    }
    els.screen.dataset.ready = "1";
    fitTo();
    map.invalidate();
    return data;
  };

  try {
    const data = await applyData();
    if (content.id === "typhoon") {
      window.requestAnimationFrame(() => map.invalidate());
    }
    return {
      prefecture,
      content,
      map,
      els,
      data,
      async refresh() {
        try {
          const next = await applyData();
          this.data = next;
          return next;
        } catch (error) {
          console.error(error);
          return this.data;
        }
      },
      destroy() {
        runDataCleanups();
        shellCleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      }
    };
  } catch (error) {
    if (!els.panel.textContent) {
      els.panel.innerHTML = `<div class="data-error">表示処理でエラーが発生しました</div>`;
    }
    return {
      prefecture, content, map, els, data: { ok: false, error: String(error.message || error) },
      async refresh() { return this.data; },
      destroy() {
        runDataCleanups();
        shellCleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      }
    };
  }
}

export function bindAutoFit(screen) {
  const onResize = () => fitFixedScreen(screen, FIXED_DESIGN.width, FIXED_DESIGN.height);
  window.addEventListener("resize", onResize);
  onResize();
  return () => window.removeEventListener("resize", onResize);
}

export function refreshDelayFor(contentId) {
  if (contentId === "early_warning") return nextForecastRefreshDelay();
  if (contentId === "weather_warning") return 3 * 60 * 1000;
  return 5 * 60 * 1000;
}
