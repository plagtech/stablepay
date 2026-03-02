import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/providers";

export const metadata: Metadata = {
  title: "StablePay — Get Paid. Stay Stable.",
  description:
    "The simplest way to pay your team in digital dollars. Multi-chain crypto payroll powered by Spraay Protocol.",
  metadataBase: new URL("https://stablepay.me"),
  openGraph: {
    title: "StablePay",
    description: "The simplest crypto payroll platform. Pay your global team in digital dollars.",
    url: "https://stablepay.me",
    siteName: "StablePay",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StablePay",
    description: "Get Paid. Stay Stable. Crypto payroll made simple.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050A12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-0 text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
