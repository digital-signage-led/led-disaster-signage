import { loadEarlyWarning } from "../services/early-warning.js";
import { emptyPanel, errorPanel, fillPanelBody, fillTimes } from "./shared-ui.js";

function shortPeriod(label) {
  const text = String(label || "対象期間");
  const match = text.match(/(\d+)\s*日\s*(\d+)\s*時/);
  if (match) return `${match[1]}日${match[2]}時`;
  return text.replace(/から/g, "");
}

function chipHtml(hit) {
  return `<span class="early-chip is-${hit.rank}" data-key="${hit.areaName}|${hit.phenomenon}|${hit.periodLabel}">${shortPeriod(hit.periodLabel)}　${hit.rankLabel}</span>`;
}

function listHtml(data) {
  const areas = [...new Set(data.rows.map((row) => row.areaName).filter(Boolean))];
  return areas.map((areaName) => {
    const rows = data.rows.filter((row) => row.areaName === areaName);
    const phenomena = [...new Set(rows.map((row) => row.phenomenon))];
    const body = phenomena.map((phenomenon) => {
      const hits = rows.filter((row) => row.phenomenon === phenomenon);
      const chips = hits.map((hit) => chipHtml(hit)).join("");
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
  if (!ctx._colorBound) {
    ctx._colorBound = true;
    ctx.addCleanup(() => ctx.map.clearPrefColors?.());
  }
}

function paintEarly(ctx, data) {
  paintEarlyMap(ctx, data.rows || []);
  if (ctx.els.stage) ctx.els.stage.hidden = true;
  const board = data.empty
    ? emptyPanel(`現在、この地域に発表中の早期注意情報（警報級の可能性）はありません`)
    : listHtml(data);
  fillPanelBody(ctx.els.panel, board);
  fillTimes(ctx.els.panel, { reportAt: data.reportAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" });
}

export async function renderEarlyWarning(ctx) {
  const data = await loadEarlyWarning(ctx.prefecture, {
    onCached: (cached) => paintEarly(ctx, cached)
  });
  if (data.ok || data.rows?.length) {
    paintEarly(ctx, data);
    return data;
  }
  if (ctx.els.panel.querySelector(".early-block")) return data;
  fillPanelBody(ctx.els.panel, errorPanel(data.message));
  fillTimes(ctx.els.panel, { reportAt: null, fetchedAt: data.fetchedAt, fromCache: false, reportLabel: "発表時刻" });
  return data;
}
