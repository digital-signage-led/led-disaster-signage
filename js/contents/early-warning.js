import { loadEarlyWarning } from "../services/early-warning.js";
import { emptyPanel, errorPanel, timesBlock } from "./shared-ui.js";

function cell(rank) {
  if (rank === "high") return `<strong class="is-high">高</strong>`;
  if (rank === "mid") return `<strong class="is-mid">中</strong>`;
  return `<span class="is-none">—</span>`;
}

export async function renderEarlyWarning(ctx) {
  const data = await loadEarlyWarning(ctx.prefecture);
  if (!data.ok && !data.rows?.length) {
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">早期注意情報</div>
      <div class="panel-area">${ctx.prefecture.name}</div>
      ${errorPanel(data.message)}
      ${timesBlock({ reportAt: null, fetchedAt: data.fetchedAt, fromCache: false, reportLabel: "発表時刻" })}
    `;
    return data;
  }

  const periods = data.periods.length ? data.periods : ["対象期間"];
  const areas = [...new Set(data.rows.map((row) => row.areaName || ctx.prefecture.name))];
  const phenomena = [...new Set(data.rows.map((row) => row.phenomenon))];

  if (data.empty) {
    ctx.els.stage.innerHTML = emptyPanel(`現在、この地域に発表中の早期注意情報（警報級の可能性）はありません`);
  } else {
    ctx.els.stage.innerHTML = areas.map((areaName) => {
      const rows = phenomena.map((phenomenon) => {
        const cells = periods.map((period) => {
          const hit = data.rows.find((row) => row.areaName === areaName && row.phenomenon === phenomenon && row.periodLabel === period)
            || data.rows.find((row) => row.areaName === areaName && row.phenomenon === phenomenon);
          return `<td>${cell(hit?.rank)}</td>`;
        }).join("");
        return `<tr><th>${phenomenon}</th>${cells}</tr>`;
      }).join("");
      return `
        <section class="early-block">
          <h2>${areaName}</h2>
          <table class="early-table">
            <thead><tr><th>現象</th>${periods.map((period) => `<th>${period}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      `;
    }).join("");
  }

  ctx.els.panel.innerHTML = `
    <div class="panel-kicker">早期注意情報</div>
    <div class="panel-area">${ctx.prefecture.name}</div>
    <p class="wx-hint">気象庁が［高］［中］で示す、警報級の現象となる可能性です。独自の危険度判定はしていません。</p>
    <div class="legend">
      <span class="legend-step"><i style="background:#c62828"></i>高</span>
      <span class="legend-step"><i style="background:#f9a825"></i>中</span>
    </div>
    ${timesBlock({ reportAt: data.reportAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "発表時刻" })}
  `;
  return data;
}
