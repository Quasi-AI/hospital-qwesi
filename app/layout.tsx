import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ScrollReveal from "./components/scroll-reveal";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Qwesi Virtual Hospital - Find a doctor & book online",
  description:
    "Browse verified doctors, see their consultation fees up front, and pay to book a video, audio or chat appointment - from anywhere.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6949ED",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          <div className="qw-page min-h-screen">
            {children}
          </div>
          <ScrollReveal />
        </Providers>
      </body>
    </html>
  );
}
