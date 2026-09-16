import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 5175);
const publishedPath = path.join(root, "data", "published-settings.json");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function allowedProxy(url) {
  try {
    const host = new URL(url).hostname;
    return host === "www.jma.go.jp" || host === "www.data.jma.go.jp" || host === "data.jma.go.jp";
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url || "/", "http://127.0.0.1");
  const urlPath = decodeURIComponent(parsed.pathname);

  if (req.method === "POST" && urlPath === "/api/published-settings") {
    try {
      const raw = await readBody(req);
      const json = JSON.parse(raw || "{}");
      fs.writeFileSync(publishedPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
    }
    return;
  }

  if (req.method === "GET" && urlPath === "/api/jma-proxy") {
    const target = parsed.searchParams.get("url") || "";
    if (!allowedProxy(target)) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Forbidden host");
      return;
    }
    try {
      const upstream = await fetch(target, { cache: "no-store" });
      const text = await upstream.text();
      res.writeHead(upstream.ok ? 200 : upstream.status, {
        "content-type": upstream.headers.get("content-type") || "text/plain; charset=utf-8",
        "cache-control": "no-store"
      });
      res.end(text);
    } catch (error) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(error?.message || error));
    }
    return;
  }

  const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(root, relative));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": TYPES[ext] || "application/octet-stream", "cache-control": "no-store" });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Disaster signage: http://127.0.0.1:${port}/`);
  console.log(`Admin: http://127.0.0.1:${port}/admin.html`);
});
