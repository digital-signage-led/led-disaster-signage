import { displayName, loadTyphoons } from "../services/typhoon.js";
import { emptyPanel, errorPanel, playController, timesBlock } from "./shared-ui.js";
import { formatStamp } from "../services/jma-common.js";

function num(value, unit) {
  return value == null ? "—" : `${value}${unit}`;
}

function toLatLng(pt) {
  if (Array.isArray(pt) && pt.length >= 2) {
    const lat = Number(pt[0]);
    const lon = Number(pt[1]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
  }
  if (Array.isArray(pt?.value) && pt.value.length >= 2) return toLatLng(pt.value);
  if (Number.isFinite(pt?.lat) && Number.isFinite(pt?.lon)) return [pt.lat, pt.lon];
  return null;
}

function pastLine(storm) {
  return [...(storm.track.preTyphoon || []), ...(storm.track.typhoon || [])]
    .map(toLatLng)
    .filter(Boolean);
}

function typhoonNoLabel(storm) {
  const raw = String(storm?.typhoonNumber || "");
  if (/^\d{4}$/.test(raw)) return `台風第${Number(raw.slice(2))}号`;
  if (/^\d+$/.test(raw)) return `台風第${Number(raw)}号`;
  return "";
}

function timelineOf(storm) {
  const steps = [];
  if (storm.center) {
    steps.push({
      kind: "now",
      at: storm.analysisAt,
      center: storm.center,
      location: storm.location,
      category: storm.category,
      pressure: storm.pressure,
      maxWindMs: storm.maxWindMs,
      gustMs: storm.gustMs,
      course: storm.course,
      speedKmh: storm.speedKmh,
      radiusKm: storm.forecasts[0]?.radiusKm || null,
      galeRadiusKm: storm.galeRadiusKm,
      galeCenter: storm.galeCenter,
      stormRadiusKm: storm.stormRadiusKm,
      hours: 0,
      label: "実況"
    });
  }
  for (const fcst of storm.forecasts) {
    steps.push({
      kind: "forecast",
      at: fcst.validAt,
      center: fcst.center,
      location: fcst.location,
      category: fcst.category || storm.category,
      pressure: fcst.pressure,
      maxWindMs: fcst.maxWindMs,
      gustMs: fcst.gustMs,
      course: fcst.course,
      speedKmh: fcst.speedKmh,
      radiusKm: fcst.radiusKm,
      galeRadiusKm: fcst.galeRadiusKm,
      galeCenter: fcst.galeCenter,
      stormRadiusKm: fcst.stormRadiusKm,
      stormCenter: fcst.stormCenter,
      hours: fcst.hours,
      label: fcst.label
    });
  }
  return steps
    .filter((step) => step.center && Number.isFinite(step.center.lat) && Number.isFinite(step.center.lon))
    .sort((a, b) => (a.at?.getTime() || 0) - (b.at?.getTime() || 0));
}

function framesOf(storms) {
  const frames = [];
  for (const storm of storms) {
    const steps = timelineOf(storm);
    steps.forEach((step, index) => {
      frames.push({
        storm,
        steps,
        index,
        step,
        validtime: step.kind === "now" || index === steps.length - 1 ? "now" : `f${index}`,
        basetime: "now"
      });
    });
  }
  return frames;
}

function shortDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}時`;
}

function stepKindLabel(step) {
  if (step.kind === "now") return "実況";
  if (step.hours) return `${step.hours}時間後`;
  return String(step.label || "予報").replace("予報　", "").replace("予報", "") || "予報";
}

const JAPAN_FILL = [[24.0, 122.8], [45.8, 146.5]];
const JAPAN_MAIN = [
  [45.4, 141.7], [43.1, 141.4], [42.3, 140.0],
  [40.8, 140.7], [39.7, 141.2], [38.3, 141.0], [36.6, 140.6],
  [35.7, 140.0], [34.9, 139.1], [34.7, 137.2], [34.4, 136.9],
  [34.6, 135.4], [33.5, 135.8], [34.4, 133.8], [34.4, 132.5],
  [33.5, 133.5], [33.9, 131.0], [33.6, 130.4], [32.8, 129.9],
  [31.6, 130.6], [28.4, 129.5], [26.6, 128.0], [24.8, 125.3],
  [24.3, 124.2]
];
const APPROACH_KM = 800;
const CLOSE_KM = 420;

function haversineKm(aLat, aLon, bLat, bLon) {
  const toR = (deg) => (deg * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLon = toR(bLon - aLon);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
}

function distToJapanLandKm(lat, lon) {
  return JAPAN_MAIN.reduce((min, pt) => Math.min(min, haversineKm(lat, lon, pt[0], pt[1])), Infinity);
}

function nearestJapanPoints(lat, lon, radiusKm, fallback = 5) {
  const ranked = JAPAN_MAIN
    .map((pt) => ({ pt, km: haversineKm(lat, lon, pt[0], pt[1]) }))
    .sort((a, b) => a.km - b.km);
  const near = ranked.filter((item) => item.km <= radiusKm).map((item) => item.pt);
  return (near.length ? near : ranked.slice(0, fallback).map((item) => item.pt));
}

function japanFullyVisible(map, L) {
  const japan = L.latLngBounds(JAPAN_FILL);
  const view = map.getBounds();
  return view.contains(japan.getSouthWest()) && view.contains(japan.getNorthEast());
}

function fitFrame(mapApi, extraPoints = [], options = {}) {
  const L = mapApi.L;
  const map = mapApi.map;
  map.invalidateSize(false);
  const pts = extraPoints.filter((pt) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
  const keepJapan = options.keepJapan !== false;
  const bounds = keepJapan || !pts.length ? L.latLngBounds(JAPAN_FILL) : L.latLngBounds(pts);
  for (const pt of pts) bounds.extend(pt);
  map.fitBounds(bounds, {
    padding: options.padding || [48, 48],
    maxZoom: options.maxZoom ?? 4.5,
    animate: false
  });
  if (options.keepJapanFull) {
    let guard = 0;
    while (guard < 10 && map.getZoom() > 3.5 && !japanFullyVisible(map, L)) {
      map.setZoom(map.getZoom() - 0.25, { animate: false });
      guard += 1;
    }
  }
}

function fitJapan(mapApi) {
  fitFrame(mapApi, [], { keepJapan: true, keepJapanFull: true, maxZoom: 4.5 });
}

function circleExtent(lat, lon, radiusKm) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusKm) || radiusKm <= 0) return [];
  const dlat = radiusKm / 111;
  const dlon = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [[lat - dlat, lon - dlon], [lat + dlat, lon + dlon]];
}

function stormPoints(storm, steps) {
  const pts = [];
  if (storm.center) pts.push([storm.center.lat, storm.center.lon]);
  pts.push(...circleExtent(storm.galeCenter?.lat, storm.galeCenter?.lon, storm.galeRadiusKm));
  pts.push(...circleExtent(storm.center?.lat, storm.center?.lon, storm.stormRadiusKm));
  for (const step of steps || timelineOf(storm)) {
    pts.push([step.center.lat, step.center.lon]);
    pts.push(...circleExtent(step.center.lat, step.center.lon, step.radiusKm));
    pts.push(...circleExtent(step.center.lat, step.center.lon, step.stormRadiusKm));
  }
  return pts;
}

function bodyPoints(storm, { hours = 24, galeCapKm = 280, landKm = 700, focusStep = null } = {}) {
  const steps = timelineOf(storm);
  const center = focusStep?.center || storm.center;
  const pts = [];
  if (center) {
    pts.push([center.lat, center.lon]);
    pts.push(...nearestJapanPoints(center.lat, center.lon, landKm));
  }
  const showNowBody = !focusStep || focusStep.kind === "now";
  if (showNowBody) {
    pts.push(...circleExtent(storm.center?.lat, storm.center?.lon, Math.min(storm.stormRadiusKm || 0, 220)));
    pts.push(...circleExtent(
      storm.galeCenter?.lat || storm.center?.lat,
      storm.galeCenter?.lon || storm.center?.lon,
      Math.min(storm.galeRadiusKm || 0, galeCapKm)
    ));
  }
  const focusHours = Number(focusStep?.hours || 0);
  for (const step of steps) {
    const stepHours = Number(step.hours || 0);
    if (focusStep && step.kind !== "now") {
      if (Math.abs(stepHours - focusHours) > hours) continue;
    } else if (step.kind !== "now" && stepHours > hours) {
      continue;
    }
    pts.push([step.center.lat, step.center.lon]);
    pts.push(...circleExtent(step.center.lat, step.center.lon, Math.min(step.radiusKm || 0, 220)));
    pts.push(...circleExtent(step.center.lat, step.center.lon, Math.min(step.stormRadiusKm || 0, 220)));
  }
  return pts;
}

function fitStorm(mapApi, storm) {
  fitAllStorms(mapApi, [storm]);
}

function fitAllStorms(mapApi, storms, frame = null) {
  const focusStorm = frame?.storm || (storms || [])[0];
  const focusStep = frame?.step || null;
  const focusCenter = focusStep?.center || focusStorm?.center;
  const dist = focusCenter ? distToJapanLandKm(focusCenter.lat, focusCenter.lon) : Infinity;
  if (!focusStorm || !Number.isFinite(dist)) {
    fitJapan(mapApi);
    return;
  }
  if (dist <= CLOSE_KM) {
    fitFrame(mapApi, bodyPoints(focusStorm, { hours: 12, galeCapKm: 220, landKm: 620, focusStep }), {
      keepJapan: false,
      keepJapanFull: false,
      maxZoom: 6.75,
      padding: [32, 32]
    });
    return;
  }
  if (dist <= APPROACH_KM) {
    fitFrame(mapApi, bodyPoints(focusStorm, { hours: 24, galeCapKm: 360, landKm: 980, focusStep }), {
      keepJapan: false,
      keepJapanFull: false,
      maxZoom: 5.75,
      padding: [40, 40]
    });
    return;
  }
  const pts = storms.flatMap((storm) => stormPoints(storm, timelineOf(storm)));
  fitFrame(mapApi, pts, { keepJapan: true, keepJapanFull: true, maxZoom: 4.5 });
}

const STORM_COLORS = [
  { now: "#ffd166", line: "#c62828", past: "#0a2f7a" },
  { now: "#80deea", line: "#ef6c00", past: "#1565c0" },
  { now: "#ce93d8", line: "#6a1b9a", past: "#00695c" }
];

function drawOtherStorm(mapApi, storm, colors) {
  const L = mapApi.L;
  const past = pastLine(storm);
  if (past.length > 1) {
    mapApi.addLayer(L.polyline(past, { color: colors.past, weight: 2, opacity: 0.55 }));
  }
  if (!storm.center) return;
  const marker = L.circleMarker([storm.center.lat, storm.center.lon], {
    radius: 8,
    color: "#111",
    fillColor: colors.now,
    fillOpacity: 0.85,
    weight: 2
  });
  marker.bindTooltip(displayName(storm), {
    permanent: true,
    direction: "right",
    offset: [10, 0],
    className: "ty-map-label"
  });
  mapApi.addLayer(marker);
}

function drawCircle(mapApi, L, latlng, radiusKm, style) {
  if (!radiusKm || radiusKm <= 0 || !Array.isArray(latlng)) return;
  if (!Number.isFinite(latlng[0]) || !Number.isFinite(latlng[1])) return;
  mapApi.addLayer(L.circle(latlng, { radius: radiusKm * 1000, pane: "trackPane", ...style }));
}

function drawStep(mapApi, storm, steps, currentIndex, others = []) {
  mapApi.clearExtraLayers();
  others.forEach((item, idx) => {
    drawOtherStorm(mapApi, item.storm, STORM_COLORS[(item.colorIndex ?? idx + 1) % STORM_COLORS.length]);
  });
  const L = mapApi.L;
  const revealed = steps.slice(0, currentIndex + 1);
  const past = pastLine(storm);
  if (past.length > 1) {
    mapApi.addLayer(L.polyline(past, { color: "#d7e7ff", weight: 4, opacity: 0.95, smoothFactor: 0 }));
  }
  const forecastLine = revealed.map((step) => [step.center.lat, step.center.lon]);
  if (forecastLine.length > 1) {
    mapApi.addLayer(L.polyline(forecastLine, {
      color: "#ff8a80",
      weight: 4,
      dashArray: "12 8",
      opacity: 0.95,
      smoothFactor: 0
    }));
  }
  const showNowBody = revealed.some((step) => step.kind === "now");
  const galeKm = storm.galeRadiusKm;
  const galeAt = storm.galeCenter || storm.center;
  if (showNowBody && galeKm && galeAt && Number.isFinite(galeAt.lat) && Number.isFinite(galeAt.lon)) {
    drawCircle(mapApi, L, [galeAt.lat, galeAt.lon], galeKm, {
      color: "#c62828",
      weight: 4,
      fillColor: "#c62828",
      fillOpacity: 0.2
    });
  }
  if (showNowBody && storm.stormRadiusKm && storm.center) {
    drawCircle(mapApi, L, [storm.center.lat, storm.center.lon], storm.stormRadiusKm, {
      color: "#b71c1c",
      weight: 3,
      fillColor: "#ff5252",
      fillOpacity: 0.22
    });
  }
  revealed.forEach((step, index) => {
    const current = index === currentIndex;
    const latlng = [step.center.lat, step.center.lon];
    if (step.radiusKm) {
      drawCircle(mapApi, L, latlng, step.radiusKm, {
        color: "#fff",
        weight: current ? 3 : 2,
        dashArray: "10 7",
        fill: false,
        opacity: current ? 1 : 0.7
      });
    }
    if (current && step.kind === "forecast" && step.stormRadiusKm) {
      drawCircle(mapApi, L, step.stormCenter ? [step.stormCenter.lat, step.stormCenter.lon] : latlng, step.stormRadiusKm, {
        color: "#c62828",
        weight: 3,
        fillColor: "#ff8a80",
        fillOpacity: 0.14
      });
    }
    const marker = L.circleMarker(latlng, current
      ? { radius: 11, color: "#111", fillColor: "#ffd166", fillOpacity: 1, weight: 3 }
      : { radius: 6, color: "#fff", fillColor: step.kind === "now" ? "#ffd166" : "#c62828", fillOpacity: 1, weight: 2 });
    const label = shortDate(step.at);
    if (label) {
      const left = index % 2 === 1;
      marker.bindTooltip(label, {
        permanent: true,
        direction: left ? "left" : "right",
        offset: left ? [-14, index % 4 === 3 ? 16 : 0] : [14, index % 4 === 2 ? 16 : 0],
        className: current ? "ty-map-label is-now" : "ty-map-label"
      });
    }
    mapApi.addLayer(marker);
  });
}

function fact(label, value) {
  return `<div class="ty-fact"><span class="k">${label}</span><strong>${value}</strong></div>`;
}

function stormPanel(storm, step, index, total) {
  const place = step.location || `${step.center.lat.toFixed(1)}N ${step.center.lon.toFixed(1)}E`;
  const kind = [stepKindLabel(step), step.category || storm.category, `${index + 1}/${total}`].filter(Boolean).join("　");
  return `
    <div class="ty-head">
      <div class="ty-no">${typhoonNoLabel(storm) || "台風"}</div>
      <div class="ty-name">${displayName(storm)}</div>
    </div>
    <div class="ty-date">${formatStamp(step.at)}</div>
    <div class="ty-when">${kind}</div>
    <div class="ty-place">${place}</div>
    <div class="ty-facts">
      ${fact("中心気圧", num(step.pressure, " hPa"))}
      ${fact("最大風速", num(step.maxWindMs, " m/s"))}
      ${fact("瞬間風速", num(step.gustMs, " m/s"))}
      ${fact("進行方向", step.course || "—")}
      ${fact("移動速度", num(step.speedKmh, " km/h"))}
    </div>
  `;
}

function paintFrame(ctx, data, frame) {
  const { storm, steps, index, step } = frame;
  const stormNo = data.storms.indexOf(storm);
  const others = data.storms
    .map((item, colorIndex) => ({ storm: item, colorIndex }))
    .filter((item) => item.storm !== storm);
  drawStep(ctx.map, storm, steps, index, others);
  fitAllStorms(ctx.map, data.storms, frame);
  if (ctx.els.point) {
    ctx.els.point.textContent = data.storms.length > 1
      ? `${displayName(storm)}　${stormNo + 1}/${data.storms.length}　${shortDate(step.at)}`
      : `${shortDate(step.at)}　${index + 1}/${steps.length}`;
  }
  ctx.els.panel.classList.add("is-typhoon");
  ctx.els.panel.innerHTML = `
    <div class="panel-kicker">台風情報${data.storms.length > 1 ? `　${stormNo + 1}/${data.storms.length}` : ""}</div>
    ${stormPanel(storm, step, index, steps.length)}
    ${timesBlock({ reportAt: storm.issueAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
  `;
}

function paintTyphoon(ctx, data) {
  ctx.els.screen.classList.add("is-map", "is-typhoon-map");
  if (ctx.els.attr) ctx.els.attr.textContent = "出典：気象庁";
  if (ctx.els.stage) ctx.els.stage.hidden = true;
  if (!data.ok && !data.storms?.length) {
    if (ctx.els.panel.querySelector(".ty-facts")) return;
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">台風情報</div>
      <div class="panel-area">全国</div>
      ${errorPanel(data.message)}
      ${timesBlock({ reportAt: null, fetchedAt: data.fetchedAt, fromCache: false, reportLabel: "発表時刻" })}
    `;
    fitJapan(ctx.map);
    return;
  }
  if (data.empty) {
    fitJapan(ctx.map);
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">台風情報</div>
      <div class="panel-area">全国</div>
      ${emptyPanel("現在台風情報はありません")}
      ${timesBlock({ reportAt: data.reportAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
    `;
    return;
  }
  ctx.els.panel.classList.add("is-typhoon");
  const frames = framesOf(data.storms);
  if (frames.length) fitAllStorms(ctx.map, data.storms);
  if (!frames.length) {
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">台風情報</div>
      <div class="panel-area">${displayName(data.storms[0])}</div>
      ${emptyPanel("進路情報がありません")}
      ${timesBlock({ reportAt: data.storms[0].issueAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
    `;
    return;
  }
  if (ctx._player) ctx._player.stop();
  if (ctx._refitTimer) window.clearTimeout(ctx._refitTimer);
  ctx._player = playController({
    frames,
    playMs: 3000,
    holdMs: 3000,
    onFrame(frame) {
      paintFrame(ctx, data, frame);
    }
  });
  const refit = () => fitAllStorms(ctx.map, data.storms);
  window.requestAnimationFrame(refit);
  ctx._refitTimer = window.setTimeout(refit, 240);
  if (!ctx._playerBound) {
    ctx._playerBound = true;
    ctx.addCleanup(() => {
      ctx._player?.stop();
      window.clearTimeout(ctx._refitTimer);
      ctx.map.clearExtraLayers();
    });
  }
}

export async function renderTyphoon(ctx) {
  const data = await loadTyphoons({
    onCached: (cached) => paintTyphoon(ctx, cached)
  });
  paintTyphoon(ctx, data);
  return data;
}
