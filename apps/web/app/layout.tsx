import type { Metadata, Viewport } from "next";

import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Orbit — Work in motion",
    template: "%s · Orbit",
  },
  description:
    "A realtime issue tracker that keeps teams, decisions, and delivery in the same orbit.",
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#f7f8fa", media: "(prefers-color-scheme: light)" },
    { color: "#17191c", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
