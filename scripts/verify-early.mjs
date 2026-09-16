import { PREFECTURES } from "../js/data/prefectures.js";
import { loadEarlyWarning } from "../js/services/early-warning.js";

for (const slug of ["tokyo", "mie", "osaka", "okinawa"]) {
  const pref = PREFECTURES.find((item) => item.slug === slug);
  const data = await loadEarlyWarning(pref);
  console.log(slug, {
    ok: data.ok,
    empty: data.empty,
    rows: data.rows?.length,
    periods: data.periods,
    sample: data.rows?.[0],
    error: data.error || data.cacheError
  });
}
