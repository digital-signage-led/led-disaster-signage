import { renderEarlyWarning } from "./contents/early-warning.js";
import { renderThunderNowcast } from "./contents/thunder-nowcast.js";
import { renderTornadoNowcast } from "./contents/tornado-nowcast.js";
import { renderTyphoon } from "./contents/typhoon.js";
import { renderWarnings } from "./contents/warnings.js";
import { getContent } from "./data/contents.js";
import { getPrefecture, regionOf } from "./data/prefectures.js";
import { createMap, MAP_ATTRIBUTION } from "./map/map-engine.js";
import { formatStamp, nextForecastRefreshDelay } from "./services/jma-common.js";
import { settingsForSignage } from "./store.js";
import { applyDesignTokens, fitFixedScreen, FIXED_DESIGN } from "./viewport.js";

const RENDERERS = {
  weather_warning: renderWarnings,
  early_warning: renderEarlyWarning,
  typhoon: renderTyphoon,
  lightning_nowcast: renderThunderNowcast,
  tornado_nowcast: renderTornadoNowcast
};

const MAP_CONTENTS = new Set(["typhoon", "lightning_nowcast", "tornado_nowcast"]);

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
  root.innerHTML = screenHtml();
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

function applyVisibility(els, common) {
  els.stamp.hidden = common.showStamp === false;
  els.point.hidden = common.showPoint === false;
  els.panel.hidden = common.showPanel === false;
  els.attr.hidden = common.showAttribution === false;
  els.title.hidden = common.showTitle === false;
  els.screen.classList.toggle("is-panel-off", common.showPanel === false);
  els.screen.classList.toggle("is-legend-off", common.showLegend === false);
}

export async function mountSignage(root, options = {}) {
  const prefecture = getPrefecture(options.prefecture);
  const content = getContent(options.content);
  const published = options.settings || settingsForSignage(prefecture.slug, content.id);
  const common = published.common || {};
  const contentSettings = published.content || published.contents?.[content.id] || {};
  const cleanups = [];
  const els = root.querySelector(".led-screen") ? {
    root,
    screen: root.querySelector(".led-screen"),
    title: root.querySelector(".led-title"),
    stamp: root.querySelector(".led-stamp"),
    point: root.querySelector(".led-point"),
    panel: root.querySelector(".info-panel"),
    mapCanvas: root.querySelector(".map-canvas"),
    stage: root.querySelector(".content-stage"),
    attr: root.querySelector(".map-attribution")
  } : buildScreen(root);

  els.screen.dataset.prefecture = prefecture.slug;
  els.screen.dataset.content = content.id;
  els.screen.classList.toggle("is-map", MAP_CONTENTS.has(content.id));
  const customTitle = published.title || "";
  els.title.textContent = customTitle || `${prefecture.name}｜${content.name}`;
  els.stamp.textContent = "データ取得中";
  els.point.textContent = regionOf(prefecture.slug).name;
  els.attr.textContent = MAP_ATTRIBUTION;
  els.stage.hidden = false;
  els.stage.innerHTML = "";
  applyDesignTokens(els.screen, { common });
  applyVisibility(els, common);
  if (options.fit !== false) fitFixedScreen(els.screen, FIXED_DESIGN.width, FIXED_DESIGN.height);

  if (published.enabled === false) {
    els.stage.innerHTML = `<div class="data-empty">このコンテンツは管理画面で非表示に設定されています</div>`;
    els.stamp.textContent = "非表示";
    return {
      prefecture, content, map: null, els, data: { ok: true, hidden: true },
      destroy() { cleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } }); }
    };
  }

  let map = options.map || null;
  if (MAP_CONTENTS.has(content.id)) {
    try {
      if (!map) {
        map = await createMap(els.mapCanvas, {
          prefecture,
          interactive: !!options.interactive,
          zoom: content.id === "typhoon" ? 4.4 : prefecture.defaultZoom,
          center: content.id === "typhoon" ? [30, 137] : null
        });
      } else if (content.id !== "typhoon") {
        map.setView([prefecture.centerLatitude, prefecture.centerLongitude], prefecture.defaultZoom);
      }
    } catch (error) {
      els.stage.hidden = false;
      els.stage.innerHTML = `<div class="data-error">地図を初期化できませんでした</div>`;
      els.stamp.textContent = "地図初期化失敗";
      return {
        prefecture, content, map: null, els, data: { ok: false, error: String(error.message || error) },
        destroy() { cleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } }); }
      };
    }
  } else if (els.mapCanvas) {
    els.mapCanvas.innerHTML = "";
  }

  const ctx = {
    prefecture,
    content,
    common,
    contentSettings,
    map,
    els,
    addCleanup(fn) { cleanups.push(fn); }
  };

  try {
    const render = RENDERERS[content.id] || renderWarnings;
    const data = await render(ctx);
    const dataAt = data?.reportAt || data?.dataUpdatedAt || null;
    if (data?.ok) {
      els.stamp.textContent = dataAt
        ? `${formatStamp(dataAt)}${data.fromCache ? "（前回データ）" : ""}`
        : "更新時刻を確認中";
    } else {
      els.stamp.textContent = "気象データを取得できませんでした";
    }
    els.screen.dataset.ready = "1";
    return {
      prefecture,
      content,
      map,
      els,
      data,
      destroy() {
        cleanups.forEach((fn) => {
          try { fn(); } catch { /* ignore */ }
        });
      }
    };
  } catch (error) {
    els.stage.hidden = false;
    els.stage.innerHTML = `<div class="data-error">表示処理でエラーが発生しました</div>`;
    els.stamp.textContent = "表示エラー";
    return {
      prefecture, content, map, els, data: { ok: false, error: String(error.message || error) },
      destroy() {
        cleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
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
