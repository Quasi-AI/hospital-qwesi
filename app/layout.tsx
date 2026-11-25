import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ScrollReveal from "./components/scroll-reveal";
import { headers } from "next/headers";
import MoneyProvider from "./components/MoneyProvider";
import { detectFromRequest } from "@/lib/ipTimeZone";
import { ratesFromEnv } from "@/lib/money";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Qwesi AI - Virtual care for the world",
  description:
    "Browse verified doctors, see their consultation fees up front, and pay to book a video, audio or chat appointment - from anywhere.",
  icons: {
    icon: [{ url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/favicon.ico" }],
    shortcut: "/favicon.ico",
    apple: "/brand/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6949ED",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Where the visitor is (from their IP address) decides cedis / naira / dollars for every price on the site.
  const { country } = detectFromRequest(await headers());
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} font-sans antialiased`} suppressHydrationWarning>
        <MoneyProvider country={country} rates={ratesFromEnv()}>
          <Providers>
            <div className="qw-page min-h-screen">
              {children}
            </div>
            <ScrollReveal />
          </Providers>
        </MoneyProvider>
      </body>
    </html>
  );
}
