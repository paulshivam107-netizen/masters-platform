import {
  metadata,
  robots,
  publicOrigin,
  safeJson,
  publicPages,
} from "./metadata";
const live = {
  siteName: "Masters",
  siteUrl: "https://admissions-demo.org",
  allowIndexing: true,
};
test("preview stays out of indexes and never advertises localhost canonicals", () => {
  expect(
    metadata("/", { ...live, siteUrl: "http://localhost:3181" }).robots,
  ).toBe("noindex, follow");
  expect(metadata("/", { ...live, siteUrl: "" }).canonical).toBe("");
  expect(robots({ ...live, allowIndexing: false })).toBe(
    "User-agent: *\nDisallow: /\n",
  );
  for (const url of [
    "https://localhost",
    "https://127.0.0.1",
    "https://example.test",
    "https://name:secret@site.org",
    "https://site.org/path",
  ])
    expect(publicOrigin(url)).toBe("");
});
test("public pages get unique canonical metadata, but private and unknown routes cannot be indexed", () => {
  for (const route of Object.keys(publicPages)) {
    const m = metadata(route + "?utm_source=example", live);
    expect(m.indexable).toBe(true);
    expect(m.canonical).toBe(live.siteUrl + route);
    expect(m.jsonLd).not.toBeNull();
  }
  for (const route of [
    "/app/today",
    "/auth",
    "/programs",
    "/missing",
    "/guides/missing",
  ]) {
    const m = metadata(route, live);
    expect(m.indexable).toBe(false);
    expect(m.canonical).toBe("");
    expect(m.jsonLd).toBeNull();
  }
});
test("search bots can retrieve public launch content while separate training bots are excluded", () => {
  const r = robots(live);
  expect(r).toContain("User-agent: OAI-SearchBot\nAllow: /");
  expect(r).toContain("User-agent: Claude-SearchBot\nAllow: /");
  expect(r).toContain("User-agent: GPTBot\nDisallow: /");
  expect(r).toContain("Sitemap: https://admissions-demo.org/sitemap.xml");
  expect(
    safeJson({ text: "</script><script>alert(1)</script>" }),
  ).not.toContain("<");
});
