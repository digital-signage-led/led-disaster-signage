import { getContent } from "./data/contents.js";
import { getPrefecture } from "./data/prefectures.js";
import { bindAutoFit, mountSignage, refreshDelayFor } from "./signage-view.js";
import { PREVIEW_SETTINGS_KEY } from "./store.js";
import { applyDesignTokens } from "./viewport.js";

function readPreviewSettings() {
  const params = new URLSearchParams(location.search);
  if (params.get("preview") !== "1") return undefined;
  try {
    const raw = sessionStorage.getItem(PREVIEW_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

const params = new URLSearchParams(location.search);
const content = getContent(params.get("content") || "weather_warning");
const prefecture = content.locationScope === "national"
  ? getPrefecture("national")
  : getPrefecture(params.get("prefecture") || params.get("pref") || params.get("region") || "tokyo");

document.title = `${prefecture.name}｜${content.name}`;
document.documentElement.classList.remove("is-boot");

const root = document.getElementById("app");
let session = null;
let fitOff = null;
let timer = 0;
let refreshing = false;

async function render() {
  if (refreshing) return;
  refreshing = true;
  try {
    if (session) {
      session.destroy();
      if (session.map) {
        try { session.map.destroy(); } catch { /* ignore */ }
      }
    }
    root.innerHTML = "";
    session = await mountSignage(root, {
      prefecture: prefecture.slug,
      content: content.id,
      settings: readPreviewSettings()
    });
    if (fitOff) fitOff();
    fitOff = bindAutoFit(session.els.screen);
  } catch (error) {
    console.error(error);
    if (!root.querySelector(".led-screen")) {
      root.innerHTML = `<article class="led-screen"><div class="data-error">画面を表示できませんでした</div></article>`;
    }
  } finally {
    refreshing = false;
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    await render();
    schedule();
  }, refreshDelayFor(content.id));
}

await render();
schedule();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin) return;
  if (event.data?.type !== "disaster-preview-tokens" || !session?.els) return;
  const common = event.data.common || {};
  applyDesignTokens(session.els.screen, { common });
  session.els.stamp.hidden = common.showStamp === false;
  session.els.point.hidden = common.showPoint === false;
  session.els.panel.hidden = common.showPanel === false;
  session.els.attr.hidden = common.showAttribution === false;
  session.els.title.hidden = common.showTitle === false;
  session.els.screen.classList.toggle("is-panel-off", common.showPanel === false);
  session.els.screen.classList.toggle("is-legend-off", common.showLegend === false);
});

window.addEventListener("beforeunload", () => {
  window.clearTimeout(timer);
  if (session) session.destroy();
});
