import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PwaProvider } from "@/components/PwaProvider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
