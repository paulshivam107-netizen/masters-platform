import { guides } from "../content/guides";
import { schools } from "../content/schools";
import { practice } from "../content/practice";
import * as defaults from "../content/site";
const publicPages = {
  "/": {
    title: "Practise MBA interviews with résumé-based questions",
    description:
      "Mock interviews for MBA, EMBA and MiM applicants: questions drawn from your résumé, follow-ups that quote your answers and a debrief to act on. Free during the pilot.",
    kind: "website",
  },
  "/guides": {
    title: "MBA interview and application guides, with free templates",
    description:
      "Interview story templates, résumé follow-up practice and application checklists, including a checklist for Indian MBA routes. Read and download without an account.",
    kind: "website",
  },
  "/privacy": {
    title: "Privacy: how your data is handled",
    description:
      "What MockMBA stores, how AI is used, who processes your data and how to export or delete your account.",
    kind: "website",
  },
  "/help": {
    title: "Getting started and help",
    description:
      "Set up your first application, save an essay and practise an interview answer. Learn what the MockMBA pilot saves and how to get help.",
    kind: "website",
  },
};
publicPages[practice.path] = {
  title: practice.title,
  description: practice.description,
  updated: practice.updated,
  kind: "website",
};
publicPages["/schools"] = {
  title: "School interview preparation guides",
  description:
    "Interview preparation pages for individual MBA schools: programmes, what each school says about its interview and where graduates go, with sources. Independent, not affiliated with any school.",
  kind: "website",
};
for (const school of schools)
  publicPages[`/schools/${school.slug}`] = {
    title: `${school.shortName} interview preparation: format, programmes and practice`,
    description: `${school.shortName} programmes, what the school says about its interview and where graduates go, with source links. Independent guide, not affiliated with ${school.shortName}.`,
    updated: school.checked,
    kind: "website",
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
    : path === "/auth/verify-email"
      ? "Verify your email"
      : path === "/auth/reset-password"
        ? "Choose a new password"
        : path === "/auth" || path.startsWith("/auth/")
          ? "Sign in or create an account"
          : path === "/programs"
            ? "Explore programmes"
            : "Page not found";
  const brand = config.siteName || "MockMBA";
  const pageTitle = page?.title || fallbackTitle;
  // Append the brand once; a title that already names it stays as written.
  const title = pageTitle.includes(brand) ? pageTitle : `${pageTitle} | ${brand}`;
  const description =
    page?.description ||
    "Manage your MBA applications, essay drafts and interview preparation.";
  const canonical = page && origin ? origin + path : "";
  const graph = [];
  if (page && origin) {
    const publisher = {
      "@type": "Organization",
      name: config.siteName || "MockMBA",
      url: origin,
    };
    graph.push({
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: config.siteName || "MockMBA",
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
        name: config.siteName || "MockMBA",
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
