import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ExperienceModeProvider } from "@/components/experience-mode-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/components/wallet-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RuleWallet — Give agents a budget. Keep the keys.",
    template: "%s · RuleWallet",
  },
  description:
    "Programmable spending controls for autonomous onchain agents: trusted recipients, hard limits, human approvals, emergency controls, and public receipts.",
  keywords: [
    "AI agents",
    "wallet policy",
    "onchain permissions",
    "Robinhood Chain",
    "agent payments",
    "recurring crypto payments",
    "autonomous agent wallet",
  ],
  openGraph: {
    title: "RuleWallet — Give agents a budget. Keep the keys.",
    description:
      "Programmable spending controls for autonomous agents, live on Robinhood Chain testnet.",
    type: "website",
    siteName: "RuleWallet",
  },
  twitter: {
    card: "summary_large_image",
    title: "RuleWallet — Give agents a budget. Keep the keys.",
    description:
      "Trusted recipients, hard limits, human approvals, emergency controls, and public receipts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ExperienceModeProvider>
          <WalletProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </WalletProvider>
        </ExperienceModeProvider>
      </body>
    </html>
  );
}
