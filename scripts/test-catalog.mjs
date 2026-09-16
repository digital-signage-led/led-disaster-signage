import assert from "node:assert/strict";
import { CONTENTS, canonicalContent } from "../js/data/contents.js";
import { PREFECTURES, canonicalPrefecture, regionOf } from "../js/data/prefectures.js";

assert.equal(PREFECTURES.length, 47);
assert.equal(CONTENTS.length, 5);
assert.deepEqual(CONTENTS.map((c) => c.id), [
  "weather_warning",
  "early_warning",
  "typhoon",
  "lightning_nowcast",
  "tornado_nowcast"
]);
assert.equal(new Set(PREFECTURES.map((p) => p.slug)).size, 47);

for (const pref of PREFECTURES) {
  assert.ok(pref.id && pref.slug && pref.name && pref.region);
  assert.ok(Number.isFinite(pref.centerLatitude));
  assert.ok(Number.isFinite(pref.centerLongitude));
  assert.ok(pref.defaultZoom >= 6 && pref.defaultZoom <= 11);
  assert.ok(pref.dataId);
  assert.ok(regionOf(pref.slug).id === pref.region);
}

assert.equal(canonicalPrefecture("TOKYO"), "tokyo");
assert.equal(canonicalContent("warning"), "weather_warning");
assert.equal(canonicalContent("thunder"), "lightning_nowcast");
assert.equal(PREFECTURES.length * CONTENTS.length, 235);

console.log("catalog ok: 47 prefectures, 5 disaster contents, 235 URLs");
