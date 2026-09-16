import { loadEarlyWarning } from "../services/early-warning.js";
import { emptyPanel, errorPanel, timesBlock } from "./shared-ui.js";

function shortPeriod(label) {
  const text = String(label || "対象期間");
  const match = text.match(/(\d+)\s*日\s*(\d+)\s*時/);
  if (match) return `${match[1]}日${match[2]}時`;
  return text.replace(/から/g, "");
}

function listHtml(data) {
  const areas = [...new Set(data.rows.map((row) => row.areaName).filter(Boolean))];
  return areas.map((areaName) => {
    const rows = data.rows.filter((row) => row.areaName === areaName);
    const phenomena = [...new Set(rows.map((row) => row.phenomenon))];
    const body = phenomena.map((phenomenon) => {
      const hits = rows.filter((row) => row.phenomenon === phenomenon);
      const chips = hits.map((hit) => (
        `<span class="early-chip is-${hit.rank}">${shortPeriod(hit.periodLabel)}　${hit.rankLabel}</span>`
      )).join("");
      return `<div class="early-row"><em>${phenomenon}</em><div class="early-chips">${chips}</div></div>`;
    }).join("");
    return `<section class="early-block"><h2>${areaName}</h2>${body}</section>`;
  }).join("");
}

function paintEarlyMap(ctx, rows) {
  if (!ctx.map?.setPrefColors || !ctx.prefecture?.id) return;
  const hasHigh = (rows || []).some((row) => row.rank === "high");
  const hasMid = (rows || []).some((row) => row.rank === "mid");
  if (hasHigh) {
    ctx.map.setPrefColors({ [ctx.prefecture.id]: { fillColor: "#c62828", fillOpacity: 0.88 } });
  } else if (hasMid) {
    ctx.map.setPrefColors({ [ctx.prefecture.id]: { fillColor: "#f9a825", fillOpacity: 0.92 } });
  } else {
    ctx.map.clearPrefColors?.();
  }
  ctx.addCleanup(() => ctx.map.clearPrefColors?.());
}

export async function renderEarlyWarning(ctx) {
  const data = await loadEarlyWarning(ctx.prefecture);
  paintEarlyMap(ctx, data.rows || []);
  if (ctx.els.stage) ctx.els.stage.hidden = true;
  if (!data.ok && !data.rows?.length) {
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">早期注意情報</div>
      <div class="panel-area">${ctx.prefecture.name}</div>
      ${errorPanel(data.message)}
      ${timesBlock({ reportAt: null, fetchedAt: data.fetchedAt, fromCache: false, reportLabel: "発表時刻" })}
    `;
    return data;
  }

  const board = data.empty
    ? emptyPanel(`現在、この地域に発表中の早期注意情報（警報級の可能性）はありません`)
    : listHtml(data);

  ctx.els.panel.innerHTML = `
    <div class="panel-kicker">早期注意情報</div>
    <div class="panel-area">${ctx.prefecture.name}</div>
    <p class="wx-hint">気象庁が［高］［中］で示す、警報級の現象となる可能性です。独自の危険度判定はしていません。</p>
    <div class="legend">
      <span class="legend-step"><i style="background:#c62828"></i>高</span>
      <span class="legend-step"><i style="background:#f9a825"></i>中</span>
    </div>
    ${board}
    ${timesBlock({ reportAt: data.reportAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
  `;
  return data;
}
