import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteChrome } from "@/components/SiteChrome";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — PlatePing",
};

// Rendered per request so the sign-in screen gets a one-time script nonce from src/proxy.ts.
export default async function LoginPage() {
  await connection();
  return (
    <SiteChrome>
      <Suspense fallback={<p className="site-wrap py-12 text-sm text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </SiteChrome>
  );
}
