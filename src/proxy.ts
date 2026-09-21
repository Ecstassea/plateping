import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Endpoints that legitimately receive POSTs from other origins (Stripe, Smile&Pay, Vercel cron).
const PUBLIC_MUTATIONS = new Set(["/api/billing/webhook", "/api/billing/paynow/result", "/api/cron/sync"]);

function isPublicMutation(pathname: string) {
  if (PUBLIC_MUTATIONS.has(pathname)) {
    return true;
  }
  // Smile&Pay result URL — optionally includes a secret path segment.
  return (
    pathname === "/api/billing/smilepay/webhook" ||
    pathname.startsWith("/api/billing/smilepay/webhook/")
  );
}
const SESSION_COOKIES = ["__Host-plateping_session", "plateping_session"];
const SIGNED_IN = /^\/app(?:\/|$)/;
const isDev = process.env.NODE_ENV === "development";

function forbidden() {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

function isCrossSite(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return true;
  }
  // The browser sets this itself; a page on another site cannot forge it.
  return request.headers.get("sec-fetch-site") === "cross-site";
}

// A fresh nonce per page view. Next.js reads it from the request's CSP header and
// stamps it onto every script it emits, so inline scripts no longer need
// 'unsafe-inline' and an injected <script> would be refused by the browser.
function withNonce(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (mutating && !isPublicMutation(pathname) && isCrossSite(request)) {
      return forbidden();
    }
    return NextResponse.next();
  }

  // No session cookie at all means nothing in the signed-in area can render.
  // Bounce here, before a function and a database lookup are spent on it.
  if (SIGNED_IN.test(pathname) && !SESSION_COOKIES.some((name) => request.cookies.has(name))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return withNonce(request);
}

// Next.js reads this object statically at build time, so the entries are spelled
// out rather than shared through a variable. Prefetches only carry React Server
// Component payloads, never a document, so they skip the nonce work.
export const config = {
  matcher: [
    "/api/:path*",
    {
      source: "/app/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/login",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/register",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/join",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
