import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteChrome } from "@/components/SiteChrome";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join a fleet — PlatePing",
};

// Rendered per request so the form gets a one-time script nonce from src/proxy.ts.
export default async function JoinPage() {
  await connection();
  return (
    <SiteChrome>
      <JoinForm />
    </SiteChrome>
  );
}
