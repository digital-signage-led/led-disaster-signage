import { displayName, loadTyphoons } from "../services/typhoon.js";
import { emptyPanel, errorPanel, timesBlock } from "./shared-ui.js";

function num(value, unit) {
  return value == null ? "—" : `${value}${unit}`;
}

function drawStorms(mapApi, storms) {
  mapApi.clearExtraLayers();
  const L = mapApi.L;
  const bounds = [];
  for (const storm of storms) {
    const past = [...(storm.track.preTyphoon || []), ...(storm.track.typhoon || [])]
      .map((pt) => [pt[0], pt[1]])
      .filter((pt) => Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
    if (past.length) {
      mapApi.addLayer(L.polyline(past, { color: "#0a2f7a", weight: 3, opacity: 0.85 }));
      past.forEach((pt) => bounds.push(pt));
    }
    const forecastLine = [storm.center, ...storm.forecasts.map((item) => item.center)]
      .filter(Boolean)
      .map((pt) => [pt.lat, pt.lon]);
    if (forecastLine.length > 1) {
      mapApi.addLayer(L.polyline(forecastLine, { color: "#c62828", weight: 3, dashArray: "8 8" }));
    }
    for (const fcst of storm.forecasts) {
      bounds.push([fcst.center.lat, fcst.center.lon]);
      if (fcst.radiusKm) {
        mapApi.addLayer(L.circle([fcst.center.lat, fcst.center.lon], {
          radius: fcst.radiusKm * 1000,
          color: "#c62828",
          weight: 1,
          fillColor: "#ff8a80",
          fillOpacity: 0.08
        }));
      }
      mapApi.addLayer(L.circleMarker([fcst.center.lat, fcst.center.lon], {
        radius: 6,
        color: "#c62828",
        fillColor: "#fff",
        fillOpacity: 1,
        weight: 2
      }));
    }
    if (storm.center) {
      bounds.push([storm.center.lat, storm.center.lon]);
      mapApi.addLayer(L.circleMarker([storm.center.lat, storm.center.lon], {
        radius: 10,
        color: "#111",
        fillColor: "#ffd166",
        fillOpacity: 1,
        weight: 3
      }));
    }
  }
  bounds.push([24.0, 122.5], [46.5, 146.5]);
  if (bounds.length) {
    mapApi.map.fitBounds(bounds, { padding: [28, 28], maxZoom: 5, animate: false });
  } else {
    mapApi.setView([32, 135], 5);
  }
}

function stormPanel(storm) {
  return `
    <div class="ty-grid">
      <div><span class="k">区分</span><strong>${storm.category || "—"}</strong></div>
      <div><span class="k">名称</span><strong>${displayName(storm)}</strong></div>
      <div><span class="k">現在位置</span><strong>${storm.location || (storm.center ? `${storm.center.lat.toFixed(1)}N ${storm.center.lon.toFixed(1)}E` : "—")}</strong></div>
      <div><span class="k">中心気圧</span><strong>${num(storm.pressure, "hPa")}</strong></div>
      <div><span class="k">最大風速</span><strong>${num(storm.maxWindMs, "m/s")}</strong></div>
      <div><span class="k">最大瞬間風速</span><strong>${num(storm.gustMs, "m/s")}</strong></div>
      <div><span class="k">進行方向</span><strong>${storm.course || "—"}</strong></div>
      <div><span class="k">移動速度</span><strong>${num(storm.speedKmh, "km/h")}</strong></div>
    </div>
    ${storm.forecasts.length ? `
      <div class="ty-forecast">
        ${storm.forecasts.slice(0, 4).map((item) => `
          <div>
            <em>${item.label.replace("予報　", "")}</em>
            <strong>${item.category || ""} ${item.pressure ? `${item.pressure}hPa` : ""}</strong>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;
}

export async function renderTyphoon(ctx) {
  const data = await loadTyphoons();
  ctx.els.screen.classList.add("is-map");
  if (!data.ok && !data.storms?.length) {
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">台風情報</div>
      <div class="panel-area">全国</div>
      ${errorPanel(data.message)}
      ${timesBlock({ reportAt: null, fetchedAt: data.fetchedAt, fromCache: false, reportLabel: "発表時刻" })}
    `;
    ctx.map.setView([32, 135], 5);
    return data;
  }
  if (data.empty) {
    if (ctx.els.stage) ctx.els.stage.hidden = true;
    ctx.map.setView([32, 135], 5);
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">台風情報</div>
      <div class="panel-area">全国</div>
      ${emptyPanel("現在発表されている台風情報はありません")}
      ${timesBlock({ reportAt: data.reportAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
    `;
    return data;
  }
  if (ctx.els.stage) ctx.els.stage.hidden = true;
  drawStorms(ctx.map, data.storms);
  let index = 0;
  const paint = () => {
    const storm = data.storms[index];
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">台風情報 ${data.storms.length > 1 ? `${index + 1}/${data.storms.length}` : ""}</div>
      <div class="panel-area">${displayName(storm)}</div>
      ${stormPanel(storm)}
      ${timesBlock({ reportAt: storm.issueAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
    `;
  };
  paint();
  if (data.storms.length > 1) {
    const timer = window.setInterval(() => {
      index = (index + 1) % data.storms.length;
      paint();
    }, 12000);
    ctx.addCleanup(() => window.clearInterval(timer));
  }
  return data;
}
