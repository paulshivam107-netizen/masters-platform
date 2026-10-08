import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { metadata, safeJson } from "./metadata";

export default function Seo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const data = metadata(pathname);
    document.title = data.title;
    const setMeta = (key, value, property = false) => {
      const attribute = property ? "property" : "name";
      let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (!value) {
        tag?.remove();
        return;
      }
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.content = value;
    };
    setMeta("description", data.description);
    setMeta("robots", data.robots);
    for (const [key, value] of Object.entries({
      title: data.title,
      description: data.description,
      type: data.type,
      url: data.canonical,
      image: data.image,
    }))
      setMeta(`og:${key}`, value, true);
    setMeta("twitter:card", data.image ? "summary_large_image" : "summary");
    setMeta("twitter:title", data.title);
    setMeta("twitter:description", data.description);
    setMeta("twitter:image", data.image);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (data.canonical) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = data.canonical;
    } else canonical?.remove();
    document.getElementById("site-structured-data")?.remove();
    if (data.jsonLd) {
      const script = document.createElement("script");
      script.id = "site-structured-data";
      script.type = "application/ld+json";
      script.textContent = safeJson(data.jsonLd);
      document.head.appendChild(script);
    }
  }, [pathname]);
  return null;
}
