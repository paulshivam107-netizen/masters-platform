import { guides } from "../content/guides";
import * as defaults from "../content/site";
const publicPages = {
  "/": {
    title: "Indian MBA application tracker and interview preparation",
    description:
      "Organise CAT-route, GMAT-route and executive MBA applications, deadlines, essay drafts and interview preparation. Free during the Masters pilot.",
    kind: "website",
  },
  "/guides": {
    title: "Indian MBA application guides and free templates",
    description:
      "Practical application checklists and interview story templates for Indian MBA applicants. Read and download without an account.",
    kind: "website",
  },
  "/help": {
    title: "Getting started and help",
    description:
      "Set up your first application, save an essay and practise an interview answer. Learn what the Masters pilot saves and how to get help.",
    kind: "website",
  },
};
for (const guide of guides)
  publicPages[`/guides/${guide.slug}`] = { ...guide, kind: "article" };

function publicOrigin(value) {
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      u.search ||
      u.hash ||
      u.pathname !== "/"
    )
      return "";
    if (
      !u.hostname.includes(".") ||
      /(^localhost$|\.(localhost|local|test|invalid|example)$)/i.test(
        u.hostname,
      ) ||
      /^[\d.]+$/.test(u.hostname)
    )
      return "";
    return u.origin;
  } catch {
    return "";
  }
}
function metadata(pathname, config = defaults) {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const page = publicPages[path];
  const origin = publicOrigin(config.siteUrl);
  const indexable = Boolean(page && origin && config.allowIndexing);
  const fallbackTitle = path.startsWith("/app")
    ? "Your application workspace"
    : path === "/auth"
      ? "Sign in or create an account"
      : path === "/programs"
        ? "Explore programmes"
        : "Page not found";
  const title = `${page?.title || fallbackTitle} | ${config.siteName || "Masters"}`;
  const description =
    page?.description ||
    "Manage your MBA applications, essay drafts and interview preparation.";
  const canonical = page && origin ? origin + path : "";
  const graph = [];
  if (page && origin) {
    const publisher = {
      "@type": "Organization",
      name: config.siteName || "Masters",
      url: origin,
    };
    graph.push({
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: config.siteName || "Masters",
      url: origin,
    });
    graph.push({
      "@type": page.kind === "article" ? "Article" : "WebPage",
      name: page.title,
      headline: page.title,
      description,
      url: canonical,
      ...(page.kind === "article"
        ? { dateModified: page.updated, publisher }
        : {}),
      isPartOf: { "@id": `${origin}/#website` },
    });
    if (path === "/")
      graph.push({
        "@type": "SoftwareApplication",
        name: config.siteName || "Masters",
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web browser",
        url: origin,
        description,
      });
    if (page.kind === "article")
      graph.push({
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Guides",
            item: `${origin}/guides`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: page.title,
            item: canonical,
          },
        ],
      });
  }
  return {
    title,
    description,
    canonical,
    indexable,
    robots: indexable
      ? "index, follow, max-image-preview:large"
      : "noindex, follow",
    type: page?.kind === "article" ? "article" : "website",
    image: origin ? `${origin}/social-preview.png` : "",
    jsonLd: graph.length
      ? { "@context": "https://schema.org", "@graph": graph }
      : null,
  };
}
const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
function robots(config = defaults) {
  if (!config.allowIndexing || !publicOrigin(config.siteUrl))
    return "User-agent: *\nDisallow: /\n";
  // Search retrieval and foundation-model training are separate controls.
  return `User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nSitemap: ${publicOrigin(config.siteUrl)}/sitemap.xml\n`;
}
export { publicPages, publicOrigin, metadata, safeJson, robots };
