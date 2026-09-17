import { formatClock, formatStamp } from "../services/jma-common.js";

export function timesBlock({ reportAt, fetchedAt, fromCache, reportLabel = "発表時刻" }) {
  return `
    <div class="time-grid">
      <div>
        <span class="k">${reportLabel}</span>
        <strong>${formatStamp(reportAt)}</strong>
      </div>
      <div>
        <span class="k">画面取得</span>
        <strong>${formatClock(fetchedAt)}</strong>
      </div>
      ${fromCache ? `<div class="cache-note">更新停止中（前回取得データを表示）</div>` : ""}
    </div>
  `;
}

export function errorPanel(message) {
  return `<div class="data-error">${message || "防災情報を取得できませんでした"}</div>`;
}

export function emptyPanel(message) {
  return `<div class="data-empty">${message}</div>`;
}

export function legendHtml(steps) {
  return steps.map((step) => (
    `<span class="legend-step"><i style="background:${step.color}"></i>${step.label}</span>`
  )).join("");
}

export function playController({ frames, playMs, onFrame, holdMs = 2400, startIndex = 0 }) {
  let index = Math.max(0, Math.min(frames.length - 1, Number(startIndex) || 0));
  let timer = 0;
  let stopped = false;

  const step = () => {
    if (stopped || !frames.length) return;
    const frame = frames[index];
    try {
      onFrame(frame, index, frames.length);
    } catch (error) {
      console.error(error);
    }
    const isNow = frame?.step?.kind === "now"
      || (frame?.validtime && frame.validtime === frame.basetime && frame?.step?.kind !== "forecast");
    const isLast = index === frames.length - 1;
    const wait = Number(isLast || isNow ? holdMs : playMs);
    index = (index + 1) % frames.length;
    timer = window.setTimeout(step, Math.max(1600, Number.isFinite(wait) ? wait : 2200));
  };

  step();
  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
    }
  };
}
