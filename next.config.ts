import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Sent with every response. The Content-Security-Policy is deliberately not in
// this list: prerendered pages get the relaxed policy below, while the signed-in
// app and the auth screens get a per-request nonce policy from src/proxy.ts.
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// Prerendered pages carry inline bootstrap scripts that cannot take a nonce, so
// they keep 'unsafe-inline'. None of these pages render user-supplied content.
const staticCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

// Every path except the ones src/proxy.ts covers with a nonce policy.
const STATIC_CSP_ROUTES = "/((?!app(?:[/]|$)|login$|register$|join$).*)";

const BRAND_ASSETS =
  "/(icon-192.png|icon-512.png|icon-maskable-192.png|icon-maskable-512.png|apple-touch-icon.png|badge-96.png|icon.svg|ecstassea-logo.svg|ecstassea-ai-icon.svg|zimbabwe-flag.svg)";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Keeps a tapped tab warm in the client router cache, so switching back and
    // forth on a phone does not hit the database again.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: baseSecurityHeaders,
      },
      {
        source: STATIC_CSP_ROUTES,
        headers: [{ key: "Content-Security-Policy", value: staticCsp }],
      },
      {
        // Per-person JSON must never sit in a shared or browser cache.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
      {
        // Home-screen icons and brand art. Served from the edge, not re-fetched
        // on every launch of the installed app.
        source: BRAND_ASSETS,
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
