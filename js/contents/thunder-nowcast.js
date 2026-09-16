import { loadThunderNowcast, THUNDER_LEGEND } from "../services/thunder-nowcast.js";
import { errorPanel, legendHtml, playController, timesBlock } from "./shared-ui.js";
import { formatStamp } from "../services/jma-common.js";

export async function renderThunderNowcast(ctx) {
  const data = await loadThunderNowcast(ctx.prefecture);
  ctx.els.screen.classList.add("is-map");
  ctx.els.stage.hidden = true;
  if (!data.ok || !data.frames.length) {
    ctx.els.panel.innerHTML = `
      <div class="panel-kicker">雷ナウキャスト</div>
      <div class="panel-area">${ctx.prefecture.name}</div>
      ${errorPanel(data.message)}
      ${timesBlock({ reportAt: null, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "データ時刻" })}
    `;
    return data;
  }
  const playMs = Number(ctx.contentSettings.playMs || 2000);
  const nowIndex = data.frames.findIndex((frame) => frame.validtime === frame.basetime);
  const player = playController({
    frames: data.frames,
    playMs,
    holdMs: 3200,
    startIndex: nowIndex >= 0 ? nowIndex : 0,
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
    <div class="panel-kicker">雷ナウキャスト</div>
    <div class="panel-area">${ctx.prefecture.name}</div>
    <p class="wx-hint">気象庁の雷ナウキャストです。色は公式の活動度です。この地域に雷がなければ地図は無色のままです。</p>
    <div class="legend">${legendHtml(THUNDER_LEGEND)}</div>
    ${timesBlock({ reportAt: data.dataUpdatedAt, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "データ時刻" })}
  `;
  return data;
}
