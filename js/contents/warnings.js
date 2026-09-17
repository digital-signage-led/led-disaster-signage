import { loadWarnings } from "../services/warnings.js";
import { emptyPanel, errorPanel, fillPanelBody, fillTimes } from "./shared-ui.js";

const MAP_FILL = {
  special: { fillColor: "#111111", fillOpacity: 0.92 },
  warning: { fillColor: "#c62828", fillOpacity: 0.88 },
  advisory: { fillColor: "#f2e700", fillOpacity: 0.94 }
};

function topWarningClass(items) {
  const rank = { special: 0, warning: 1, advisory: 2 };
  return (items || []).slice().sort((a, b) => (rank[a.className] ?? 9) - (rank[b.className] ?? 9))[0] || null;
}

function paintWarningMap(ctx, items) {
  if (!ctx.map?.setPrefColors) return;
  const top = topWarningClass(items);
  if (top && MAP_FILL[top.className] && ctx.prefecture?.id) {
    ctx.map.setPrefColors({ [ctx.prefecture.id]: MAP_FILL[top.className] });
  } else {
    ctx.map.clearPrefColors?.();
  }
  if (!ctx._colorBound) {
    ctx._colorBound = true;
    ctx.addCleanup(() => ctx.map.clearPrefColors?.());
  }
}

function groupItems(items) {
  return {
    special: items.filter((item) => item.className === "special"),
    warning: items.filter((item) => item.className === "warning"),
    advisory: items.filter((item) => item.className === "advisory")
  };
}

function card(item) {
  return `
    <article class="warn-card is-${item.className}">
      <div class="warn-class">${item.classLabel}</div>
      <div class="warn-name">${item.name}</div>
      <div class="warn-meta">
        <span>${item.areaName}</span>
        <span>${item.status}</span>
        ${item.additions?.length ? `<span>${item.additions.join("・")}</span>` : ""}
      </div>
    </article>
  `;
}

function section(title, items, className) {
  if (!items.length) return "";
  return `
    <section class="warn-section is-${className}">
      <h2>${title}（${items.length}）</h2>
      <div class="warn-grid">${items.map(card).join("")}</div>
    </section>
  `;
}

function paintWarnings(ctx, data) {
  const groups = groupItems(data.items || []);
  paintWarningMap(ctx, data.items || []);
  if (ctx.els.stage) ctx.els.stage.hidden = true;
  const hint = ctx.els.panel.querySelector(".wx-hint");
  if (hint) hint.textContent = data.headlineText || ctx.content.description;
  const board = data.empty
    ? emptyPanel(`現在、この地域に発表中の気象警報・注意報はありません`)
    : `
      <div class="count-row">
        <div><em>特別警報</em><strong>${groups.special.length}</strong></div>
        <div><em>警報</em><strong>${groups.warning.length}</strong></div>
        <div><em>注意報</em><strong>${groups.advisory.length}</strong></div>
      </div>
      <div class="warn-board">
        ${section("特別警報", groups.special, "special")}
        ${section("警報", groups.warning, "warning")}
        ${section("注意報", groups.advisory, "advisory")}
      </div>
    `;
  fillPanelBody(ctx.els.panel, board);
  fillTimes(ctx.els.panel, { reportAt: data.reportAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" });
}

export async function renderWarnings(ctx) {
  const data = await loadWarnings(ctx.prefecture, {
    onCached: (cached) => paintWarnings(ctx, cached)
  });
  if (data.ok || data.items?.length) {
    paintWarnings(ctx, data);
    return data;
  }
  if (ctx.els.panel.querySelector(".warn-board, .count-row")) return data;
  fillPanelBody(ctx.els.panel, errorPanel(data.message));
  fillTimes(ctx.els.panel, { reportAt: null, fetchedAt: data.fetchedAt, fromCache: false, reportLabel: "発表時刻" });
  return data;
}
