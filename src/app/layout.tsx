import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RedditPipe",
  description: "Reddit outreach automation tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
