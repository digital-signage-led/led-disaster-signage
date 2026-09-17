/**
 * 県境のシンプルな白地図。道路タイルは使わない。
 * 親要素の CSS transform は Leaflet タイル欠けの原因になるため使わない。
 */

const PREF_GEOJSON = new URL("../../data/japan-prefectures.geojson", import.meta.url).href;
const NEIGHBOR_GEOJSON = new URL("../../data/east-asia-neighbors.geojson", import.meta.url).href;
const TRANSPARENT = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const SEA = "#6e9bb8";
const EAST_ASIA_BOUNDS = [[8.0, 110.0], [50.0, 150.0]];

function intersectEdge(a, b, edge) {
  const [ax, ay] = a;
  const [bx, by] = b;
  if (edge.axis === "lng") {
    const t = (edge.value - ax) / (bx - ax || 1e-12);
    return [edge.value, ay + (by - ay) * t];
  }
  const t = (edge.value - ay) / (by - ay || 1e-12);
  return [ax + (bx - ax) * t, edge.value];
}

function insideEdge(point, edge) {
  if (edge.axis === "lng") return edge.keep === "gte" ? point[0] >= edge.value : point[0] <= edge.value;
  return edge.keep === "gte" ? point[1] >= edge.value : point[1] <= edge.value;
}

function clipRingToBbox(ring, bbox) {
  const edges = [
    { axis: "lng", value: bbox.west, keep: "gte" },
    { axis: "lat", value: bbox.south, keep: "gte" },
    { axis: "lng", value: bbox.east, keep: "lte" },
    { axis: "lat", value: bbox.north, keep: "lte" }
  ];
  let output = ring.filter((pt) => Array.isArray(pt) && pt.length >= 2);
  if (output.length > 1) {
    const first = output[0];
    const last = output[output.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) output = output.slice(0, -1);
  }
  for (const edge of edges) {
    if (!output.length) return [];
    const input = output;
    output = [];
    let prev = input[input.length - 1];
    for (const cur of input) {
      const curIn = insideEdge(cur, edge);
      const prevIn = insideEdge(prev, edge);
      if (curIn) {
        if (!prevIn) output.push(intersectEdge(prev, cur, edge));
        output.push(cur);
      } else if (prevIn) {
        output.push(intersectEdge(prev, cur, edge));
      }
      prev = cur;
    }
  }
  if (output.length < 3) return [];
  const first = output[0];
  const last = output[output.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) output.push([first[0], first[1]]);
  return output;
}

function clipPolygonCoords(coords, bbox) {
  if (!Array.isArray(coords) || !coords.length) return null;
  const outer = clipRingToBbox(coords[0] || [], bbox);
  if (outer.length < 4) return null;
  const holes = coords.slice(1).map((ring) => clipRingToBbox(ring, bbox)).filter((ring) => ring.length >= 4);
  return [outer, ...holes];
}

function clipFeatureToBbox(feature, bbox) {
  const geom = feature?.geometry;
  if (!geom) return null;
  if (geom.type === "Polygon") {
    const clipped = clipPolygonCoords(geom.coordinates, bbox);
    if (!clipped) return null;
    return { type: "Feature", properties: feature.properties || {}, geometry: { type: "Polygon", coordinates: clipped } };
  }
  if (geom.type === "MultiPolygon") {
    const polys = (geom.coordinates || []).map((coords) => clipPolygonCoords(coords, bbox)).filter(Boolean);
    if (!polys.length) return null;
    return { type: "Feature", properties: feature.properties || {}, geometry: { type: "MultiPolygon", coordinates: polys } };
  }
  return null;
}

function clipGeoToBounds(geo, bounds, pad = 2.8) {
  if (!geo || !bounds) return { type: "FeatureCollection", features: [] };
  const bbox = {
    west: bounds.getWest() - pad,
    south: bounds.getSouth() - pad,
    east: bounds.getEast() + pad,
    north: bounds.getNorth() + pad
  };
  if (bbox.west >= bbox.east || bbox.south >= bbox.north) {
    return { type: "FeatureCollection", features: [] };
  }
  const features = (geo.features || []).map((feature) => clipFeatureToBbox(feature, bbox)).filter(Boolean);
  return { type: "FeatureCollection", features };
}

let leafletPromise = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-leaflet]")) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.dataset.leaflet = "1";
      css.href = new URL("../../vendor/leaflet/leaflet.css", import.meta.url).href;
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = new URL("../../vendor/leaflet/leaflet.js", import.meta.url).href;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet を読み込めませんでした"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

let prefGeoPromise = null;
let neighborGeoPromise = null;

