/**
 * The public address of the site and where people can reach a person.
 * Both come from configuration, so moving to a new domain is a settings
 * change (APP_URL, SUPPORT_EMAIL) rather than a code change.
 */
export const SITE_URL = (process.env.APP_URL || "https://plateping.vercel.app").replace(/\/$/, "");
export const SITE_HOST = new URL(SITE_URL).host;
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || `support@${SITE_HOST.replace(/^www\./, "")}`;
