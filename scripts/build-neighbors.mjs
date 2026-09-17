import fs from "node:fs";

const src = process.argv[2];
const dest = process.argv[3];
const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const keep = new Set([
  "China",
  "Taiwan",
  "South Korea",
  "North Korea",
  "Russia",
  "Mongolia",
  "Vietnam",
  "Laos",
  "Cambodia",
  "Thailand",
  "Philippines"
]);

function nameOf(feature) {
  return feature.properties.ADMIN || feature.properties.NAME || feature.properties.name || "";
}

function walk(coords, fn) {
  if (typeof coords[0] === "number") fn(coords);
  else coords.forEach((item) => walk(item, fn));
}

function ringOk(ring) {
  let east = 0;
  let west = 0;
  for (const pt of ring) {
    const lng = pt[0];
    if (lng > 90 && lng <= 180) east += 1;
    else west += 1;
  }
  return east >= west && east > 0;
}

function filterCoords(geom, forRussia) {
  if (geom.type === "Polygon") {
    const rings = geom.coordinates.filter((ring) => !forRussia || ringOk(ring));
    return rings.length ? { type: "Polygon", coordinates: rings } : null;
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates
      .map((poly) => poly.filter((ring) => !forRussia || ringOk(ring)))
      .filter((poly) => poly.length && poly[0].length >= 4);
    if (!polys.length) return null;
    return { type: "MultiPolygon", coordinates: polys };
  }
  return null;
}

const features = [];
for (const feature of raw.features) {
  const name = nameOf(feature);
  if (!keep.has(name)) continue;
  const geom = filterCoords(feature.geometry, name === "Russia");
  if (!geom) continue;
  features.push({
    type: "Feature",
    properties: { name },
    geometry: geom
  });
}

const out = { type: "FeatureCollection", features };
fs.writeFileSync(dest, `${JSON.stringify(out)}\n`);
console.log(features.map((f) => f.properties.name).join(", "));
console.log("bytes", fs.statSync(dest).size);
