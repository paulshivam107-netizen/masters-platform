#!/usr/bin/env node
// Verify a deployed (or locally served) frontend routes the way production should:
//   npm run check:routes -- https://www.yourdomain.in
//   npm run check:routes -- http://127.0.0.1:3181
//   npm run check:routes -- https://<branch>.<project>.pages.dev --preview
// --preview: the build has indexing disabled, so every page must be noindex.
// Exits non-zero on any mismatch. Read-only GET requests only.
const preview = process.argv.includes("--preview");
const base = (
  process.argv.slice(2).find((a) => !a.startsWith("--")) || ""
).replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: node scripts/check-routes.cjs <base-url>");
  process.exit(2);
}
const guide = "/guides/mba-interview-story-bank";
const checks = [
  // [path, expected status(es), expected Location for redirects, "index" | "noindex"]
  ["/", 200, null, "index"],
  ["/guides", 200, null, "index"],
  [guide, 200, null, "index"],
  ["/help", 200, null, "index"],
  ["/mba-interview-practice", 200, null, "index"],
  ["/guides/mba-interview-from-resume", 200, null, "index"],
  ["/guides/mba-interview-for-freshers", 200, null, "index"],
  ["/guides/mba-interview-work-experience", 200, null, "index"],
  [guide + "/", [301, 308], guide],
  [guide + ".html", [301, 308], guide],
  ["/programs", 200, null, "noindex"],
  ["/app", 200, null, "noindex"],
  ["/app/interviews", 200, null, "noindex"],
  ["/auth", 200, null, "noindex"],
  ["/auth/verify-email", 200, null, "noindex"],
  ["/auth/reset-password", 200, null, "noindex"],
  ["/this-page-does-not-exist", 404, null, "noindex"],
  ["/guides/not-a-real-guide", 404, null, "noindex"],
  ["/robots.txt", 200],
  ["/sitemap.xml", 200],
];

function robotsOf(res, html) {
  const header = res.headers.get("x-robots-tag") || "";
  const meta = (html.match(/<meta[^>]+name=["']robots["'][^>]*>/i) || [""])[0];
  return /noindex/i.test(header + meta) ? "noindex" : "index";
}

(async () => {
  let failures = 0;
  for (const [path, status, location, robots] of checks) {
    const res = await fetch(base + path, { redirect: "manual" });
    const html =
      res.status === 200 || res.status === 404 ? await res.text() : "";
    const problems = [];
    const okStatus = Array.isArray(status)
      ? status.includes(res.status)
      : res.status === status;
    if (!okStatus) problems.push(`status ${res.status}, expected ${status}`);
    if (location) {
      const got = (res.headers.get("location") || "").replace(base, "");
      if (got !== location)
        problems.push(`location ${got || "(none)"}, expected ${location}`);
    }
    const wantRobots = preview && robots ? "noindex" : robots;
    if (wantRobots && robotsOf(res, html) !== wantRobots)
      problems.push(`robots ${robotsOf(res, html)}, expected ${wantRobots}`);
    if (robots === "index" && !preview) {
      const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) ||
        [])[1];
      if (canonical && new URL(canonical).pathname !== path)
        problems.push(`canonical ${canonical} does not match ${path}`);
    }
    if (problems.length) failures += 1;
    console.log(
      `${problems.length ? "FAIL" : "ok  "} ${String(res.status).padEnd(4)} ${path}` +
        (problems.length ? `  <- ${problems.join("; ")}` : ""),
    );
  }
  console.log(
    failures
      ? `\n${failures} route check(s) failed.`
      : "\nAll route checks passed.",
  );
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
