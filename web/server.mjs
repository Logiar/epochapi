import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? "3000");
const root = join(process.cwd(), "dist");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(requestPath) {
  const normalized = normalize(requestPath).replace(/^\/+/, "");
  return normalized.startsWith("..") ? "" : normalized;
}

function resolveFile(pathname) {
  const relative = safePath(pathname);
  if (!relative) return join(root, "index.html");

  const exact = join(root, relative);
  if (existsSync(exact) && statSync(exact).isFile()) {
    return exact;
  }

  const nestedIndex = join(root, relative, "index.html");
  if (existsSync(nestedIndex)) {
    return nestedIndex;
  }

  const htmlVariant = join(root, `${relative}.html`);
  if (existsSync(htmlVariant)) {
    return htmlVariant;
  }

  return join(root, "index.html");
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  const filePath = resolveFile(url.pathname);
  const extension = extname(filePath);
  const contentType = contentTypes[extension] ?? "application/octet-stream";

  res.writeHead(200, {
    "cache-control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    "content-type": contentType,
    "x-content-type-options": "nosniff",
  });

  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`docs server listening on http://${host}:${port}`);
});
