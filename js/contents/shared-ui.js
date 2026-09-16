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
      ${fromCache ? `<div class="cache-note">前回取得データを表示</div>` : ""}
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

export function playController({ frames, playMs, onFrame, holdMs = 2400 }) {
  let index = 0;
  let timer = 0;
  let stopped = false;

  const step = () => {
    if (stopped || !frames.length) return;
    onFrame(frames[index], index, frames.length);
    const isLast = index === frames.length - 1;
    const delay = isLast ? holdMs : (playMs || 1800);
    index = (index + 1) % frames.length;
    timer = window.setTimeout(step, Math.max(1200, delay));
  };

  step();
  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
    }
  };
}
