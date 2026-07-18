import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    default: "RuleWallet — Policy controls for AI agents",
    template: "%s · RuleWallet",
  },
  description:
    "Live testnet policy controls for autonomous onchain agents. Verify limits, scheduled execution, and public receipts without real funds.",
  keywords: [
    "AI agents",
    "wallet policy",
    "onchain permissions",
    "Robinhood Chain",
    "agent payments",
  ],
  openGraph: {
    title: "RuleWallet — Agents act. Rules hold.",
    description: "A working autonomous testnet agent with onchain limits and public execution receipts.",
    type: "website",
    siteName: "RuleWallet",
  },
  twitter: {
    card: "summary_large_image",
    title: "RuleWallet — Agents act. Rules hold.",
    description: "A working autonomous testnet agent with onchain limits and public execution receipts.",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <WalletProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
