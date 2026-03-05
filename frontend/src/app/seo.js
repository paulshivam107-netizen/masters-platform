import React from 'react';

const FALLBACK_SITE_URL = 'https://masters-platform.pages.dev';
const BRAND_NAME = 'Masters Platform';
const DEFAULT_TITLE = 'Plan applications, draft essays, and review faster';
const DEFAULT_DESCRIPTION = 'Plan applications, draft essays, and run AI review loops in one command center.';
const DEFAULT_IMAGE_PATH = '/seo/og-default.svg';

function normalizeSiteUrl(raw) {
  const value = (raw || '').trim();
  if (!value) return FALLBACK_SITE_URL;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace(/\/+$/, '');
  }
  return `https://${value.replace(/\/+$/, '')}`;
}

function getSiteUrl() {
  return normalizeSiteUrl(process.env.REACT_APP_SITE_URL || FALLBACK_SITE_URL);
}

function toAbsoluteUrl(path) {
  const siteUrl = getSiteUrl();
  const safePath = path && path.startsWith('/') ? path : '/';
  return new URL(safePath, `${siteUrl}/`).toString();
}

function setMeta(selector, content, attribute = 'name') {
  let node = document.head.querySelector(`meta[${attribute}="${selector}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, selector);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function setCanonical(href) {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', 'canonical');
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

function applyStructuredData(items = []) {
  const previous = document.head.querySelectorAll('script[data-seo-jsonld="true"]');
  previous.forEach((node) => node.remove());

  items.forEach((item) => {
    const node = document.createElement('script');
    node.type = 'application/ld+json';
    node.setAttribute('data-seo-jsonld', 'true');
    node.text = JSON.stringify(item);
    document.head.appendChild(node);
  });
}

export function applySeo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  robots = 'index,follow',
  ogType = 'website',
  imagePath = DEFAULT_IMAGE_PATH,
  structuredData = []
} = {}) {
  const canonicalUrl = toAbsoluteUrl(path);
  const absoluteImageUrl = toAbsoluteUrl(imagePath);
  const nextTitle = title ? `${title} | ${BRAND_NAME}` : BRAND_NAME;

  document.title = nextTitle;
  setCanonical(canonicalUrl);

  setMeta('description', description);
  setMeta('robots', robots);

  setMeta('og:site_name', BRAND_NAME, 'property');
  setMeta('og:type', ogType, 'property');
  setMeta('og:title', nextTitle, 'property');
  setMeta('og:description', description, 'property');
  setMeta('og:url', canonicalUrl, 'property');
  setMeta('og:image', absoluteImageUrl, 'property');

  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', nextTitle);
  setMeta('twitter:description', description);
  setMeta('twitter:image', absoluteImageUrl);

  applyStructuredData(structuredData);
}

export function useSeo(config) {
  const title = config?.title;
  const description = config?.description;
  const path = config?.path;
  const robots = config?.robots;
  const ogType = config?.ogType;
  const imagePath = config?.imagePath;
  const structuredData = React.useMemo(
    () => (Array.isArray(config?.structuredData) ? config.structuredData : []),
    [config?.structuredData]
  );

  React.useEffect(() => {
    applySeo({
      title,
      description,
      path,
      robots,
      ogType,
      imagePath,
      structuredData
    });
  }, [
    title,
    description,
    path,
    robots,
    ogType,
    imagePath,
    structuredData
  ]);
}

export function getSiteRootUrl() {
  return getSiteUrl();
}
