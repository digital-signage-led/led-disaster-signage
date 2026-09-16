/**
 * 地理院タイルを使う共通地図。
 * オーバーレイはコンテンツ側で差し替え、共通の中心座標設定は都道府県ごとに独立して持つ。
 */

const GSI_PALE = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";
const GSI_ATTR = "地理院タイル";

let leafletPromise = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("../../vendor/leaflet/leaflet.css", import.meta.url).href;
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = new URL("../../vendor/leaflet/leaflet.js", import.meta.url).href;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet を読み込めませんでした"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

export async function createMap(container, { prefecture, interactive = false, zoom, center } = {}) {
  const L = await loadLeaflet();
  if (container._leaflet_id) {
    container._leaflet_id = null;
    container.innerHTML = "";
  }
  const viewCenter = center || [prefecture.centerLatitude, prefecture.centerLongitude];
  const viewZoom = zoom ?? prefecture.defaultZoom;
  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    dragging: interactive,
    scrollWheelZoom: interactive,
    doubleClickZoom: interactive,
    boxZoom: false,
    keyboard: false,
    tap: false,
    zoomSnap: 0.1,
    zoomDelta: 0.2,
    zoomAnimation: false,
    fadeAnimation: false
  });
  L.tileLayer(GSI_PALE, {
    maxZoom: 14,
    minZoom: 4,
    opacity: 1
  }).addTo(map);
  map.setView(viewCenter, viewZoom, { animate: false });
  let tileOverlay = null;
  const extraLayers = [];

  const api = {
    map,
    L,
    setView(nextCenter, nextZoom) {
      map.setView(nextCenter, nextZoom, { animate: false });
    },
    setTileOverlay(urlTemplate) {
      if (!urlTemplate) return;
      const next = L.tileLayer(urlTemplate, {
        opacity: 0.72,
        maxZoom: 12,
        minZoom: 4,
        className: "disaster-overlay"
      });
      next.addTo(map);
      if (tileOverlay) {
        const prev = tileOverlay;
        setTimeout(() => {
          try { map.removeLayer(prev); } catch { /* ignore */ }
        }, 240);
      }
      tileOverlay = next;
    },
    clearTileOverlay() {
      if (tileOverlay) {
        map.removeLayer(tileOverlay);
        tileOverlay = null;
      }
    },
    addLayer(layer) {
      layer.addTo(map);
      extraLayers.push(layer);
      return layer;
    },
    clearExtraLayers() {
      extraLayers.splice(0).forEach((layer) => {
        try { map.removeLayer(layer); } catch { /* ignore */ }
      });
    },
    invalidate() {
      map.invalidateSize(false);
    },
    destroy() {
      api.clearExtraLayers();
      api.clearTileOverlay();
      map.remove();
    }
  };
  requestAnimationFrame(() => api.invalidate());
  return api;
}

export const MAP_ATTRIBUTION = `${GSI_ATTR} © 国土地理院 ／ 防災気象情報 © 気象庁`;
