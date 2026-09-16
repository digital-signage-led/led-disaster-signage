import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFECTURES } from "../js/data/prefectures.js";
import { loadEarlyWarning } from "../js/services/early-warning.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "data", "early-warning-snapshot.json");
const rows = [];

for (const pref of PREFECTURES) {
  const data = await loadEarlyWarning(pref);
  for (const row of data.rows || []) {
    rows.push({ ...row, prefecture: pref.slug, reportAt: row.reportAt?.toISOString?.() || null });
  }
}

const json = {
  updatedAt: new Date().toISOString(),
  rows
};
fs.writeFileSync(outPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
console.log(`wrote ${rows.length} early-warning rows to ${outPath}`);
