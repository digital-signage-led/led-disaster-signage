import { PREFECTURES } from "../js/data/prefectures.js";
import { loadWarnings } from "../js/services/warnings.js";
import { loadTyphoons } from "../js/services/typhoon.js";
import { loadThunderNowcast } from "../js/services/thunder-nowcast.js";
import { loadTornadoNowcast } from "../js/services/tornado-nowcast.js";

const tokyo = PREFECTURES.find((item) => item.slug === "tokyo");
const osaka = PREFECTURES.find((item) => item.slug === "osaka");

function report(name, data) {
  console.log(`${name}: ok=${data.ok} empty=${!!data.empty} cache=${!!data.fromCache} items=${data.items?.length ?? data.storms?.length ?? data.frames?.length ?? data.rows?.length ?? 0}`);
  if (data.error) console.log("  error", data.error);
  if (data.headlineText) console.log("  headline", data.headlineText);
  if (data.items?.[0]) console.log("  sample", data.items[0].classLabel, data.items[0].name, data.items[0].areaName);
  if (data.storms?.[0]) console.log("  storm", data.storms[0].category, data.storms[0].location, data.storms[0].pressure);
}

const warningTokyo = await loadWarnings(tokyo);
const warningOsaka = await loadWarnings(osaka);
const typhoon = await loadTyphoons();
const thunder = await loadThunderNowcast(tokyo);
const tornado = await loadTornadoNowcast(osaka);

report("warning tokyo", warningTokyo);
report("warning osaka", warningOsaka);
report("typhoon", typhoon);
report("thunder", thunder);
report("tornado", tornado);

if (!warningTokyo.ok && !warningTokyo.fromCache) throw new Error("tokyo warnings failed");
if (!warningOsaka.ok && !warningOsaka.fromCache) throw new Error("osaka warnings failed");
if (!typhoon.ok && !typhoon.fromCache) throw new Error("typhoon failed");
if (!thunder.ok && !thunder.frames?.length) throw new Error("thunder failed");
if (!tornado.ok && !tornado.frames?.length) throw new Error("tornado failed");

console.log("live sources ok");
