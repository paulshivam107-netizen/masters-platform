// Small static preview/reference server that mirrors the production host's routing
// (public/_redirects + public/_headers on Cloudflare Pages): "/x" serves x.html, "/x.html"
// and "/x/" redirect to "/x", /app and /auth routes get the noindex app shell, and unknown
// paths return the real 404 page. Put HTTPS and deployment controls in the chosen host.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../build");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
http
  .createServer((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (
      pathname.includes("\0") ||
      pathname.split("/").some((segment) => segment.startsWith(".")) ||
      pathname.includes("\\")
    ) {
      res.writeHead(400);
      return res.end();
    }
    const clean = pathname.replace(/\/+$/, "") || "/";
    const privateRoute =
      clean === "/auth" ||
      clean.startsWith("/auth/") ||
      clean === "/app" ||
      clean.startsWith("/app/");
    if (!privateRoute && clean.endsWith(".html") && clean !== "/404.html") {
      res.writeHead(308, {
        Location:
          (clean.replace(/(\/index)?\.html$/, "") || "/") +
          new URL(req.url, "http://localhost").search,
      });
      return res.end();
    }
    const isFile = (f) => fs.existsSync(f) && fs.statSync(f).isFile();
    let filename = privateRoute
      ? path.join(root, "app-shell.html")
      : clean === "/"
        ? path.join(root, "index.html")
        : isFile(path.join(root, clean + ".html"))
          ? path.join(root, clean + ".html")
          : path.join(root, clean);
    let status = 200;
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      status = 404;
      filename = path.join(root, "404.html");
    }
    if (status === 200 && pathname !== clean) {
      res.writeHead(301, {
        Location: clean + new URL(req.url, "http://localhost").search,
      });
      return res.end();
    }
    const ext = path.extname(filename);
    const headers = {
      "Content-Type": types[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": clean.startsWith("/static/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    };
    if (
      privateRoute ||
      status === 404 ||
      clean === "/programs" ||
      clean === "/app-shell.html"
    )
      headers["X-Robots-Tag"] = "noindex, nofollow";
    res.writeHead(status, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filename).pipe(res);
  })
  .listen(Number(process.env.PORT || 3181), "127.0.0.1", () =>
    console.log("Static preview listening on " + (process.env.PORT || 3181)),
  );
