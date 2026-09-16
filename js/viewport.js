/** 天気予報サイネージと同じ固定設計解像度。勝手に変えない。 */
export const FIXED_DESIGN = { width: 1920, height: 1080 };

export function readWindowSize() {
  const w = window.innerWidth || document.documentElement.clientWidth || FIXED_DESIGN.width;
  const h = window.innerHeight || document.documentElement.clientHeight || FIXED_DESIGN.height;
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
}

export function fitFixedScreen(element, designW = FIXED_DESIGN.width, designH = FIXED_DESIGN.height) {
  if (!element) return 1;
  const win = readWindowSize();
  const scale = Math.min(win.width / designW, win.height / designH);
  const ox = (win.width - designW * scale) / 2;
  const oy = (win.height - designH * scale) / 2;
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.width = `${designW}px`;
  element.style.height = `${designH}px`;
  element.style.transformOrigin = "0 0";
  element.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
  element.style.setProperty("--fit-scale", String(scale));
  return scale;
}

export function applyDesignTokens(element, settings = {}) {
  if (!element) return;
  const common = settings.common || {};
  element.style.setProperty("--title-scale", String(common.titleSize ?? 1));
  element.style.setProperty("--title-x", `${common.titleX ?? 0}px`);
  element.style.setProperty("--title-y", `${common.titleY ?? 0}px`);
  element.style.setProperty("--map-scale", String(common.mapScale ?? 1));
  element.style.setProperty("--map-x", `${common.mapX ?? 0}px`);
  element.style.setProperty("--map-y", `${common.mapY ?? 0}px`);
  element.style.setProperty("--font-scale", String(common.fontSize ?? 1));
  element.style.setProperty("--panel-x", `${common.panelX ?? 0}px`);
  element.style.setProperty("--panel-y", `${common.panelY ?? 0}px`);
  element.style.setProperty("--pad-scale", String(common.padding ?? 1));
}
