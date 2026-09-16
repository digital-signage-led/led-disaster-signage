import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFECTURES } from "../js/data/prefectures.js";
import { loadEarlyWarning } from "../js/services/early-warning.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "data", "early-warning-snapshot.json");
const slugs = process.argv.slice(2);
const targets = slugs.length
  ? PREFECTURES.filter((pref) => slugs.includes(pref.slug))
  : PREFECTURES;
const rows = [];

for (const pref of targets) {
  const data = await loadEarlyWarning(pref);
  console.log(pref.slug, data.ok, data.rows?.length || 0);
  for (const row of data.rows || []) {
    rows.push({
      ...row,
      prefecture: pref.slug,
      reportAt: row.reportAt instanceof Date ? row.reportAt.toISOString() : row.reportAt || null
    });
  }
}

const json = {
  updatedAt: new Date().toISOString(),
  rows
};
fs.writeFileSync(outPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
console.log(`wrote ${rows.length} early-warning rows to ${outPath}`);
