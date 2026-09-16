import { loadTornadoNowcast, TORNADO_LEGEND } from "../services/tornado-nowcast.js";
import { errorPanel, legendHtml, playController, timesBlock } from "./shared-ui.js";
import { formatStamp } from "../services/jma-common.js";

export async function renderTornadoNowcast(ctx) {
  const data = await loadTornadoNowcast(ctx.prefecture);
  ctx.els.screen.classList.add("is-map");
  ctx.els.stage.hidden = true;
  if (!data.ok || !data.frames.length) {
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">竜巻発生確度ナウキャスト</div>
      <div class="panel-area">${ctx.prefecture.name}</div>
      ${errorPanel(data.message)}
      ${timesBlock({ reportAt: null, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "データ時刻" })}
    `;
    return data;
  }
  const playMs = Number(ctx.contentSettings.playMs || 2000);
  const player = playController({
    frames: data.frames,
    playMs,
    onFrame(frame, index, total) {
      ctx.map.setTileOverlay(frame.tileUrl);
      ctx.els.point.textContent = `${formatStamp(frame.date)}　${index + 1}/${total}`;
    }
  });
  ctx.addCleanup(() => {
    player.stop();
    ctx.map.clearTileOverlay();
  });
  ctx.els.panel.innerHTML = `
    <div class="panel-kicker">竜巻発生確度</div>
    <div class="panel-area">${ctx.prefecture.name}</div>
    <p class="wx-hint">気象庁の竜巻発生確度ナウキャストです。確度の意味は公式解説のままです。</p>
    <div class="legend">${legendHtml(TORNADO_LEGEND)}</div>
    <p class="wx-hint">${TORNADO_LEGEND.map((step) => `${step.label}：${step.meaning}`).join("　")}</p>
    ${timesBlock({ reportAt: data.dataUpdatedAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "データ時刻" })}
  `;
  return data;
}
