const siteName = process.env.REACT_APP_SITE_NAME || "Masters";
const siteUrl = process.env.REACT_APP_SITE_URL || "";
const allowIndexing = process.env.REACT_APP_ALLOW_INDEXING === "true";
export { siteName, siteUrl, allowIndexing };
