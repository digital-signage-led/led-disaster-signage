import { loadWarnings } from "../services/warnings.js";
import { emptyPanel, errorPanel, timesBlock } from "./shared-ui.js";

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

export async function renderWarnings(ctx) {
  const data = await loadWarnings(ctx.prefecture);
  const groups = groupItems(data.items || []);
  if (!data.ok && !data.items?.length) {
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">気象警報・注意報</div>
      <div class="panel-area">${ctx.prefecture.name}</div>
      ${errorPanel(data.message)}
      ${timesBlock({ reportAt: null, fetchedAt: data.fetchedAt, fromCache: false, reportLabel: "発表時刻" })}
    `;
    return data;
  }
  if (data.empty) {
    ctx.els.stage.innerHTML = emptyPanel(`現在、この地域に発表中の気象警報・注意報はありません`);
  } else {
    ctx.els.stage.innerHTML = `
      <div class="warn-board">
        ${section("特別警報", groups.special, "special")}
        ${section("警報", groups.warning, "warning")}
        ${section("注意報", groups.advisory, "advisory")}
      </div>
    `;
  }
  ctx.els.panel.innerHTML = `
    <div class="panel-kicker">気象警報・注意報</div>
    <div class="panel-area">${ctx.prefecture.name}</div>
    <p class="wx-hint">${data.headlineText || ctx.content.description}</p>
    <div class="count-row">
      <div><em>特別警報</em><strong>${groups.special.length}</strong></div>
      <div><em>警報</em><strong>${groups.warning.length}</strong></div>
      <div><em>注意報</em><strong>${groups.advisory.length}</strong></div>
    </div>
    ${timesBlock({ reportAt: data.reportAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
  `;
  return data;
}