function loadPrefGeo() {
  if (!prefGeoPromise) {
    prefGeoPromise = fetch(PREF_GEOJSON)
      .then((res) => {
        if (!res.ok) throw new Error("県境データを読み込めませんでした");
        return res.json();
      })
      .catch((err) => {
        prefGeoPromise = null;
        throw err;
      });
  }
  return prefGeoPromise;
}

function loadNeighborGeo() {
  if (!neighborGeoPromise) {
    neighborGeoPromise = fetch(NEIGHBOR_GEOJSON)
      .then((res) => {
        if (!res.ok) throw new Error("周辺国データを読み込めませんでした");
        return res.json();
      })
      .catch((err) => {
        neighborGeoPromise = null;
        throw err;
      });
  }
  return neighborGeoPromise;
}

function neighborFillStyle() {
  return {
    stroke: false,
    fillColor: "#9aa3ab",
    fillOpacity: 0.7
  };
}

function neighborStrokeStyle() {
  return {
    fill: false,
    color: "#5f666e",
    weight: 2,
    opacity: 1,
    lineJoin: "round",
    lineCap: "round"
  };
}

function featurePrefId(feature) {
  return String(feature?.properties?.id || "").padStart(2, "0");
}

function fillStyle(feature, currentId, prefColors, overlayOn) {
  const id = featurePrefId(feature);
  const override = prefColors?.[id];
  if (override?.fillColor) {
    return {
      stroke: false,
      fillColor: override.fillColor,
      fillOpacity: override.fillOpacity ?? 0.92
    };
  }
  const focus = id === currentId;
  return {
    stroke: false,
    fillColor: focus ? "#eceeef" : "#c4c8cd",
    fillOpacity: overlayOn ? (focus ? 0.08 : 0.2) : (focus ? 0.92 : 0.62)
  };
}

function strokeStyle(feature, currentId) {
  const focus = featurePrefId(feature) === currentId;
  return {
    fill: false,
    color: focus ? "#3d424a" : "#7a8088",
    weight: focus ? 4.2 : 1.4,
    opacity: 1,
    lineJoin: "round",
    lineCap: "round"
  };
}

function waitSize(el) {
  return new Promise((resolve) => {
    if (el.clientWidth >= 80 && el.clientHeight >= 80) {
      resolve();
      return;
    }
    let n = 0;
    const tick = () => {
      n += 1;
      if ((el.clientWidth >= 80 && el.clientHeight >= 80) || n > 8) {
        resolve();
        return;
      }
      setTimeout(tick, 40);
    };
    tick();
  });
}

function prefMaxZoom(pref, cap) {
  const base = Math.min(11, (Number(pref?.defaultZoom) || 8.5) + (Number(pref?.zoomBoost) || 0));
  return cap != null ? Math.min(base, Number(cap)) : base;
}

function clampPrefZoom(zoom, pref) {
  return Math.min(prefMaxZoom(pref), Math.max(5.5, Number(zoom) || 7.5));
}

function prefLatLngBounds(L, pref) {
  const b = pref?.bounds;
  if (!b) return null;
  return L.latLngBounds([b.south, b.west], [b.north, b.east]);
}

function applyPrefView(map, L, pref, cap) {
  const bounds = prefLatLngBounds(L, pref);
  if (bounds) {
    map.fitBounds(bounds.pad(0.06), {
      padding: [28, 28],
      maxZoom: 12,
      animate: false
    });
    const ceiling = cap != null ? Number(cap) : 12;
    map.setZoom(Math.min(map.getZoom() + Math.log2(1.25), ceiling), { animate: false });
    return;
  }
  map.setView(
    [pref.centerLatitude, pref.centerLongitude],
    cap != null ? Math.min(Number(cap), prefMaxZoom(pref)) : clampPrefZoom(pref.defaultZoom, pref),
    { animate: false }
  );
}

function applyNationalView(map, L, zoom, center) {
  if (center && zoom != null) {
    map.setView(center, zoom, { animate: false });
    return;
  }
  map.fitBounds(L.latLngBounds(EAST_ASIA_BOUNDS), {
    padding: [24, 24],
    maxZoom: 5,
    animate: false
  });
}

function isPrefecture(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value.slug || value.centerLatitude));
}

export function warmupMap() {
  loadLeaflet().catch(() => {});
  loadPrefGeo().catch(() => {});
  loadNeighborGeo().catch(() => {});
}

warmupMap();

