import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#030712",
};

export const metadata: Metadata = {
  title: "WorldTrue - Mapping Humanity's Collective Story",
  description: "Explore history through AI-powered research. Discover and map historical events across time and geography.",
  keywords: ["history", "historical events", "map", "AI", "research", "timeline", "world history"],
  authors: [{ name: "WorldTrue" }],
  openGraph: {
    title: "WorldTrue - Mapping Humanity's Collective Story",
    description: "Explore history through AI-powered research. Discover and map historical events across time and geography.",
    siteName: "WorldTrue",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorldTrue - Mapping Humanity's Collective Story",
    description: "Explore history through AI-powered research. Discover and map historical events across time and geography.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}