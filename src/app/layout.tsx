import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PwaProvider } from "@/components/PwaProvider";
import { ReferralCapture } from "@/components/ReferralCapture";
import { WarmUp } from "@/components/WarmUp";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SHARE_TITLE = "PlatePing — is your car on a ZRP camera list?";
const SHARE_DESCRIPTION =
  "Check any Zimbabwe number plate against the lists ZRP publishes, free. Watch your cars and get told the day one is listed. We never take fine payments.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // What WhatsApp, Facebook and X show when someone shares a PlatePing link.
  openGraph: {
    type: "website",
    siteName: "PlatePing",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: "/",
    locale: "en_ZW",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PlatePing: is your car on a ZRP camera list?" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: ["/og.png"],
  },
  title: "PlatePing — know if your plate is on a ZRP camera list",
  description:
    "Check a Zimbabwe number plate against the lists ZRP publishes, watch your cars, and get told the same day one appears. A notification service only. We never take fine payments.",
  applicationName: "PlatePing",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PlatePing",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#07140e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-ink">
        <PwaProvider />
        <ReferralCapture />
        <WarmUp />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
