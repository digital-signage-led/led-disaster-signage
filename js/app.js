import { getContent } from "./data/contents.js";
import { getPrefecture } from "./data/prefectures.js";
import { bindAutoFit, mountSignage, refreshDelayFor } from "./signage-view.js";

const params = new URLSearchParams(location.search);
const prefecture = getPrefecture(params.get("prefecture") || params.get("pref") || params.get("region") || "tokyo");
const content = getContent(params.get("content") || "weather_warning");

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
      content: content.id
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

window.addEventListener("beforeunload", () => {
  window.clearTimeout(timer);
  if (session) session.destroy();
});
