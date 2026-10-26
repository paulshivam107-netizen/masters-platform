const siteName = process.env.REACT_APP_SITE_NAME || "MockMBA";
const siteUrl = process.env.REACT_APP_SITE_URL || "";
const allowIndexing = process.env.REACT_APP_ALLOW_INDEXING === "true";
// Forwarded by Cloudflare Email Routing to the owner.
const contactEmail = "hello@mockmba.com";
export { siteName, siteUrl, allowIndexing, contactEmail };
