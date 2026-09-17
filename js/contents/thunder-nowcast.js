import { loadThunderNowcast } from "../services/thunder-nowcast.js";
import { errorPanel, fillPanelBody, fillTimes, playController } from "./shared-ui.js";
import { formatStamp } from "../services/jma-common.js";

function prefetchAround(map, frames, index) {
  if (!map?.prefetchTiles || !frames?.length) return;
  const prev = frames[(index - 1 + frames.length) % frames.length];
  const next = frames[(index + 1) % frames.length];
  const after = frames[(index + 2) % frames.length];
  [prev, next, after].forEach((frame) => {
    if (frame?.tileUrl) map.prefetchTiles(frame.tileUrl);
  });
}

function paintThunder(ctx, data) {
  ctx.els.screen.classList.add("is-map");
  ctx.els.stage.hidden = true;
  fillTimes(ctx.els.panel, {
    reportAt: data.dataUpdatedAt,
    fetchedAt: data.fetchedAt,
    fromCache: data.fromCache,
    reportLabel: "データ時刻"
  });
  if (!data.ok || !data.frames.length) {
    if (!ctx.els.panel.querySelector(".legend")) fillPanelBody(ctx.els.panel, errorPanel(data.message));
    return;
  }
  fillPanelBody(ctx.els.panel, "");
  if (ctx._player) ctx._player.stop();
  const playMs = Number(ctx.contentSettings.playMs || 2000);
  const nowIndex = data.frames.findIndex((frame) => frame.validtime === frame.basetime);
  ctx._player = playController({
    frames: data.frames,
    playMs,
    holdMs: 3200,
    startIndex: nowIndex >= 0 ? nowIndex : 0,
    onFrame(frame, index, total) {
      ctx.map.setTileOverlay(frame.tileUrl);
      ctx.els.point.textContent = `${formatStamp(frame.date)}　${index + 1}/${total}`;
    },
    onPrefetch(next, after, current) {
      const index = data.frames.indexOf(current);
      prefetchAround(ctx.map, data.frames, index >= 0 ? index : 0);
      if (next?.tileUrl) ctx.map.prefetchTiles(next.tileUrl);
      if (after?.tileUrl) ctx.map.prefetchTiles(after.tileUrl);
    }
  });
  if (!ctx._playerBound) {
    ctx._playerBound = true;
    ctx.addCleanup(() => {
      ctx._player?.stop();
      ctx.map.clearTileOverlay();
    });
  }
}

export async function renderThunderNowcast(ctx) {
  const data = await loadThunderNowcast(ctx.prefecture, {
    onCached: (cached) => paintThunder(ctx, cached)
  });
  if (data.ok && data.frames.length) {
    paintThunder(ctx, data);
    return data;
  }
  if (ctx._player) return data;
  fillPanelBody(ctx.els.panel, errorPanel(data.message));
  fillTimes(ctx.els.panel, { reportAt: null, fetchedAt: data.fetchedAt, fromCache: data.fromCache, reportLabel: "データ時刻" });
  return data;
}
