import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldTrue - Mapping Humanity's Collective Story",
  description: "A collaborative platform for understanding our shared history through love, unity, and collective wisdom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}