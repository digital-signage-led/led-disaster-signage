import { getContent } from "./data/contents.js";
import { getPrefecture } from "./data/prefectures.js";
import { bindAutoFit, buildScreen, mountSignage, paintKnownUi, refreshDelayFor } from "./signage-view.js";
import { persistOfficialPublished, settingsForSignage, PREVIEW_SETTINGS_KEY } from "./store.js";
import { applyDesignTokens } from "./viewport.js";
import { warmupMap } from "./map/map-engine.js";

warmupMap();

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

function registerWorker() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url), { scope: "./" }).catch(() => {});
}

const params = new URLSearchParams(location.search);
const content = getContent(params.get("content") || "weather_warning");
const prefecture = content.locationScope === "national"
  ? getPrefecture("national")
  : getPrefecture(params.get("prefecture") || params.get("pref") || params.get("region") || "tokyo");
persistOfficialPublished();
const previewSettings = readPreviewSettings();
const published = previewSettings || settingsForSignage(prefecture.slug, content.id);

document.title = `${prefecture.name}｜${content.name}`;
document.documentElement.classList.remove("is-boot");

const root = document.getElementById("app");
const els = buildScreen(root);
paintKnownUi(els, prefecture, content, published);

let session = null;
let fitOff = null;
let timer = 0;
let refreshing = false;

async function start() {
  if (refreshing) return;
  refreshing = true;
  try {
    session = await mountSignage(root, {
      prefecture: prefecture.slug,
      content: content.id,
      settings: previewSettings,
      map: session?.map || els.mapCanvas._mapApi || null
    });
    if (fitOff) fitOff();
    fitOff = bindAutoFit(session.els.screen);
  } catch (error) {
    console.error(error);
  } finally {
    refreshing = false;
  }
}

async function refreshData() {
  if (!session?.refresh || refreshing) return;
  refreshing = true;
  try {
    await session.refresh();
  } catch (error) {
    console.error(error);
  } finally {
    refreshing = false;
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    await refreshData();
    schedule();
  }, refreshDelayFor(content.id));
}

registerWorker();
await start();
schedule();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshData();
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
