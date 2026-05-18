import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TG MDT",
  description: "A free, community-driven MDT developed by members of the Tubehosting Discord. Not affiliated with Tubehosting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
