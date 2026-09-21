import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteChrome } from "@/components/SiteChrome";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account — PlatePing",
};

// Rendered per request so the form gets a one-time script nonce from src/proxy.ts.
export default async function RegisterPage() {
  await connection();
  return (
    <SiteChrome>
      <RegisterForm />
    </SiteChrome>
  );
}
