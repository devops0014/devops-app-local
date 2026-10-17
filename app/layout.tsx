import type { Metadata } from "next";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Free DevOps Interview Questions, Quizzes & Flashcards`,
    template: `%s · ${siteConfig.name}`,
  },
  description:
    "Prepare for DevOps interviews for free: Docker, Kubernetes, Terraform, AWS, Linux and CI/CD questions with answers, timed quizzes and flashcards.",
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
  openGraph: {
    title: `${siteConfig.name} — Free DevOps interview prep`,
    description: "Interview questions with answers, timed quizzes and flashcards for Docker, Kubernetes, Terraform, AWS, Linux and CI/CD. Free.",
    siteName: siteConfig.name,
    type: "website",
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
        <AnalyticsProvider />
      </body>
    </html>
  );
}
