import type { Metadata } from "next";
import { PwaProvider } from "@/components/providers/pwa-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DevOpsCrack — Interview Preparation Platform",
    template: "%s · DevOpsCrack",
  },
  description:
    "Master DevOps interviews with expert questions, practice modes, mock interviews, and performance analytics.",
  manifest: "/manifest.webmanifest",
  applicationName: "DevOpsCrack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DevOpsCrack",
  },
  formatDetection: { telephone: false },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
