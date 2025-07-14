import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/contexts/PreferencesContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DAT Analytics Platform - Digital Asset Treasury Intelligence",
  description: "Real-time analytics and insights for corporate digital asset treasuries. Track Bitcoin, Ethereum, and other crypto holdings of public companies.",
  keywords: ["crypto", "treasury", "bitcoin", "ethereum", "analytics", "corporate holdings"],
  authors: [{ name: "DAT Analytics" }],
  openGraph: {
    title: "DAT Analytics Platform",
    description: "Real-time digital asset treasury intelligence",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PreferencesProvider>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
