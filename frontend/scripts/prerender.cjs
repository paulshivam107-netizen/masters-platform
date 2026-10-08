// Build public HTML with the same React components visitors see. No browser, API or credentials.
process.env.NODE_ENV = "production";
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToString } = require("react-dom/server");
const babel = require("@babel/core");
const src = path.resolve(__dirname, "../src");
const build = path.resolve(
  process.env.PRERENDER_OUTPUT_DIR || path.join(__dirname, "../build"),
);
const originalJs = require.extensions[".js"];
require.extensions[".css"] = () => {};
require.extensions[".js"] = (module, filename) => {
  if (!filename.startsWith(src + path.sep)) return originalJs(module, filename);
  const result = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    presets: [require.resolve("@babel/preset-react")],
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  });
  module._compile(result.code, filename);
};
const config = require("../src/content/site");
const {
  publicPages,
  publicOrigin,
  metadata,
  safeJson,
  robots,
} = require("../src/seo/metadata");
const StaticSite = require("../src/seo/StaticSite").default;
if (config.allowIndexing && !publicOrigin(config.siteUrl))
  throw new Error(
    "Indexing requires REACT_APP_SITE_URL to be a public HTTPS origin, with no path, credentials, port, query or fragment.",
  );
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const templatePath = path.join(build, ".public-template.html");
if (!fs.existsSync(templatePath))
  fs.copyFileSync(path.join(build, "index.html"), templatePath);
const template = fs.readFileSync(templatePath, "utf8");
function html(route, body) {
  const m = metadata(route);
  const head = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<meta name="robots" content="${m.robots}">`,
    ...Object.entries({
      title: m.title,
      description: m.description,
      type: m.type,
      url: m.canonical,
      image: m.image,
    })
      .filter(([, v]) => v)
      .map(([key, v]) => `<meta property="og:${key}" content="${esc(v)}">`),
    `<meta name="twitter:card" content="${m.image ? "summary_large_image" : "summary"}">`,
    ...(m.canonical
      ? [`<link rel="canonical" href="${esc(m.canonical)}">`]
      : []),
    ...(m.jsonLd
      ? [
          `<script id="site-structured-data" type="application/ld+json">${safeJson(m.jsonLd)}</script>`,
        ]
      : []),
  ].join("");
  return template
    .replace(/<title>.*?<\/title>/s, "")
    .replace(
      /<meta\b(?=[^>]*\bname=["'](?:description|robots)["'])[^>]*>/gi,
      "",
    )
    .replace("</head>", head + "</head>")
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}
fs.writeFileSync(path.join(build, "app-shell.html"), html("/app", ""));
for (const route of [...Object.keys(publicPages), "/programs", "/404"]) {
  const body = renderToString(React.createElement(StaticSite, { path: route }));
  const target =
    route === "/"
      ? path.join(build, "index.html")
      : route === "/404"
        ? path.join(build, "404.html")
        : path.join(build, route.slice(1), "index.html");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html(route, body));
}
fs.writeFileSync(path.join(build, "robots.txt"), robots());
const origin = publicOrigin(config.siteUrl);
const urls =
  config.allowIndexing && origin
    ? Object.entries(publicPages)
        .map(
          ([route, page]) =>
            `<url><loc>${esc(origin + route)}</loc>${page.updated ? `<lastmod>${page.updated}</lastmod>` : ""}</url>`,
        )
        .join("")
    : "";
fs.writeFileSync(
  path.join(build, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
);
console.log(
  `Rendered ${Object.keys(publicPages).length} public pages, catalogue and 404. Search indexing: ${config.allowIndexing && origin ? "enabled" : "disabled (preview)"}.`,
);
