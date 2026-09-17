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

export function staticPanel({ kicker, area, hint = "", legend = "" }) {
  return `
    <div class="panel-kicker">${kicker}</div>
    <div class="panel-area">${area}</div>
    ${hint ? `<p class="wx-hint">${hint}</p>` : ""}
    ${legend}
    <div class="panel-body"></div>
    <div class="time-grid">
      <div><span class="k">更新時刻</span><strong>—</strong></div>
      <div><span class="k">画面取得</span><strong>—</strong></div>
    </div>
  `;
}

export function fillPanelBody(panel, html) {
  if (!panel) return;
  let body = panel.querySelector(".panel-body");
  if (!body) {
    body = document.createElement("div");
    body.className = "panel-body";
    const times = panel.querySelector(".time-grid");
    if (times) times.before(body);
    else panel.appendChild(body);
  }
  if (body.innerHTML !== html) body.innerHTML = html;
}

export function fillTimes(panel, opts) {
  if (!panel) return;
  const current = panel.querySelector(".time-grid");
  const wrap = document.createElement("div");
  wrap.innerHTML = timesBlock(opts).trim();
  const next = wrap.firstElementChild;
  if (!next) return;
  if (current) current.replaceWith(next);
  else panel.appendChild(next);
}

export function playController({ frames, playMs, onFrame, holdMs = 2400, startIndex = 0, onPrefetch = null }) {
  let index = Math.max(0, Math.min(frames.length - 1, Number(startIndex) || 0));
  let timer = 0;
  let stopped = false;

  const step = () => {
    if (stopped || !frames.length) return;
    const frame = frames[index];
    try {
      onFrame(frame, index, frames.length);
      if (onPrefetch) {
        const next = frames[(index + 1) % frames.length];
        const after = frames[(index + 2) % frames.length];
        onPrefetch(next, after, frame);
      }
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
