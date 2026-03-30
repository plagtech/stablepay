import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/providers";

export const metadata: Metadata = {
  title: "StablePay — Crypto Payroll in 60 Seconds",
  description:
    "Pay your team in one transaction. Multi-chain crypto payroll on Base, Ethereum, Arbitrum, Polygon, and BNB. $0 gas on Base.",
  metadataBase: new URL("https://stablepay.me"),
  openGraph: {
    title: "StablePay — Crypto Payroll in 60 Seconds",
    description: "Pay your team in one transaction. Multi-chain crypto payroll. $0 gas on Base.",
    url: "https://stablepay.me",
    siteName: "StablePay",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StablePay — Crypto Payroll in 60 Seconds",
    description: "Pay your team in one transaction. $0 gas on Base.",
    images: ["/og-image.jpg"],
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