export async function createMap(container, { prefecture, interactive = false, mode = "prefecture", zoom, center, maxFitZoom } = {}) {
  if (container._mapApi) {
    const api = container._mapApi;
    if (mode === "national") api.setView(center || [36.5, 136.2], zoom ?? 5);
    else if (prefecture) api.setView(prefecture);
    return api;
  }
  const L = await loadLeaflet();
  const geoReady = Promise.all([
    loadPrefGeo().catch(() => null),
    loadNeighborGeo().catch(() => null)
  ]);
  await waitSize(container);
  const [prefGeo, neighborGeo] = await geoReady;
  if (container._mapApi) return container._mapApi;
  if (container._leaflet_id) {
    try {
      container._leaflet?.remove?.();
    } catch {
      /* ignore */
    }
    container._leaflet_id = null;
    container.innerHTML = "";
  }
  let currentPref = prefecture;
  let currentMode = mode === "national" ? "national" : "prefecture";
  const fitCap = maxFitZoom;
  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    dragging: interactive,
    scrollWheelZoom: interactive,
    doubleClickZoom: interactive,
    boxZoom: false,
    keyboard: false,
    tap: false,
    minZoom: 3.5,
    maxZoom: 12,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    fadeAnimation: false,
    zoomAnimation: false,
    markerZoomAnimation: false
  });
  map.getContainer().style.background = SEA;
  map.createPane("neighborFillPane");
  map.getPane("neighborFillPane").style.zIndex = 330;
  map.createPane("neighborStrokePane");
  map.getPane("neighborStrokePane").style.zIndex = 335;
  map.getPane("neighborStrokePane").style.pointerEvents = "none";
  map.createPane("prefFillPane");
  map.getPane("prefFillPane").style.zIndex = 350;
  map.createPane("prefStrokePane");
  map.getPane("prefStrokePane").style.zIndex = 460;
  map.getPane("prefStrokePane").style.pointerEvents = "none";
  map.createPane("nowcastPane");
  map.getPane("nowcastPane").style.zIndex = 400;
  map.getPane("nowcastPane").style.pointerEvents = "none";
  map.createPane("trackPane");
  map.getPane("trackPane").style.zIndex = 490;

  let fillLayer = null;
  let strokeLayer = null;
  let prefColors = {};
  let overlayOn = false;
  const paintPrefs = () => {
    const currentId = currentPref?.id;
    if (fillLayer) fillLayer.setStyle((feature) => fillStyle(feature, currentId, prefColors, overlayOn));
    if (strokeLayer) {
      strokeLayer.setStyle((feature) => strokeStyle(feature, currentId));
      strokeLayer.eachLayer((layer) => {
        if (featurePrefId(layer.feature) === currentId) layer.bringToFront();
      });
    }
  };
  let neighborFillLayer = null;
  let neighborStrokeLayer = null;
  const paintNeighbors = () => {
    if (!neighborGeo || neighborFillLayer) return;
    neighborFillLayer = L.geoJSON(neighborGeo, {
      pane: "neighborFillPane",
      interactive: false,
      style: neighborFillStyle
    }).addTo(map);
    neighborStrokeLayer = L.geoJSON(neighborGeo, {
      pane: "neighborStrokePane",
      interactive: false,
      style: neighborStrokeStyle
    }).addTo(map);
  };
  if (prefGeo) {
    fillLayer = L.geoJSON(prefGeo, {
      pane: "prefFillPane",
      interactive: false,
      style: (feature) => fillStyle(feature, prefecture?.id, prefColors, overlayOn)
    }).addTo(map);
    strokeLayer = L.geoJSON(prefGeo, {
      pane: "prefStrokePane",
      interactive: false,
      style: (feature) => strokeStyle(feature, prefecture?.id)
    }).addTo(map);
  }
  if (currentMode === "national") {
    applyNationalView(map, L, zoom, center);
  } else {
    applyPrefView(map, L, prefecture, fitCap);
  }
  paintNeighbors();
  container._leaflet = map;

  let overlayUrl = "";
  let overlaySeq = 0;
  const tileLayers = [null, null];
  let shownTile = 0;
  const decodedTiles = new Map();
  const extraLayers = [];

  const makeTileLayer = (urlTemplate) => {
    const layer = L.tileLayer(urlTemplate, {
      pane: "nowcastPane",
      opacity: 0,
      maxZoom: 12,
      maxNativeZoom: 6,
      minZoom: 3.5,
      minNativeZoom: 5,
      zoomOffset: 0,
      tileSize: 256,
      detectRetina: false,
      updateWhenIdle: false,
      updateWhenZooming: false,
      keepBuffer: 8,
      className: "disaster-overlay",
      errorTileUrl: TRANSPARENT
    });
    const origUrl = layer.getTileUrl.bind(layer);
    layer.getTileUrl = (coords) => origUrl({
      ...coords,
      z: Math.max(5, Math.min(6, Math.round(Number(coords.z) || 6)))
    });
    return layer;
  };

  const pruneDecoded = () => {
    if (decodedTiles.size <= 64) return;
    [...decodedTiles.entries()]
      .sort((a, b) => a[1].at - b[1].at)
      .slice(0, decodedTiles.size - 64)
      .forEach(([key]) => decodedTiles.delete(key));
  };

  const decodeTile = (url) => {
    const hit = decodedTiles.get(url);
    if (hit) {
      hit.at = Date.now();
      return hit.ready;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    const ready = (img.decode ? img.decode() : new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    })).catch(() => {});
    decodedTiles.set(url, { img, ready, at: Date.now() });
    pruneDecoded();
    return ready;
  };

  const tilesForTemplate = (urlTemplate) => {
    const z = Math.max(5, Math.min(6, Math.round(map.getZoom() || 6)));
    const bounds = map.getBounds();
    const nw = map.project(bounds.getNorthWest(), z).divideBy(256).floor();
    const se = map.project(bounds.getSouthEast(), z).divideBy(256).ceil();
    const urls = [];
    for (let x = nw.x; x <= se.x; x += 1) {
      for (let y = nw.y; y <= se.y; y += 1) {
        urls.push(L.Util.template(urlTemplate, { s: "a", z, x, y }));
      }
    }
    return urls;
  };

  const prefetchTiles = (urlTemplate) => {
    if (!urlTemplate) return Promise.resolve();
    return Promise.all(tilesForTemplate(urlTemplate).map(decodeTile));
  };

  const refresh = () => {
    map.invalidateSize(false);
    tileLayers.forEach((layer) => layer?.redraw());
  };

  const api = {
    map,
    L,
    setView(nextPrefOrCenter, nextPointOrZoom) {
      if (isPrefecture(nextPrefOrCenter)) {
        currentPref = nextPrefOrCenter;
        currentMode = "prefecture";
        paintPrefs();
        applyPrefView(map, L, nextPrefOrCenter, fitCap);
        refresh();
        return;
      }
      if (Array.isArray(nextPrefOrCenter)) {
        currentMode = "national";
        map.setView(nextPrefOrCenter, nextPointOrZoom ?? 4, { animate: false });
        return;
      }
    },
    setCenter(latlng, nextZoom) {
      currentMode = "national";
      map.setView(latlng, nextZoom ?? 4, { animate: false });
    },
    setPrefColors(colors) {
      prefColors = colors && typeof colors === "object" ? { ...colors } : {};
      paintPrefs();
    },
    clearPrefColors() {
      prefColors = {};
      paintPrefs();
    },
    setTileOverlay(urlTemplate) {
      if (!urlTemplate) return;
      overlayOn = true;
      paintPrefs();
      if (urlTemplate === overlayUrl && tileLayers[shownTile]) return;
      const seq = ++overlaySeq;
      const next = 1 - shownTile;
      if (!tileLayers[next]) tileLayers[next] = makeTileLayer(urlTemplate);
      else tileLayers[next].setUrl(urlTemplate);
      tileLayers[next].setOpacity(0);
      if (!map.hasLayer(tileLayers[next])) tileLayers[next].addTo(map);
      prefetchTiles(urlTemplate).then(() => {
        if (seq !== overlaySeq) return;
        tileLayers[next].setOpacity(0.5);
        if (tileLayers[shownTile] && tileLayers[shownTile] !== tileLayers[next]) {
          tileLayers[shownTile].setOpacity(0);
        }
        shownTile = next;
        overlayUrl = urlTemplate;
      });
    },
    prefetchTiles,
    clearTileOverlay() {
      tileLayers.forEach((layer, index) => {
        if (!layer) return;
        try { map.removeLayer(layer); } catch { /* ignore */ }
        tileLayers[index] = null;
      });
      overlayUrl = "";
      overlayOn = false;
      paintPrefs();
    },
    addLayer(layer) {
      if (layer?.options && !layer.options.pane) layer.options.pane = "trackPane";
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
      refresh();
    },
    destroy() {
      api.clearExtraLayers();
      api.clearTileOverlay();
      map.remove();
    }
  };
  requestAnimationFrame(refresh);
  setTimeout(refresh, 120);
  setTimeout(refresh, 400);
  container._mapApi = api;
  return api;
}

export const MAP_ATTRIBUTION = "都道府県界・周辺国 ／ 防災気象情報 © 気象庁";
